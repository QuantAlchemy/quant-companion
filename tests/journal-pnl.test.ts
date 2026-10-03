import { describe, expect, it, vi } from 'vitest'

import { close, edit, split } from '../convex/trades'
import { netJournalPnl, parseTradeFile, serializeTrades } from '@/lib/journal'
import {
  journalTradesToPerformanceTrades,
  performanceTradesToTradeMetrics,
  summarizePerformance,
  tradingViewRecordsToPerformanceTrades,
} from '@/lib/performance'

import type { RegisteredMutation } from 'convex/server'
import type { Doc, Id } from '../convex/_generated/dataModel'
import type { MutationCtx } from '../convex/_generated/server'
import type { JournalTrade, NewTrade } from '@/lib/journal'
import type { TradeRecord } from '@/lib/stats'

// Run the registered handlers against isolated in-memory records, never a deployment.
function handler<TArgs extends Record<string, unknown>, TResult>(
  mutation: RegisteredMutation<'public', TArgs, TResult>,
) {
  return (
    mutation as typeof mutation & {
      _handler: (ctx: MutationCtx, args: TArgs) => TResult
    }
  )._handler
}

const entry: NewTrade = {
  assetName: 'TEST',
  assetType: 'traditional',
  quantity: 10,
  price: 100,
  tradeType: 'buy',
  tradeDate: '2026-09-01',
}
const exit = { closingPrice: 101, closingDate: '2026-09-02' }

function journal(overrides: Partial<Doc<'trades'>> = {}) {
  const tradeId = 'trade-1' as Id<'trades'>
  const records = new Map<Id<'trades'>, Doc<'trades'>>([
    [
      tradeId,
      {
        ...entry,
        _id: tradeId,
        _creationTime: 1,
        userId: 'owner',
        status: 'open',
        ...overrides,
      },
    ],
  ])
  const patch = vi.fn((id: Id<'trades'>, fields: Partial<Doc<'trades'>>) => {
    records.set(id, { ...records.get(id)!, ...fields })
  })
  const ctx = {
    auth: { getUserIdentity: async () => ({ tokenIdentifier: 'owner' }) },
    db: {
      get: async (id: Id<'trades'>) => records.get(id) ?? null,
      patch,
      insert: async (
        _table: 'trades',
        fields: Omit<Doc<'trades'>, '_id' | '_creationTime'>,
      ) => {
        const id = `trade-${records.size + 1}` as Id<'trades'>
        records.set(id, { ...fields, _id: id, _creationTime: records.size + 1 })
        return id
      },
    },
  } as unknown as MutationCtx
  const trades = (): JournalTrade[] =>
    Array.from(
      records.values(),
      ({ _id, _creationTime, userId: _owner, ...trade }) => ({
        ...trade,
        id: _id,
        createdAt: _creationTime,
      }),
    )
  return { ctx, tradeId, records, patch, trades }
}

describe('closed journal corrections', () => {
  it.each([
    [{ price: 102 }, -10],
    [{ quantity: 4 }, 4],
    [{ tradeType: 'sell' as const }, -10],
  ])(
    'recalculates gross and net performance after %j',
    async (correction, expected) => {
      const { ctx, tradeId, records, patch, trades } = journal({
        commission: 20,
      })
      await handler(close)(ctx, { tradeId, ...exit })
      expect(records.get(tradeId)?.realizedPnl).toBe(10)
      await handler(edit)(ctx, {
        ...entry,
        commission: 20,
        ...correction,
        tradeId,
      })
      expect(patch).toHaveBeenLastCalledWith(
        tradeId,
        expect.objectContaining({ ...correction, realizedPnl: expected }),
      )
      const performance = journalTradesToPerformanceTrades(trades())
      expect(summarizePerformance(performance).realizedPnl).toBe(expected - 20)
      expect(
        performanceTradesToTradeMetrics(performance, 1000)?.equity,
      ).toEqual([1000, 1000 + expected - 20])
    },
  )

  it('rejects an entry after the saved exit without writing, but permits the same date', async () => {
    const { ctx, tradeId, records, patch } = journal({
      status: 'closed',
      ...exit,
      realizedPnl: 10,
    })
    const before = records.get(tradeId)
    await expect(
      handler(edit)(ctx, {
        ...entry,
        tradeId,
        price: 102,
        tradeDate: '2026-09-03',
      }),
    ).rejects.toThrow('Trade date cannot be after')
    expect(patch).not.toHaveBeenCalled()
    expect(records.get(tradeId)).toEqual(before)
    await handler(edit)(ctx, { ...entry, tradeId, tradeDate: exit.closingDate })
    expect(records.get(tradeId)?.tradeDate).toBe(exit.closingDate)
  })

  it('preserves imported gross P&L for notes and commission-only edits', async () => {
    const { ctx, tradeId, records } = journal({
      status: 'closed',
      ...exit,
      realizedPnl: 75,
    })
    await handler(edit)(ctx, {
      ...entry,
      tradeId,
      comments: 'Corrected note',
      commission: 20,
    })
    expect(records.get(tradeId)).toMatchObject({
      realizedPnl: 75,
      comments: 'Corrected note',
      commission: 20,
    })
  })

  it('allows notes on incomplete historical trades but rejects calculation changes', async () => {
    const { ctx, tradeId, records, patch } = journal({
      status: 'closed',
      realizedPnl: 75,
    })
    await handler(edit)(ctx, {
      ...entry,
      tradeId,
      comments: 'Historical result',
    })
    patch.mockClear()
    await expect(
      handler(edit)(ctx, { ...entry, tradeId, quantity: 5 }),
    ).rejects.toThrow('without a closing price')
    expect(patch).not.toHaveBeenCalled()
    expect(records.get(tradeId)?.realizedPnl).toBe(75)
  })

  it('rejects non-finite recomputed P&L without changing the record', async () => {
    const { ctx, tradeId, patch } = journal({
      status: 'closed',
      ...exit,
      realizedPnl: 10,
    })
    await expect(
      handler(edit)(ctx, { ...entry, tradeId, price: Number.MAX_VALUE }),
    ).rejects.toThrow('Realized P&L must be finite')
    expect(patch).not.toHaveBeenCalled()
  })

  it('keeps edits scoped to the authenticated owner', async () => {
    const { ctx, tradeId, patch } = journal({
      userId: 'another-owner',
      status: 'closed',
      ...exit,
      realizedPnl: 10,
    })
    await expect(
      handler(edit)(ctx, { ...entry, tradeId, price: 102 }),
    ).rejects.toThrow('Not authorized')
    expect(patch).not.toHaveBeenCalled()
  })
})

describe('net journal performance', () => {
  it('counts a $10 gross gain with $20 commission as a $10 net loss', async () => {
    const { ctx, tradeId, trades } = journal({ commission: 20 })
    const result = await handler(close)(ctx, { tradeId, ...exit })
    expect(netJournalPnl(result.realizedPnl, result.commission)).toBe(-10)
    const performance = journalTradesToPerformanceTrades(trades())
    expect(summarizePerformance(performance)).toMatchObject({
      realizedPnl: -10,
      totalPnl: -10,
      winningTrades: 0,
      losingTrades: 1,
      winRate: 0,
      expectancy: -10,
    })
    expect(performanceTradesToTradeMetrics(performance, 1000)).toMatchObject({
      equity: [1000, 990],
      netProfit: [-10],
    })
    const exported = serializeTrades(trades())
    const imported = parseTradeFile(exported).map((trade, index) => ({
      ...trade,
      id: String(index),
      createdAt: 1,
    }))
    expect(imported[0]).toMatchObject({ realizedPnl: 10, commission: 20 })
    expect(
      summarizePerformance(journalTradesToPerformanceTrades(imported))
        .realizedPnl,
    ).toBe(-10)
  })

  it('allocates commission once across a partial close and the remaining position', async () => {
    const { ctx, tradeId, trades } = journal({ commission: 20 })
    const partial = await handler(split)(ctx, {
      tradeId,
      ...exit,
      closingQuantity: 4,
    })
    expect(netJournalPnl(partial.realizedPnl, partial.commission)).toBe(-4)
    expect(
      summarizePerformance(
        journalTradesToPerformanceTrades(trades(), { TEST: 101 }),
      ),
    ).toMatchObject({ realizedPnl: -4, unrealizedPnl: -6, totalPnl: -10 })
    const rest = await handler(close)(ctx, { tradeId, ...exit })
    expect(netJournalPnl(rest.realizedPnl, rest.commission)).toBe(-6)
    expect(
      trades().reduce((sum, trade) => sum + (trade.commission ?? 0), 0),
    ).toBe(20)
    const performance = journalTradesToPerformanceTrades(trades())
    expect(summarizePerformance(performance)).toMatchObject({
      realizedPnl: -10,
      winningTrades: 0,
      losingTrades: 2,
      expectancy: -5,
    })
    expect(
      performanceTradesToTradeMetrics(performance, 1000)?.equity.at(-1),
    ).toBe(990)
  })

  it.each([undefined, 0])(
    'preserves results with commission %s',
    async (commission) => {
      const { ctx, tradeId, trades } = journal({ commission })
      await handler(close)(ctx, { tradeId, ...exit })
      expect(
        summarizePerformance(journalTradesToPerformanceTrades(trades())),
      ).toMatchObject({ realizedPnl: 10, winningTrades: 1, expectancy: 10 })
    },
  )

  it('keeps open positions without quotes unknown', () => {
    const performance = journalTradesToPerformanceTrades(
      journal({ commission: 20 }).trades(),
    )
    expect(performance[0].unrealizedPnl).toBeUndefined()
    expect(summarizePerformance(performance).realizedPnl).toBe(0)
  })

  it('preserves TradingView already-net results', () => {
    const record: TradeRecord = {
      filename: 'strategy.csv',
      tradeNoOrig: 1,
      entryContracts: 10,
      entryCumProfit: 0,
      entryCumProfitPct: 0,
      entryDate: new Date('2026-09-01'),
      entryDrawdown: 0,
      entryDrawdownPct: 0,
      entryPrice: 100,
      entryProfit: 0,
      entryProfitPct: 0,
      entryRunUp: 0,
      entryRunUpPct: 0,
      entrySignal: '',
      entryType: 'Entry long',
      exitContracts: 10,
      exitCumProfit: -10,
      exitCumProfitPct: -1,
      exitDate: new Date('2026-09-02'),
      exitDrawdown: 0,
      exitDrawdownPct: 0,
      exitPrice: 101,
      exitProfit: -10,
      exitProfitPct: -1,
      exitRunUp: 0,
      exitRunUpPct: 0,
      exitSignal: '',
      exitType: 'Exit long',
    }
    expect(
      summarizePerformance(tradingViewRecordsToPerformanceTrades([record])),
    ).toMatchObject({ realizedPnl: -10, expectancy: -10, losingTrades: 1 })
  })
})
