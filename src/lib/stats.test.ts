import { describe, expect, it } from 'vitest'

import {
  calculateRealizedEquitySharpe,
  calculateSharpeRatio,
  calculateSummaryStats,
  calculateZScores,
  generateLinearProbabilityCones,
  generateProbabilityCones,
  processTradeMetrics,
} from '@/lib/stats'

const day = (offset: number) => new Date(Date.UTC(2026, 0, 1 + offset))
const equityFromReturns = (returns: number[]) =>
  returns.reduce(
    (values, value) => [...values, values[values.length - 1] * Math.exp(value)],
    [10000],
  )
const referenceReturns = [0.01, -0.005, 0.02, -0.01]

// Only the fields consumed by metric calculation are needed here.
const metricsFromReturns = (returns: number[]) => {
  const equity = equityFromReturns(returns)
  return processTradeMetrics(
    returns.map((_, i) => ({
      exitDate: day(i + 1),
      exitProfit: equity[i + 1] - equity[i],
    })),
    equity[0],
  )!
}

describe('daily realized-equity Sharpe', () => {
  it('annualizes daily log returns with sample volatility', () => {
    const equity = equityFromReturns(referenceReturns)
    expect(
      calculateSharpeRatio(
        equity,
        equity.map((_, i) => day(i)),
        0,
      ),
    ).toBeCloseTo(5.20507, 5)
  })

  it('converts the annual effective risk-free rate to daily log units', () => {
    const equity = equityFromReturns(referenceReturns)
    const avg = 0.00375
    const deviation = Math.sqrt(
      referenceReturns.reduce((sum, r) => sum + (r - avg) ** 2, 0) / 3,
    )
    const expected =
      ((avg - Math.log1p(0.02) / 365.25) / deviation) * Math.sqrt(365.25)
    expect(
      calculateSharpeRatio(
        equity,
        equity.map((_, i) => day(i)),
      ),
    ).toBeCloseTo(expected, 10)
  })

  it('combines same-day closes and is unchanged by splitting a closing trade', () => {
    const metrics = metricsFromReturns(referenceReturns)
    const trades = metrics.netProfit.flatMap((profit, i) => [
      { exitDate: day(i + 1), exitProfit: profit / 2 },
      { exitDate: day(i + 1), exitProfit: profit / 2 },
    ])
    const split = processTradeMetrics(trades, 10000)!
    expect(calculateRealizedEquitySharpe(split)).toBeCloseTo(
      calculateRealizedEquitySharpe(metrics)!,
      10,
    )
    expect(calculateSummaryStats(split).totalProfit).toBeCloseTo(
      calculateSummaryStats(metrics).totalProfit,
      10,
    )
    trades[1].exitDate = new Date(day(1).getTime() + 3600000)
    expect(
      calculateRealizedEquitySharpe(processTradeMetrics(trades, 10000)!),
    ).toBeCloseTo(calculateRealizedEquitySharpe(metrics)!, 10)
  })

  it('carries equity through calendar days without closes, including weekends', () => {
    const sparse = equityFromReturns([0.01, -0.005])
    const filled = equityFromReturns([0.01, 0, 0, -0.005])
    expect(
      calculateSharpeRatio(sparse, [day(1), day(2), day(5)], 0),
    ).toBeCloseTo(
      calculateSharpeRatio(
        filled,
        [day(1), day(2), day(3), day(4), day(5)],
        0,
      )!,
      10,
    )
  })

  it.each([
    { equity: [], dates: [] },
    { equity: [100], dates: [day(0)] },
    { equity: [100, 101], dates: [day(0), day(1)] },
    { equity: [100, 101, 102], dates: [day(0), day(0), day(0)] },
    { equity: [100, 100, 100], dates: [day(0), day(1), day(2)] },
    {
      equity: equityFromReturns([0.01, 0.01]),
      dates: [day(0), day(1), day(2)],
    },
    { equity: [100, 0, 101], dates: [day(0), day(1), day(2)] },
    { equity: [100, -1, 101], dates: [day(0), day(1), day(2)] },
  ])(
    'returns unavailable for insufficient history, zero variance or nonpositive equity: $equity',
    ({ equity, dates }) => {
      expect(calculateSharpeRatio(equity, dates)).toBeNull()
    },
  )
})

describe('small trade sets', () => {
  it('represents an empty selection without creating a date', () => {
    expect(processTradeMetrics([])).toBeNull()
  })

  it('keeps one-trade dates and statistics valid and omits unsupported cones', () => {
    const metrics = metricsFromReturns([0.01])
    expect(metrics.dates).toEqual([day(0), day(1)])
    expect(metrics.zScores).toEqual([0])
    const summary = calculateSummaryStats(metrics)
    expect(summary.sharpeRatio).toBeNull()
    expect(summary.mar).toBeNull()
    expect(summary.netProfitByAvgDrawdown).toBeNull()
    expect(summary.averageProfitLoss).toBeNull()
    expect(summary.medianProfitLoss).toBeNull()
    expect(
      Object.values(summary).every(
        (value) => value === null || Number.isFinite(value),
      ),
    ).toBe(true)
    for (const generate of [
      generateProbabilityCones,
      generateLinearProbabilityCones,
    ]) {
      expect(generate(metrics, 2, 30, 0.02)).toEqual({
        futureDates: [],
        upperCone: [],
        lowerCone: [],
      })
    }
  })

  it('retains total P&L when all trades close at the same timestamp', () => {
    const metrics = processTradeMetrics(
      [100, -40, 20].map((exitProfit) => ({ exitDate: day(1), exitProfit })),
      10000,
    )!
    expect(metrics.dates.every((date) => Number.isFinite(date.getTime()))).toBe(
      true,
    )
    expect(calculateSummaryStats(metrics)).toMatchObject({
      totalTrades: 3,
      totalProfit: 80,
      sharpeRatio: null,
    })
  })

  it('preserves ordinary summary statistics', () => {
    const metrics = processTradeMetrics(
      [100, -50, 200, -100].map((exitProfit, i) => ({
        exitDate: day(i + 1),
        exitProfit,
      })),
      10000,
    )!
    expect(calculateSummaryStats(metrics)).toMatchObject({
      totalTrades: 4,
      winningTradesCnt: 2,
      losingTradesCnt: 2,
      winRate: 0.5,
      totalProfit: 150,
      averageProfit: 37.5,
      averageProfitWin: 150,
      averageProfitLoss: -75,
      medianProfit: 25,
      medianProfitWin: 150,
      medianProfitLoss: -75,
      maxProfit: 200,
      minProfit: -100,
      maxDrawdown: 100,
      netProfitByAvgDrawdown: 5,
    })
    expect(calculateZScores([5, 5])).toEqual([0, 0])
  })
})
