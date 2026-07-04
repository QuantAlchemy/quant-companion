import { calculateDrawdowns } from '@/lib/stats'

import type { TradeMetrics, TradeRecord } from '@/lib/stats'

export type InvalidationStatus = 'pass' | 'watch' | 'invalidate' | 'info'

export interface InvalidationConfig {
  trials: number
  feePerTrade: number
  rollingWindow: number
}

export interface InvalidationMetric {
  label: string
  value: string
  tone?: InvalidationStatus
}

export interface InvalidationResult {
  id: string
  name: string
  status: InvalidationStatus
  requiredInputs: string
  whatItChecks: string
  metricsToCompare: string
  passCondition: string
  invalidateCondition: string
  howToRunIt: string
  conclusion: string
  metrics: InvalidationMetric[]
}

export interface InvalidationReport {
  summary: {
    totalTests: number
    passCount: number
    watchCount: number
    invalidateCount: number
    infoCount: number
  }
  results: InvalidationResult[]
}

interface DistributionStats {
  terminalProfits: number[]
  maxDrawdowns: number[]
  maxDrawdownPercents: number[]
}

const DEFAULT_CONFIG: InvalidationConfig = {
  trials: 500,
  feePerTrade: 2.5,
  rollingWindow: 20,
}

const makeSeededRandom = (seed: number) => {
  let state = seed >>> 0

  return () => {
    state = (1664525 * state + 1013904223) >>> 0
    return state / 4294967296
  }
}

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
})

const currencyFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  maximumFractionDigits: 2,
  style: 'currency',
})

const percentFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
  style: 'percent',
})

const formatCurrency = (value: number) => currencyFormatter.format(value || 0)
const formatNumber = (value: number) => numberFormatter.format(value || 0)
const formatPercent = (value: number) => percentFormatter.format(Number.isFinite(value) ? value : 0)

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)

const quantile = (values: number[], q: number) => {
  if (values.length === 0) return 0

  const sorted = [...values].sort((a, b) => a - b)
  const position = (sorted.length - 1) * q
  const base = Math.floor(position)
  const rest = position - base
  const next = sorted[base + 1]

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- index access may be undefined
  if (next === undefined) return sorted[base]

  return sorted[base] + rest * (next - sorted[base])
}

const percentileRank = (values: number[], value: number) => {
  if (values.length === 0) return 0

  return values.filter((candidate) => candidate <= value).length / values.length
}

const buildEquity = (profits: number[], startingEquity: number) => {
  const equity = [startingEquity]

  profits.forEach((profit) => {
    equity.push(equity[equity.length - 1] + profit)
  })

  return equity
}

const maxDrawdown = (profits: number[], startingEquity: number) => {
  const drawdowns = calculateDrawdowns(buildEquity(profits, startingEquity))
  const max = Math.max(0, ...drawdowns.map((drawdown) => drawdown.drawdownValue))
  const maxPercent = Math.max(0, ...drawdowns.map((drawdown) => drawdown.drawdownPercent))

  return { max, maxPercent }
}

const shuffle = (values: number[], random: () => number) => {
  const shuffled = [...values]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = shuffled[index]
    shuffled[index] = shuffled[swapIndex]
    shuffled[swapIndex] = current
  }

  return shuffled
}

const sampleWithReplacement = (values: number[], random: () => number) => {
  return values.map(() => values[Math.floor(random() * values.length)])
}

const randomizeSigns = (values: number[], random: () => number) => {
  return values.map((value) => Math.abs(value) * (random() >= 0.5 ? 1 : -1))
}

const runDistribution = (
  profits: number[],
  startingEquity: number,
  trials: number,
  transform: (profits: number[], random: () => number) => number[],
  seed: number
): DistributionStats => {
  const terminalProfits: number[] = []
  const maxDrawdowns: number[] = []
  const maxDrawdownPercents: number[] = []
  const random = makeSeededRandom(seed)

  for (let trial = 0; trial < trials; trial += 1) {
    const trialProfits = transform(profits, random)
    const drawdown = maxDrawdown(trialProfits, startingEquity)

    terminalProfits.push(sum(trialProfits))
    maxDrawdowns.push(drawdown.max)
    maxDrawdownPercents.push(drawdown.maxPercent)
  }

  return { terminalProfits, maxDrawdowns, maxDrawdownPercents }
}

const statusTone = (status: InvalidationStatus): InvalidationStatus => status

const makeResult = (result: InvalidationResult): InvalidationResult => result

const summarize = (results: InvalidationResult[]) => ({
  totalTests: results.length,
  passCount: results.filter((result) => result.status === 'pass').length,
  watchCount: results.filter((result) => result.status === 'watch').length,
  invalidateCount: results.filter((result) => result.status === 'invalidate').length,
  infoCount: results.filter((result) => result.status === 'info').length,
})

const byYear = (trades: TradeRecord[]) => {
  return trades.reduce<Record<string, number[]>>((groups, trade) => {
    const year = trade.exitDate.getFullYear().toString()
    groups[year] = groups[year] ?? []
    groups[year].push(trade.exitProfit)
    return groups
  }, {})
}

const byFilename = (trades: TradeRecord[]) => {
  return trades.reduce<Record<string, number[]>>((groups, trade) => {
    groups[trade.filename] = groups[trade.filename] ?? []
    groups[trade.filename].push(trade.exitProfit)
    return groups
  }, {})
}

const rollingSums = (values: number[], window: number) => {
  if (window <= 0 || values.length < window) return []

  const windows: number[] = []

  for (let index = 0; index <= values.length - window; index += 1) {
    windows.push(sum(values.slice(index, index + window)))
  }

  return windows
}

export const calculateInvalidationReport = (
  trades: TradeRecord[] | null,
  metrics: TradeMetrics | null,
  config: Partial<InvalidationConfig> = {}
): InvalidationReport => {
  const resolvedConfig = { ...DEFAULT_CONFIG, ...config }
  const profits = metrics?.netProfit ?? []
  const startingEquity = metrics?.startingEquity ?? 10000
  const totalProfit = sum(profits)
  const tradeCount = profits.length
  const trials = Math.max(50, Math.floor(resolvedConfig.trials))
  const baselineDrawdown = maxDrawdown(profits, startingEquity)

  if (!metrics || tradeCount === 0) {
    const results = [
      makeResult({
        id: 'baseline-freeze',
        name: 'Baseline freeze',
        status: 'info',
        requiredInputs: 'TradingView List of Trades export',
        whatItChecks:
          'Whether Quant Companion has an imported, reproducible trade list before attacking the strategy.',
        howToRunIt:
          'Upload a TradingView CSV/XLSX export, set starting equity, and confirm the baseline dashboard populates.',
        metricsToCompare: 'Trade count, net profit, win rate, max drawdown, MAR, Sharpe ratio.',
        passCondition: 'A non-empty export produces stable baseline metrics.',
        invalidateCondition: 'The same export cannot reproduce the same baseline statistics.',
        conclusion: 'Upload a TradingView Strategy Tester export to run v1 invalidations.',
        metrics: [{ label: 'Trades loaded', value: '0', tone: 'info' }],
      }),
    ]

    return { results, summary: summarize(results) }
  }

  const shuffleDistribution = runDistribution(profits, startingEquity, trials, shuffle, 1337)
  const bootstrapDistribution = runDistribution(
    profits,
    startingEquity,
    trials,
    sampleWithReplacement,
    7331
  )
  const signFlipDistribution = runDistribution(
    profits,
    startingEquity,
    trials,
    randomizeSigns,
    4242
  )

  const drawdownPercentile = percentileRank(shuffleDistribution.maxDrawdowns, baselineDrawdown.max)
  const probabilityOfLoss =
    bootstrapDistribution.terminalProfits.filter((profit) => profit < 0).length / trials
  const bootstrapP05 = quantile(bootstrapDistribution.terminalProfits, 0.05)
  const bootstrapP50 = quantile(bootstrapDistribution.terminalProfits, 0.5)
  const signFlipPValue =
    (1 + signFlipDistribution.terminalProfits.filter((profit) => profit >= totalProfit).length) /
    (trials + 1)
  const signFlipPercentile = percentileRank(signFlipDistribution.terminalProfits, totalProfit)

  const sortedWinningProfits = profits.filter((profit) => profit > 0).sort((a, b) => b - a)
  const topOneProfit = sortedWinningProfits[0] ?? 0
  const topFiveCount = Math.min(5, sortedWinningProfits.length)
  const topTenPercentCount = Math.max(1, Math.ceil(sortedWinningProfits.length * 0.1))
  const topFiveProfit = sum(sortedWinningProfits.slice(0, topFiveCount))
  const topTenPercentProfit = sum(sortedWinningProfits.slice(0, topTenPercentCount))
  const topOneContribution = totalProfit > 0 ? topOneProfit / totalProfit : 0
  const profitAfterTopFive = totalProfit - topFiveProfit
  const profitAfterTopTenPercent = totalProfit - topTenPercentProfit

  const feeAdjustedTotal = totalProfit - tradeCount * resolvedConfig.feePerTrade
  const feeAdjustedExpectancy = feeAdjustedTotal / tradeCount

  const yearlyGroups = trades ? byYear(trades) : {}
  const yearlyProfits = Object.entries(yearlyGroups).map(([period, values]) => ({
    period,
    profit: sum(values),
    trades: values.length,
  }))
  const profitableYears = yearlyProfits.filter((period) => period.profit > 0).length
  const positiveYearRatio = yearlyProfits.length > 0 ? profitableYears / yearlyProfits.length : 0
  const largestYearProfit =
    yearlyProfits.length > 0 ? Math.max(...yearlyProfits.map((period) => period.profit)) : 0
  const largestYearContribution = totalProfit > 0 ? largestYearProfit / totalProfit : 0

  const fileGroups = trades ? byFilename(trades) : {}
  const fileSummaries = Object.entries(fileGroups).map(([filename, values]) => ({
    filename,
    profit: sum(values),
    trades: values.length,
  }))
  const positiveFiles = fileSummaries.filter((file) => file.profit > 0).length
  const positiveFileRatio = fileSummaries.length > 0 ? positiveFiles / fileSummaries.length : 0

  const rollingWindow = Math.min(Math.max(5, Math.floor(resolvedConfig.rollingWindow)), tradeCount)
  const windows = rollingSums(profits, rollingWindow)
  const negativeWindowRatio =
    windows.length > 0
      ? windows.filter((windowProfit) => windowProfit < 0).length / windows.length
      : 0
  const worstWindow = windows.length > 0 ? Math.min(...windows) : 0
  const bestWindow = windows.length > 0 ? Math.max(...windows) : 0

  const results = [
    makeResult({
      id: 'baseline-freeze',
      name: 'Baseline freeze',
      status:
        Number.isFinite(totalProfit) && Number.isFinite(baselineDrawdown.max)
          ? 'pass'
          : 'invalidate',
      requiredInputs: 'TradingView List of Trades export',
      whatItChecks:
        'The imported result set can be reproduced before any randomization or stress test is trusted.',
      howToRunIt:
        'Upload the original TradingView export and freeze starting equity, market, timeframe, date range, fees, and strategy settings in the playbook notes.',
      metricsToCompare:
        'Trade count, net profit, max drawdown, expectancy, win rate, Sharpe/MAR from the baseline dashboard.',
      passCondition: 'The same export produces stable baseline metrics in Quant Companion.',
      invalidateCondition: 'The export cannot be reproduced or core fields are missing/unstable.',
      conclusion: 'Baseline is available for v1 invalidation tests.',
      metrics: [
        { label: 'Trades', value: formatNumber(tradeCount), tone: 'pass' },
        {
          label: 'Net profit',
          value: formatCurrency(totalProfit),
          tone: totalProfit > 0 ? 'pass' : 'invalidate',
        },
        { label: 'Max drawdown', value: formatCurrency(baselineDrawdown.max), tone: 'info' },
      ],
    }),
    makeResult({
      id: 'trade-count-sanity',
      name: 'Trade count sanity',
      status: tradeCount >= 100 ? 'pass' : tradeCount >= 30 ? 'watch' : 'invalidate',
      requiredInputs: 'TradingView List of Trades export',
      whatItChecks:
        'Whether the strategy has enough realized observations to make statistical claims less fragile.',
      howToRunIt:
        'Count completed trades after import. Treat 30 trades as a bare minimum and 100+ as a healthier first threshold.',
      metricsToCompare: 'Total trades, wins/losses, average trade, median trade, time coverage.',
      passCondition: '100+ trades across a meaningful date range.',
      invalidateCondition: 'Fewer than 30 trades, or results are clearly a tiny-sample story.',
      conclusion:
        tradeCount >= 100
          ? 'Trade count is strong enough for first-pass v1 tests.'
          : tradeCount >= 30
            ? 'Trade count is usable, but conclusions should stay tentative.'
            : 'Too few trades for reliable validation.',
      metrics: [
        {
          label: 'Completed trades',
          value: formatNumber(tradeCount),
          tone: statusTone(tradeCount >= 100 ? 'pass' : tradeCount >= 30 ? 'watch' : 'invalidate'),
        },
      ],
    }),
    makeResult({
      id: 'trade-order-shuffle',
      name: 'Trade-order shuffle',
      status:
        drawdownPercentile < 0.5 ? 'pass' : drawdownPercentile < 0.75 ? 'watch' : 'invalidate',
      requiredInputs: 'TradingView List of Trades export',
      whatItChecks:
        'Whether the realized trade sequence is unusually fragile versus the same trades in random order.',
      howToRunIt: `Shuffle realized trade profits ${trials} times, rebuild equity curves, and compare baseline drawdown to the shuffled drawdown distribution.`,
      metricsToCompare:
        'Baseline max drawdown percentile, median shuffled drawdown, 95th percentile shuffled drawdown.',
      passCondition: 'Baseline drawdown is better than the median shuffled path.',
      invalidateCondition: 'Baseline drawdown is in the worst quartile of shuffled paths.',
      conclusion:
        drawdownPercentile < 0.5
          ? 'Original trade order is smoother than the median shuffled path.'
          : drawdownPercentile < 0.75
            ? 'Original sequence risk is ordinary; watch drawdown assumptions.'
            : 'Original trade order lands in the fragile tail of shuffled paths.',
      metrics: [
        {
          label: 'Baseline DD percentile',
          value: formatPercent(drawdownPercentile),
          tone: statusTone(
            drawdownPercentile < 0.5 ? 'pass' : drawdownPercentile < 0.75 ? 'watch' : 'invalidate'
          ),
        },
        {
          label: 'Median shuffled DD',
          value: formatCurrency(quantile(shuffleDistribution.maxDrawdowns, 0.5)),
          tone: 'info',
        },
        {
          label: '95% shuffled DD',
          value: formatCurrency(quantile(shuffleDistribution.maxDrawdowns, 0.95)),
          tone: 'info',
        },
      ],
    }),
    makeResult({
      id: 'trade-bootstrap',
      name: 'Trade bootstrap',
      status:
        probabilityOfLoss <= 0.05 ? 'pass' : probabilityOfLoss <= 0.2 ? 'watch' : 'invalidate',
      requiredInputs: 'TradingView List of Trades export',
      whatItChecks: 'Whether the observed trade distribution survives resampling with replacement.',
      howToRunIt: `Bootstrap ${tradeCount}-trade sequences ${trials} times from the observed trades and compare terminal profit distribution.`,
      metricsToCompare:
        'Probability of loss, 5th percentile terminal profit, median terminal profit.',
      passCondition:
        'Probability of loss is 5% or lower and the 5th percentile remains acceptable.',
      invalidateCondition:
        'A large share of bootstraps are negative or unacceptable under the user’s risk tolerance.',
      conclusion:
        probabilityOfLoss <= 0.05
          ? 'Bootstrapped loss risk is low.'
          : probabilityOfLoss <= 0.2
            ? 'Bootstrap distribution has meaningful left-tail risk.'
            : 'Bootstrap distribution often loses money.',
      metrics: [
        {
          label: 'Loss probability',
          value: formatPercent(probabilityOfLoss),
          tone: statusTone(
            probabilityOfLoss <= 0.05 ? 'pass' : probabilityOfLoss <= 0.2 ? 'watch' : 'invalidate'
          ),
        },
        {
          label: '5% terminal profit',
          value: formatCurrency(bootstrapP05),
          tone: bootstrapP05 > 0 ? 'pass' : 'invalidate',
        },
        {
          label: 'Median terminal profit',
          value: formatCurrency(bootstrapP50),
          tone: bootstrapP50 > 0 ? 'pass' : 'invalidate',
        },
      ],
    }),
    makeResult({
      id: 'sign-flip-expectancy',
      name: 'Sign-flip expectancy',
      status: signFlipPValue <= 0.05 ? 'pass' : signFlipPValue <= 0.2 ? 'watch' : 'invalidate',
      requiredInputs: 'TradingView List of Trades export',
      whatItChecks:
        'Whether realized direction/win labels beat a null where trade magnitudes are preserved but signs are random.',
      howToRunIt: `Randomly flip each trade P/L sign ${trials} times while preserving absolute trade sizes.`,
      metricsToCompare:
        'Empirical p-value, original total profit percentile versus random sign assignments.',
      passCondition:
        'Original profit is a strong right-tail outlier versus random sign assignment.',
      invalidateCondition: 'Original expectancy is ordinary under random signs.',
      conclusion:
        signFlipPValue <= 0.05
          ? 'Original signs are a statistically meaningful outlier against random direction.'
          : signFlipPValue <= 0.2
            ? 'Original signs are better than average, but not a clean outlier.'
            : 'Random sign assignment can too often match the result.',
      metrics: [
        {
          label: 'Empirical p-value',
          value: formatNumber(signFlipPValue),
          tone: statusTone(
            signFlipPValue <= 0.05 ? 'pass' : signFlipPValue <= 0.2 ? 'watch' : 'invalidate'
          ),
        },
        {
          label: 'Profit percentile',
          value: formatPercent(signFlipPercentile),
          tone: statusTone(
            signFlipPValue <= 0.05 ? 'pass' : signFlipPValue <= 0.2 ? 'watch' : 'invalidate'
          ),
        },
      ],
    }),
    makeResult({
      id: 'outlier-dependency',
      name: 'Remove best trades / outlier dependency',
      status:
        profitAfterTopTenPercent > 0 && topOneContribution <= 0.25
          ? 'pass'
          : profitAfterTopTenPercent > 0 && topOneContribution <= 0.5
            ? 'watch'
            : 'invalidate',
      requiredInputs: 'TradingView List of Trades export',
      whatItChecks: 'Whether one or a few lucky trades carry the entire backtest.',
      howToRunIt:
        'Remove the top 1 winner, top 5 winners, and top 10% of winners, then recompute remaining net profit.',
      metricsToCompare:
        'Top trade contribution, profit after top 5 winners removed, profit after top 10% winners removed.',
      passCondition:
        'The strategy remains profitable after removing the top 10% of winning trades.',
      invalidateCondition:
        'One trade dominates, or removing the top winners turns the strategy negative.',
      conclusion:
        profitAfterTopTenPercent > 0 && topOneContribution <= 0.25
          ? 'Profit is not overly dependent on the largest winner.'
          : profitAfterTopTenPercent > 0 && topOneContribution <= 0.5
            ? 'Some outlier dependency exists; inspect the biggest winners.'
            : 'The strategy is too dependent on top winners.',
      metrics: [
        {
          label: 'Top trade contribution',
          value: formatPercent(topOneContribution),
          tone: statusTone(
            topOneContribution <= 0.25 ? 'pass' : topOneContribution <= 0.5 ? 'watch' : 'invalidate'
          ),
        },
        {
          label: `After top ${topFiveCount} winners`,
          value: formatCurrency(profitAfterTopFive),
          tone: profitAfterTopFive > 0 ? 'pass' : 'invalidate',
        },
        {
          label: 'After top 10% winners',
          value: formatCurrency(profitAfterTopTenPercent),
          tone: profitAfterTopTenPercent > 0 ? 'pass' : 'invalidate',
        },
      ],
    }),
    makeResult({
      id: 'fee-haircut',
      name: 'Fee haircut',
      status:
        feeAdjustedTotal > totalProfit * 0.5
          ? 'pass'
          : feeAdjustedTotal > 0
            ? 'watch'
            : 'invalidate',
      requiredInputs:
        'TradingView List of Trades export plus assumed fixed fee per completed trade',
      whatItChecks:
        'Whether the strategy survives realistic friction instead of relying on perfect/no-cost fills.',
      howToRunIt: `Subtract ${formatCurrency(resolvedConfig.feePerTrade)} from every completed trade and recompute total profit and expectancy.`,
      metricsToCompare: 'Original net profit, fee-adjusted net profit, fee-adjusted expectancy.',
      passCondition: 'Fee-adjusted profit remains comfortably positive.',
      invalidateCondition: 'Realistic per-trade costs erase expectancy.',
      conclusion:
        feeAdjustedTotal > totalProfit * 0.5
          ? 'Fixed fee haircut leaves most of the edge intact.'
          : feeAdjustedTotal > 0
            ? 'Fees matter; strategy survives but margin is thinner.'
            : 'The assumed fee haircut erases the edge.',
      metrics: [
        { label: 'Fee/trade', value: formatCurrency(resolvedConfig.feePerTrade), tone: 'info' },
        {
          label: 'Adjusted net profit',
          value: formatCurrency(feeAdjustedTotal),
          tone: statusTone(
            feeAdjustedTotal > totalProfit * 0.5
              ? 'pass'
              : feeAdjustedTotal > 0
                ? 'watch'
                : 'invalidate'
          ),
        },
        {
          label: 'Adjusted expectancy',
          value: formatCurrency(feeAdjustedExpectancy),
          tone: feeAdjustedExpectancy > 0 ? 'pass' : 'invalidate',
        },
      ],
    }),
    makeResult({
      id: 'subperiod-stability',
      name: 'Subperiod stability',
      status:
        yearlyProfits.length < 2
          ? 'info'
          : positiveYearRatio >= 0.67 && largestYearContribution <= 0.7
            ? 'pass'
            : positiveYearRatio >= 0.5 && largestYearContribution <= 0.85
              ? 'watch'
              : 'invalidate',
      requiredInputs: 'TradingView List of Trades export with exit dates',
      whatItChecks:
        'Whether performance persists across calendar subperiods instead of one lucky regime.',
      howToRunIt:
        'Group trades by exit year and compare profit contribution and positive-period ratio.',
      metricsToCompare:
        'Profitable year ratio, largest year contribution, number of yearly periods.',
      passCondition: 'Most years are profitable and no single year explains most profit.',
      invalidateCondition: 'One period explains nearly all return, or most periods lose money.',
      conclusion:
        yearlyProfits.length < 2
          ? 'Need trades spanning at least two years for a useful yearly split.'
          : positiveYearRatio >= 0.67 && largestYearContribution <= 0.7
            ? 'Yearly stability looks healthy.'
            : positiveYearRatio >= 0.5 && largestYearContribution <= 0.85
              ? 'Subperiod stability is mixed.'
              : 'Performance is concentrated in too few periods.',
      metrics: [
        {
          label: 'Yearly periods',
          value: formatNumber(yearlyProfits.length),
          tone: yearlyProfits.length >= 2 ? 'pass' : 'info',
        },
        {
          label: 'Profitable years',
          value: formatPercent(positiveYearRatio),
          tone: statusTone(
            positiveYearRatio >= 0.67 ? 'pass' : positiveYearRatio >= 0.5 ? 'watch' : 'invalidate'
          ),
        },
        {
          label: 'Largest year contribution',
          value: formatPercent(largestYearContribution),
          tone: statusTone(
            largestYearContribution <= 0.7
              ? 'pass'
              : largestYearContribution <= 0.85
                ? 'watch'
                : 'invalidate'
          ),
        },
      ],
    }),
    makeResult({
      id: 'rolling-death-watch',
      name: 'Rolling death watch',
      status:
        windows.length === 0
          ? 'info'
          : negativeWindowRatio <= 0.25
            ? 'pass'
            : negativeWindowRatio <= 0.5
              ? 'watch'
              : 'invalidate',
      requiredInputs: 'TradingView List of Trades export',
      whatItChecks: 'Whether edge decays or spends long rolling trade windows below zero.',
      howToRunIt: `Compute rolling ${rollingWindow}-trade net profit windows across the imported trades.`,
      metricsToCompare: 'Negative rolling window ratio, worst rolling window, best rolling window.',
      passCondition: 'No more than 25% of rolling windows are negative.',
      invalidateCondition:
        'More than half of rolling windows are negative, suggesting strategy death or regime dependence.',
      conclusion:
        windows.length === 0
          ? 'Need more trades than the selected rolling window.'
          : negativeWindowRatio <= 0.25
            ? 'Rolling windows mostly stay positive.'
            : negativeWindowRatio <= 0.5
              ? 'Rolling performance has meaningful dead zones.'
              : 'Rolling windows are negative too often.',
      metrics: [
        { label: 'Window size', value: `${rollingWindow} trades`, tone: 'info' },
        {
          label: 'Negative windows',
          value: formatPercent(negativeWindowRatio),
          tone: statusTone(
            negativeWindowRatio <= 0.25
              ? 'pass'
              : negativeWindowRatio <= 0.5
                ? 'watch'
                : 'invalidate'
          ),
        },
        {
          label: 'Worst / best window',
          value: `${formatCurrency(worstWindow)} / ${formatCurrency(bestWindow)}`,
          tone: 'info',
        },
      ],
    }),
    makeResult({
      id: 'uploaded-result-comparison',
      name: 'Multiple uploaded result files',
      status:
        fileSummaries.length < 2
          ? 'info'
          : positiveFileRatio >= 0.67
            ? 'pass'
            : positiveFileRatio >= 0.5
              ? 'watch'
              : 'invalidate',
      requiredInputs: 'Two or more uploaded TradingView result files',
      whatItChecks: 'Whether different uploaded runs/markets/settings tell the same story.',
      howToRunIt:
        'Upload multiple TradingView exports and compare per-file trade counts and net profit.',
      metricsToCompare: 'Uploaded file count, positive file ratio, worst file net profit.',
      passCondition: 'Most uploaded result files are positive with enough trades to matter.',
      invalidateCondition: 'Only the cherry-picked file works while sibling uploads fail.',
      conclusion:
        fileSummaries.length < 2
          ? 'Upload multiple TradingView result files to compare settings, markets, or periods.'
          : positiveFileRatio >= 0.67
            ? 'Most uploaded result files are profitable.'
            : positiveFileRatio >= 0.5
              ? 'Uploaded result files are mixed.'
              : 'Most uploaded result files fail.',
      metrics: [
        {
          label: 'Uploaded files',
          value: formatNumber(fileSummaries.length),
          tone: fileSummaries.length >= 2 ? 'pass' : 'info',
        },
        {
          label: 'Positive files',
          value: formatPercent(positiveFileRatio),
          tone: statusTone(
            fileSummaries.length < 2
              ? 'info'
              : positiveFileRatio >= 0.67
                ? 'pass'
                : positiveFileRatio >= 0.5
                  ? 'watch'
                  : 'invalidate'
          ),
        },
        {
          label: 'Worst file profit',
          value: formatCurrency(
            fileSummaries.length > 0 ? Math.min(...fileSummaries.map((file) => file.profit)) : 0
          ),
          tone: 'info',
        },
      ],
    }),
  ]

  return { results, summary: summarize(results) }
}
