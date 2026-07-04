import { calculateDrawdowns, calculateSharpeRatio } from '@/lib/stats'
import { currencyFormatter, percentageFormatter } from '@/lib/format'

import type { DailyBar } from '@/lib/prices'
import type { InvalidationResult } from '@/lib/invalidation'
import type { TradeMetrics } from '@/lib/stats'

/**
 * Live-data invalidation tests from the Strategy Invalidation Playbook that
 * previously required OHLC import: benchmark comparison and alpha/beta
 * regression. Pure functions — bars come from the getDailyBars server fn.
 */

const dayStr = (d: Date) => d.toISOString().slice(0, 10)

/** Forward-fill the irregular per-trade equity curve onto the benchmark's daily grid. */
function alignDailyReturns(
  metrics: TradeMetrics,
  bars: DailyBar[]
): { strategy: number[]; benchmark: number[] } {
  const equityByDay = new Map<string, number>()
  metrics.dates.forEach((date, i) => {
    equityByDay.set(dayStr(date), metrics.equity[i])
  })

  const strategyEquity: number[] = []
  const benchmarkClose: number[] = []
  let lastEquity: number | null = null
  for (const bar of bars) {
    const eq = equityByDay.get(bar.date)
    if (eq !== undefined) lastEquity = eq
    if (lastEquity === null) continue // before the first trade
    strategyEquity.push(lastEquity)
    benchmarkClose.push(bar.close)
  }

  const returns = (series: number[]) =>
    series.slice(1).map((v, i) => (v - series[i]) / series[i])

  return { strategy: returns(strategyEquity), benchmark: returns(benchmarkClose) }
}

export function benchmarkComparison(
  metrics: TradeMetrics,
  bars: DailyBar[],
  symbol: string
): InvalidationResult {
  const base = {
    id: 'benchmark-comparison',
    name: `Benchmark comparison — ${symbol}`,
    requiredInputs: 'Strategy equity/trade dates plus benchmark daily bars.',
    whatItChecks:
      'Whether the strategy actually beats simply buying and holding the benchmark over the same dates.',
    metricsToCompare: 'Total return, max drawdown, Sharpe ratio vs buy-and-hold.',
    passCondition:
      'Strategy improves risk-adjusted return or drawdown versus the benchmark.',
    invalidateCondition:
      'Benchmark buy-and-hold beats the strategy on both return and risk.',
    howToRunIt: `Fetch ${symbol} daily closes across the strategy's date range and rebuild a buy-and-hold equity curve with the same starting equity.`,
  }

  if (bars.length < 10) {
    return {
      ...base,
      status: 'info',
      conclusion:
        'Not enough benchmark data returned — check the symbol and that Alpaca keys are configured on the server.',
      metrics: [{ label: 'Bars returned', value: String(bars.length) }],
    }
  }

  // buy-and-hold with the strategy's starting equity
  const startingEquity = metrics.startingEquity
  const units = startingEquity / bars[0].close
  const benchEquity = bars.map((b) => units * b.close)
  const benchDates = bars.map((b) => new Date(`${b.date}T00:00:00Z`))

  const stratReturnPct =
    (metrics.equity[metrics.equity.length - 1] - metrics.equity[0]) /
    metrics.equity[0]
  const benchReturnPct =
    (benchEquity[benchEquity.length - 1] - benchEquity[0]) / benchEquity[0]

  const stratMaxDd = Math.max(
    ...calculateDrawdowns(metrics.equity).map((d) => d.drawdownPercent)
  )
  const benchMaxDd = Math.max(
    ...calculateDrawdowns(benchEquity).map((d) => d.drawdownPercent)
  )

  let stratSharpe = NaN
  let benchSharpe = NaN
  try {
    stratSharpe = calculateSharpeRatio(metrics.equity, metrics.dates)
    benchSharpe = calculateSharpeRatio(benchEquity, benchDates)
  } catch {
    // insufficient data for one of the Sharpe computations — compare what we have
  }

  const betterReturn = stratReturnPct > benchReturnPct
  const betterDrawdown = stratMaxDd < benchMaxDd
  const betterSharpe =
    Number.isFinite(stratSharpe) && Number.isFinite(benchSharpe)
      ? stratSharpe > benchSharpe
      : betterReturn

  const status = betterSharpe || betterDrawdown ? 'pass' : betterReturn ? 'watch' : 'invalidate'

  return {
    ...base,
    status,
    conclusion:
      status === 'pass'
        ? `The strategy improves on ${symbol} buy-and-hold on a risk-adjusted basis over the same period.`
        : status === 'watch'
          ? `The strategy out-returns ${symbol} but with worse risk characteristics — the edge may just be leverage on market exposure.`
          : `Buying and holding ${symbol} beat this strategy on return and risk over the same dates. The strategy adds no measurable value.`,
    metrics: [
      {
        label: 'Total return (strategy / benchmark)',
        value: `${percentageFormatter.format(stratReturnPct)} / ${percentageFormatter.format(benchReturnPct)}`,
        tone: betterReturn ? 'pass' : 'watch',
      },
      {
        label: 'Max drawdown (strategy / benchmark)',
        value: `${percentageFormatter.format(stratMaxDd)} / ${percentageFormatter.format(benchMaxDd)}`,
        tone: betterDrawdown ? 'pass' : 'watch',
      },
      {
        label: 'Sharpe (strategy / benchmark)',
        value:
          Number.isFinite(stratSharpe) && Number.isFinite(benchSharpe)
            ? `${stratSharpe.toFixed(2)} / ${benchSharpe.toFixed(2)}`
            : 'n/a',
        tone: betterSharpe ? 'pass' : 'watch',
      },
      {
        label: 'Buy-and-hold final equity',
        value: currencyFormatter.format(benchEquity[benchEquity.length - 1]),
      },
    ],
  }
}

export function alphaBetaRegression(
  metrics: TradeMetrics,
  bars: DailyBar[],
  symbol: string
): InvalidationResult {
  const base = {
    id: 'alpha-beta-regression',
    name: `Alpha / beta vs ${symbol}`,
    requiredInputs: 'Strategy periodic returns and benchmark returns.',
    whatItChecks:
      'How much of the strategy return is just market exposure (beta) versus genuine excess return (alpha).',
    metricsToCompare: 'Alpha (annualized), beta, R² of the regression.',
    passCondition: 'Positive alpha after accounting for market exposure.',
    invalidateCondition:
      'Alpha is negative or ~zero and R² is high — returns are explained by market beta alone.',
    howToRunIt: `Forward-fill strategy equity onto ${symbol}'s daily grid and regress daily strategy returns on benchmark returns (OLS).`,
  }

  const { strategy, benchmark } = alignDailyReturns(metrics, bars)
  if (strategy.length < 20) {
    return {
      ...base,
      status: 'info',
      conclusion:
        'Fewer than 20 overlapping daily observations — not enough to regress. Check the symbol and Alpaca keys.',
      metrics: [{ label: 'Observations', value: String(strategy.length) }],
    }
  }

  const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length
  const meanS = mean(strategy)
  const meanB = mean(benchmark)
  let cov = 0
  let varB = 0
  let varS = 0
  for (let i = 0; i < strategy.length; i++) {
    cov += (strategy[i] - meanS) * (benchmark[i] - meanB)
    varB += (benchmark[i] - meanB) ** 2
    varS += (strategy[i] - meanS) ** 2
  }
  const beta = varB > 0 ? cov / varB : 0
  const alphaDaily = meanS - beta * meanB
  const alphaAnnual = alphaDaily * 252
  const r2 = varB > 0 && varS > 0 ? cov ** 2 / (varB * varS) : 0

  const status =
    alphaAnnual > 0.02
      ? 'pass'
      : alphaAnnual > -0.02
        ? 'watch'
        : r2 > 0.5
          ? 'invalidate'
          : 'watch'

  return {
    ...base,
    status,
    conclusion:
      status === 'pass'
        ? 'The strategy generates positive alpha beyond its market exposure.'
        : status === 'watch'
          ? 'Alpha is close to zero — most of the return profile is market exposure or noise. Treat claimed edge with suspicion.'
          : 'Negative alpha with high R²: the strategy is market beta in disguise, minus costs.',
    metrics: [
      {
        label: 'Alpha (annualized)',
        value: percentageFormatter.format(alphaAnnual),
        tone: alphaAnnual > 0.02 ? 'pass' : alphaAnnual > -0.02 ? 'watch' : 'invalidate',
      },
      { label: 'Beta', value: beta.toFixed(2) },
      { label: 'R²', value: r2.toFixed(2) },
      { label: 'Daily observations', value: String(strategy.length) },
    ],
  }
}
