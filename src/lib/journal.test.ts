import { beforeEach, describe, expect, it, vi } from 'vitest'

import { importTrades, journalStore, setJournalUser } from './journal'

// journal.ts only touches window.localStorage — a memory stub keeps this in node
const memoryStorage = () => {
  const store = new Map<string, string>()
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  }
}

vi.stubGlobal('window', { localStorage: memoryStorage() })

const legacyExport = JSON.stringify([
  {
    assetName: 'btc',
    assetType: 'crypto',
    quantity: 0.5,
    price: 61250,
    tradeType: 'buy',
    tradeDate: '2026-05-19',
    status: 'closed',
    closingPrice: 67400,
    closingDate: '2026-06-21',
    commission: 12.5,
    exchange: 'Coinbase',
    comments: 'Breakout trade',
    realizedPnl: 3075,
    // legacy-only fields that must be ignored
    unrealizedPnl: null,
    marketPrice: null,
  },
  {
    assetName: 'NVDA',
    assetType: 'traditional',
    quantity: 15,
    price: 118.4,
    tradeType: 'buy',
    tradeDate: '2026-06-09',
    status: 'open',
  },
])

// Convex dashboard snapshot export shape: one document per line
const convexJsonl = [
  JSON.stringify({
    _id: 'j5721abc',
    _creationTime: 1750000000000,
    userId: 'users:abc123',
    assetName: 'ETH',
    assetType: 'crypto',
    quantity: 4,
    price: 2980,
    tradeType: 'buy',
    tradeDate: '2026-05-26',
    status: 'open',
  }),
  JSON.stringify({
    _id: 'j5721def',
    _creationTime: 1750000001000,
    userId: 'users:abc123',
    assetName: 'SPY',
    assetType: 'traditional',
    quantity: 10,
    price: 545.2,
    tradeType: 'sell',
    tradeDate: '2026-06-15',
    status: 'closed',
    closingPrice: 552.8,
    closingDate: '2026-06-30',
    realizedPnl: -76,
  }),
].join('\n')

describe('importTrades', () => {
  beforeEach(() => {
    window.localStorage.clear()
    setJournalUser('test-user')
  })

  it('imports the legacy trading-journal JSON export', () => {
    expect(importTrades(legacyExport)).toBe(2)
    const trades = journalStore.state
    expect(trades).toHaveLength(2)
    const btc = trades.find((t) => t.assetName === 'BTC')
    expect(btc).toMatchObject({
      status: 'closed',
      realizedPnl: 3075,
      closingPrice: 67400,
      commission: 12.5,
    })
    expect(btc).not.toHaveProperty('marketPrice')
    expect(trades.find((t) => t.assetName === 'NVDA')?.status).toBe('open')
  })

  it('does not duplicate trades when the same legacy export is imported again', () => {
    expect(importTrades(legacyExport)).toBe(2)
    expect(importTrades(legacyExport)).toBe(0)
    expect(journalStore.state).toHaveLength(2)
  })

  it('imports a Convex snapshot JSONL export, dropping system fields', () => {
    expect(importTrades(convexJsonl)).toBe(2)
    const trades = journalStore.state
    expect(trades).toHaveLength(2)
    const spy = trades.find((t) => t.assetName === 'SPY')
    expect(spy).toMatchObject({
      tradeType: 'sell',
      status: 'closed',
      realizedPnl: -76,
    })
    expect(spy).not.toHaveProperty('userId')
    expect(spy?.id).toMatch(/^t_/)
  })

  it('backfills realized P&L for closed imports without a stored realizedPnl', () => {
    expect(
      importTrades(
        JSON.stringify([
          {
            assetName: 'AAPL',
            assetType: 'traditional',
            quantity: 10,
            price: 100,
            tradeType: 'buy',
            tradeDate: '2026-01-01',
            status: 'closed',
            closingPrice: 115,
            closingDate: '2026-02-01',
          },
          {
            assetName: 'TSLA',
            assetType: 'traditional',
            quantity: 5,
            price: 200,
            tradeType: 'sell',
            tradeDate: '2026-01-01',
            status: 'closed',
            closingPrice: 180,
            closingDate: '2026-02-01',
          },
        ])
      )
    ).toBe(2)

    expect(journalStore.state.find((t) => t.assetName === 'AAPL')?.realizedPnl).toBe(
      150
    )
    expect(journalStore.state.find((t) => t.assetName === 'TSLA')?.realizedPnl).toBe(
      100
    )
  })

  it('round-trips: importing our own export shape', () => {
    importTrades(legacyExport)
    const reExported = JSON.stringify(
      journalStore.state.map(({ id, createdAt, ...rest }) => rest)
    )
    setJournalUser('other-user')
    expect(journalStore.state).toHaveLength(0)
    expect(importTrades(reExported)).toBe(2)
  })

  it('rejects files missing required fields', () => {
    expect(() =>
      importTrades(JSON.stringify([{ assetName: 'BTC' }]))
    ).toThrow(/missing required fields/)
  })

  it('rejects non-JSON input', () => {
    expect(() => importTrades('not json at all')).toThrow()
  })
})
