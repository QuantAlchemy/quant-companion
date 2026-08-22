import { describe, expect, it } from 'vitest'

import { dailyBarsInput, marketPricesInput } from './prices'

describe('marketPricesInput', () => {
  it('accepts supported stock and crypto symbols', () => {
    expect(
      marketPricesInput.parse({
        crypto: ['BTC', 'BTC/USD', 'NEAR-PROTOCOL'],
        traditional: ['SPY', 'BRK.B'],
      }),
    ).toEqual({
      crypto: ['BTC', 'BTC/USD', 'NEAR-PROTOCOL'],
      traditional: ['SPY', 'BRK.B'],
    })
  })

  it('rejects malformed symbols and oversized batches', () => {
    expect(() =>
      marketPricesInput.parse({ crypto: ['BTC?redirect=x'], traditional: [] }),
    ).toThrow()
    expect(() =>
      marketPricesInput.parse({
        crypto: [],
        traditional: Array.from({ length: 26 }, (_, index) => `S${index}`),
      }),
    ).toThrow()
  })
})

describe('dailyBarsInput', () => {
  it('accepts a bounded date range', () => {
    expect(
      dailyBarsInput.parse({
        symbol: 'SPY',
        start: '2020-01-01',
        end: '2025-01-01',
      }),
    ).toEqual({ symbol: 'SPY', start: '2020-01-01', end: '2025-01-01' })
  })

  it('rejects inverted and excessive date ranges', () => {
    expect(() =>
      dailyBarsInput.parse({
        symbol: 'SPY',
        start: '2025-01-02',
        end: '2025-01-01',
      }),
    ).toThrow()
    expect(() =>
      dailyBarsInput.parse({
        symbol: 'SPY',
        start: '2010-01-01',
        end: '2025-01-01',
      }),
    ).toThrow()
  })
})
