import { describe, expect, it } from 'vitest'

import { calculateJournalUnrealizedPnl } from './performance'

import type { JournalTrade } from './journal'

const open: Omit<JournalTrade, 'id' | 'assetType' | 'price'> = {
  assetName: 'AMP',
  quantity: 10,
  tradeType: 'buy',
  tradeDate: '2026-11-01',
  status: 'open',
  createdAt: 1,
}

describe('calculateJournalUnrealizedPnl', () => {
  it('prices a stock and a coin with the same ticker separately', () => {
    const prices = { crypto: { AMP: 0.002 }, traditional: { AMP: 60 } }
    const stock = {
      ...open,
      id: 's',
      assetType: 'traditional',
      price: 50,
    } as const
    const coin = {
      ...open,
      id: 'c',
      assetType: 'crypto',
      price: 0.001,
    } as const

    expect(calculateJournalUnrealizedPnl(stock, prices)).toBe(100)
    expect(calculateJournalUnrealizedPnl(coin, prices)).toBeCloseTo(0.01)
  })
})
