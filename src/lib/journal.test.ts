import { describe, expect, it } from 'vitest'

import {
  parseTradeFile,
  prepareTradeImport,
  serializeTrades,
  tradeImportSourceId,
} from './journal'

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

describe('parseTradeFile', () => {
  it('parses a legacy JSON export and ignores unknown fields', () => {
    const trades = parseTradeFile(legacyExport)
    expect(trades).toHaveLength(2)
    expect(trades[0]).toMatchObject({
      assetName: 'BTC',
      status: 'closed',
      realizedPnl: 3075,
      closingPrice: 67400,
      commission: 12.5,
    })
    expect(trades[0]).not.toHaveProperty('marketPrice')
  })

  it('parses Convex snapshot JSONL and drops ownership fields', () => {
    const trades = parseTradeFile(convexJsonl)
    expect(trades).toHaveLength(2)
    expect(trades[1]).toMatchObject({
      assetName: 'SPY',
      tradeType: 'sell',
      status: 'closed',
      realizedPnl: -76,
    })
    expect(trades[1]).not.toHaveProperty('userId')
    expect(trades[1]).not.toHaveProperty('_id')
  })

  it('accepts a single JSONL trade document', () => {
    expect(parseTradeFile(convexJsonl.split('\n')[0])).toHaveLength(1)
  })

  it('backfills realized P&L when a closed trade omits it', () => {
    const [trade] = parseTradeFile(
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
      ]),
    )

    expect(trade.realizedPnl).toBe(150)
  })

  it('round-trips the public export shape', () => {
    const parsed = parseTradeFile(legacyExport)
    const exported = serializeTrades(
      parsed.map((trade, index) => ({
        ...trade,
        id: `trade-${index}`,
        createdAt: index,
      })),
    )
    expect(parseTradeFile(exported)).toEqual(parsed)
  })

  it.each([
    ['missing fields', JSON.stringify([{ assetName: 'BTC' }])],
    ['invalid JSON', 'not json at all'],
    [
      'negative quantity',
      JSON.stringify([
        {
          assetName: 'BTC',
          assetType: 'crypto',
          quantity: -1,
          price: 100,
          tradeType: 'buy',
          tradeDate: '2026-01-01',
        },
      ]),
    ],
    [
      'invalid enum',
      JSON.stringify([
        {
          assetName: 'BTC',
          assetType: 'forex',
          quantity: 1,
          price: 100,
          tradeType: 'buy',
          tradeDate: '2026-01-01',
        },
      ]),
    ],
    [
      'impossible date',
      JSON.stringify([
        {
          assetName: 'BTC',
          assetType: 'crypto',
          quantity: 1,
          price: 100,
          tradeType: 'buy',
          tradeDate: '2026-02-30',
        },
      ]),
    ],
    [
      'closing before entry',
      JSON.stringify([
        {
          assetName: 'BTC',
          assetType: 'crypto',
          quantity: 1,
          price: 100,
          tradeType: 'buy',
          tradeDate: '2026-02-01',
          status: 'closed',
          closingPrice: 110,
          closingDate: '2026-01-31',
        },
      ]),
    ],
  ])('rejects %s', (_label, input) => {
    expect(() => parseTradeFile(input)).toThrow()
  })
})

describe('tradeImportSourceId', () => {
  it('builds a stable key from normalized trade content', () => {
    const [trade] = parseTradeFile(legacyExport)
    expect(tradeImportSourceId(trade)).toMatch(/^import:[a-f0-9]{16}$/)
    expect(tradeImportSourceId(trade)).toBe(
      tradeImportSourceId(parseTradeFile(legacyExport)[0]),
    )
  })

  it('preserves identical trades with deterministic distinct source IDs', () => {
    const [trade] = parseTradeFile(legacyExport)
    const prepared = prepareTradeImport([trade, trade])
    expect(prepared[0].sourceId).toBe(tradeImportSourceId(trade))
    expect(prepared[1].sourceId).toBe(`${tradeImportSourceId(trade)}:1`)
    expect(prepareTradeImport([trade, trade])).toEqual(prepared)
  })
})
