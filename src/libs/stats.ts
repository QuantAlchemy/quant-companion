import { createSignal } from 'solid-js'
import dayjs from 'dayjs'

export type TradingViewRecord = {
  'Trade #': number
  Type: string
  Signal: string
  'Date/Time': string
  [key: string]: number | string // For dynamic property names
  // INFO: this is what the data looks like in the CSV file, but some of the keys are dynamic so we use this and normalize it.
  // "Trade #": number
  // "Type": string
  // "Signal": string
  // "Date/Time": string
  // "Price USDT": number
  // "Contracts": number
  // "Profit USDT": number
  // "Profit %": number
  // "Cum. Profit USDT": number
  // "Cum. Profit %": number
  // "Run-up USDT": number
  // "Run-up %": number
  // "Drawdown USDT": number
  // "Drawdown %": number
}

export interface Trade {
  date: Date
  profit: number
}

export interface TradeRecord {
  tradeNo: number
  entryContracts: number
  entryCumProfit: number
  entryCumProfitPct: number
  entryDate: Date
  entryDrawdown: number
  entryDrawdownPct: number
  entryPrice: number
  entryProfit: number
  entryProfitPct: number
  entryRunUp: number
  entryRunUpPct: number
  entrySignal: string
  entryType: string
  exitContracts: number
  exitCumProfit: number
  exitCumProfitPct: number
  exitDate: Date
  exitDrawdown: number
  exitDrawdownPct: number
  exitPrice: number
  exitProfit: number
  exitProfitPct: number
  exitRunUp: number
  exitRunUpPct: number
  exitSignal: string
  exitType: string
}

export interface TradeMetrics {
  dates: Date[]
  equity: number[]
  netProfit: number[]
  cumNetProfit: number[]
  startingEquity: number
  zScores: number[]
}

export interface SummaryStats {
  totalTrades: number
  winningTradesCnt: number
  losingTradesCnt: number
  winRate: number
  totalProfit: number
  averageProfit: number
  averageProfitWin: number
  averageProfitLoss: number
  medianProfit: number
  medianProfitWin: number
  medianProfitLoss: number
  firstStdDev: number
  secondStdDev: number
  maxProfit: number
  minProfit: number
  maxDrawdown: number
  maxDrawdownPercent: number
  mar: number
  netProfitByAvgDrawdown: number
  sharpeRatio: number
}

export interface ProbabilityConeData {
  futureDates: Date[]
  upperCone: number[]
  lowerCone: number[]
}

// Type guard for string fields
function isStringField(
  key: keyof TradeRecord
): key is 'entryType' | 'exitType' | 'entrySignal' | 'exitSignal' {
  return ['entryType', 'exitType', 'entrySignal', 'exitSignal'].includes(key)
}

// Type guard for date fields
function isDateField(key: keyof TradeRecord): key is 'entryDate' | 'exitDate' {
  return ['entryDate', 'exitDate'].includes(key)
}

// Type guard for number fields
function isNumberField(
  key: keyof TradeRecord
): key is
  | 'tradeNo'
  | 'entryContracts'
  | 'exitContracts'
  | 'entryPrice'
  | 'exitPrice'
  | 'entryProfit'
  | 'exitProfit'
  | 'entryProfitPct'
  | 'exitProfitPct'
  | 'entryCumProfit'
  | 'exitCumProfit'
  | 'entryCumProfitPct'
  | 'exitCumProfitPct'
  | 'entryDrawdown'
  | 'exitDrawdown'
  | 'entryDrawdownPct'
  | 'exitDrawdownPct'
  | 'entryRunUp'
  | 'exitRunUp'
  | 'entryRunUpPct'
  | 'exitRunUpPct' {
  return [
    'tradeNo',
    'entryContracts',
    'exitContracts',
    'entryPrice',
    'exitPrice',
    'entryProfit',
    'exitProfit',
    'entryProfitPct',
    'exitProfitPct',
    'entryCumProfit',
    'exitCumProfit',
    'entryCumProfitPct',
    'exitCumProfitPct',
    'entryDrawdown',
    'exitDrawdown',
    'entryDrawdownPct',
    'exitDrawdownPct',
    'entryRunUp',
    'exitRunUp',
    'entryRunUpPct',
    'exitRunUpPct',
  ].includes(key)
}

// Type guard function to check if a key is valid
function isValidTradeRecordKey(key: string): key is keyof TradeRecord {
  const validKeys = [
    'tradeNo',
    'entryContracts',
    'entryCumProfit',
    'entryCumProfitPct',
    'entryDate',
    'entryDrawdown',
    'entryDrawdownPct',
    'entryPrice',
    'entryProfit',
    'entryProfitPct',
    'entryRunUp',
    'entryRunUpPct',
    'entrySignal',
    'entryType',
    'exitContracts',
    'exitCumProfit',
    'exitCumProfitPct',
    'exitDate',
    'exitDrawdown',
    'exitDrawdownPct',
    'exitPrice',
    'exitProfit',
    'exitProfitPct',
    'exitRunUp',
    'exitRunUpPct',
    'exitSignal',
    'exitType',
  ]
  return validKeys.includes(key)
}

export const [startingEquity, setStartingEquity] = createSignal(10000)
// INFO: we'll use the originalTradeData to store the original data and tradeData to store data than can be manipulated
// this way we can always revert back to the original data if needed as we do when removing top or bottom trades
export const [originalTradeData, setOriginalTradeData] = createSignal<TradeRecord[] | null>(null)
export const [tradeData, setTradeData] = createSignal<TradeRecord[] | null>(null)
export const [tradeMetrics, setTradeMetrics] = createSignal<TradeMetrics | null>(null)

export const mean = (arr: number[]): number => {
  return arr.reduce((acc, val) => acc + val, 0) / arr.length
}

export const median = (arr: number[]): number => {
  const mid = Math.floor(arr.length / 2)
  const sortedArr = [...arr].sort((a, b) => a - b)

  if (arr.length % 2 === 0) {
    return (sortedArr[mid - 1] + sortedArr[mid]) / 2
  } else {
    return sortedArr[mid]
  }
}

export const standardDeviation = (arr: number[]): number => {
  const avg = mean(arr)
  const variance = mean(arr.map((val) => Math.pow(val - avg, 2)))
  return Math.sqrt(variance)
}

// Function to generate random integers within a range
export const getRandomInt = (min: number, max: number): number => {
  min = Math.ceil(min)
  max = Math.floor(max)
  // The maximum is exclusive and the minimum is inclusive
  return Math.floor(Math.random() * (max - min) + min)
}

// Function to get the average of multiple arrays
export const averageOfArrays = (arrays: number[][]): number[] => {
  // Check if arrays is empty
  if (!arrays || arrays.length === 0) {
    return []
  }

  // Check if first array exists
  const firstArray = arrays[0]
  if (!firstArray) {
    return []
  }

  const length = arrays[0].length
  if (!arrays.every((arr) => arr.length === length)) {
    throw new Error('All arrays must have the same length.')
  }
  return Array.from({ length }, (_, i) => {
    const sum = arrays.reduce((acc, arr) => acc + arr[i], 0)
    return sum / arrays.length
  })
}

export const calculateDrawdowns = (
  equity: number[]
): { drawdownValue: number; drawdownPercent: number }[] => {
  let peak = equity[0]
  return equity.map((value) => {
    if (value > peak) {
      peak = value
      return { drawdownValue: 0, drawdownPercent: 0 }
    }
    const drawdownValue = peak - value
    const drawdownPercent = drawdownValue / peak
    return { drawdownValue, drawdownPercent }
  })
}

// INFO: The z-score is the number of standard deviations a value is away from it's mean. It’s a great way to summarize where a value lies on a distribution.
// For example, if you’re 189 cm tall, the z-score of your height might be 2.5. That means you are 2.5 standard deviations away from the mean height of everyone in the distribution.
// The math is simple:
// (value - average value) / standard deviation of values
export const calculateZScores = (data: number[]): number[] => {
  const average = mean(data)
  const stdDev = standardDeviation(data)
  return data.map((value) => (value - average) / stdDev)
}

// Calculate next date `i` points in the future from the date provided based on the average time delta
// previous dates can be identified by using negative values for `i`
const calculateNextDate = (date: Date, i: number, avgTimeDelta: number): Date => {
  return new Date(date.getTime() + i * avgTimeDelta)
}

// Calculate average time delta between dates so that the future dates can be generated with similar intervals
export const averageTimeDelta = (dates: Date[]): number => {
  const timeDeltas = dates.slice(1).map((date, i) => date.getTime() - dates[i].getTime())
  return timeDeltas.reduce((sum, delta) => sum + delta, 0) / timeDeltas.length
}

function normalizePropertyName(key: string, prefix: string): string {
  // Special case for Trade #
  if (key === 'Trade #') return 'tradeNo'

  // Handle Date/Time
  if (key === 'Date/Time') return `${prefix}Date`

  // Create a base mapping for the property names
  const propertyMap: Record<string, string> = {
    Price: 'Price',
    Contracts: 'Contracts',
    Profit: 'Profit',
    'Profit %': 'ProfitPct',
    'Cum. Profit': 'CumProfit',
    'Cum. Profit %': 'CumProfitPct',
    'Run-up': 'Runup',
    'Run-up %': 'RunupPct',
    Drawdown: 'Drawdown',
    'Drawdown %': 'DrawdownPct',
    Type: 'Type',
    Signal: 'Signal',
  }

  // Remove currency and get base key
  let baseKey = key
  // Handle percentage fields first
  if (key.includes('%')) {
    baseKey = key
  } else {
    // Remove any currency indicators (e.g., "USDT", "BTC", etc.)
    baseKey = key.replace(/\s+[A-Z]+$/, '')
  }

  // Get the normalized property name
  const normalizedKey = propertyMap[baseKey] || baseKey

  // Return camelCase version with prefix
  return `${prefix}${normalizedKey}`
}

export function processTradingViewData(trades: TradingViewRecord[]): TradeRecord[] {
  return Object.values(
    trades.reduce(
      (acc, trade) => {
        const tradeNum = trade['Trade #']
        if (!acc[tradeNum]) {
          acc[tradeNum] = []
        }
        acc[tradeNum].push(trade)
        return acc
      },
      {} as Record<number, TradingViewRecord[]>
    )
  )
    .map((tradePair) => {
      const [entry, exit] = tradePair.sort((a, _) => (a.Type.includes('Entry') ? -1 : 1))

      const mergedTrade: Partial<TradeRecord> = {
        tradeNo: entry['Trade #'],
      }

      ;[
        { trade: entry, prefix: 'entry' as const },
        { trade: exit, prefix: 'exit' as const },
      ].forEach(({ trade, prefix }) => {
        Object.entries(trade).forEach(([key, value]) => {
          if (key === 'Trade #') return

          const normalizedKey = normalizePropertyName(key, prefix)

          if (isValidTradeRecordKey(normalizedKey)) {
            if (key === 'Date/Time') {
              if (isDateField(normalizedKey)) {
                mergedTrade[normalizedKey] = dayjs(value).toDate()
              }
            } else if (isStringField(normalizedKey)) {
              // Handle string fields (Type and Signal)
              mergedTrade[normalizedKey] = value as string
            } else if (isNumberField(normalizedKey)) {
              // Handle number fields
              mergedTrade[normalizedKey] = Number(value)
            }
          }
        })
      })

      return mergedTrade as TradeRecord
    })
    .filter((trade) => dayjs(trade.exitDate).isValid())
}

// Simulate Trade data
export const simulateTradeData = (): TradeRecord[] => {
  const trades: TradeRecord[] = []
  const startDate = new Date(2023, 0, 1)
  let cumulativeProfit = 0

  for (let i = 0; i < 100; i++) {
    const tradeNo = i + 1
    const entryDate = new Date(startDate.getTime() + i * 2 * 24 * 60 * 60 * 1000) // Every 2 days
    const exitDate = new Date(entryDate.getTime() + 24 * 60 * 60 * 1000) // 1 day after entry
    const entryPrice = Math.random() * 500 + 100 // Random entry price between 100 and 600
    const exitPrice = entryPrice + Math.random() * 20 - 10 // Exit price slightly higher/lower
    const profit = exitPrice - entryPrice
    const profitPct = (profit / entryPrice) * 100
    const runUp = profit + Math.random() * 10 // Simulated run-up
    const drawdown = profit - Math.random() * 10 // Simulated drawdown
    const contracts = Math.random() * 1000 // Random number of contracts

    cumulativeProfit += profit

    trades.push({
      tradeNo: tradeNo,
      entryContracts: contracts,
      entryCumProfit: cumulativeProfit,
      entryCumProfitPct: (cumulativeProfit / entryPrice) * 100,
      entryDate: entryDate,
      entryDrawdown: drawdown,
      entryDrawdownPct: (drawdown / entryPrice) * 100,
      entryPrice: entryPrice,
      entryProfit: profit,
      entryProfitPct: profitPct,
      entryRunUp: runUp,
      entryRunUpPct: (runUp / entryPrice) * 100,
      entrySignal: 'enter', // Simulated signal
      entryType: 'long', // Simulated type

      exitContracts: contracts,
      exitCumProfit: cumulativeProfit,
      exitCumProfitPct: (cumulativeProfit / exitPrice) * 100,
      exitDate: exitDate,
      exitDrawdown: drawdown,
      exitDrawdownPct: (drawdown / exitPrice) * 100,
      exitPrice: exitPrice,
      exitProfit: profit,
      exitProfitPct: profitPct,
      exitRunUp: runUp,
      exitRunUpPct: (runUp / exitPrice) * 100,
      exitSignal: 'exit', // Simulated signal
      exitType: 'long', // Simulated type
    })
  }

  return trades
}

// Process raw data into format needed for charts
export const processTradeMetrics = (
  rawData: TradeRecord[],
  startingEquity: number = 100000
): TradeMetrics => {
  // we add one data point for the starting date and equity so the dates and equity values are the same length
  // as an estimate, we use the average time delta between dates to estimate the date for the extra equity value
  const dates = rawData.map((trade) => trade.exitDate)
  const avgTimeDelta = averageTimeDelta(dates)
  const startingDate = calculateNextDate(dates[0], -1, avgTimeDelta)
  dates.unshift(startingDate)

  const equity = rawData.reduce(
    (acc, trade, i) => {
      acc.push(acc[i] + trade.exitProfit)
      return acc
    },
    [startingEquity]
  )
  const netProfit = rawData.map((trade) => trade.exitProfit)
  const cumNetProfit = netProfit.reduce<number[]>((acc, profit, index) => {
    if (index === 0) return [profit]
    return [...acc, acc[index - 1] + profit]
  }, [])
  const zScores = calculateZScores(netProfit)

  return {
    dates,
    equity,
    netProfit,
    cumNetProfit,
    startingEquity,
    zScores,
  }
}

export const calculateLinearAverageEquity = (
  data: Pick<TradeMetrics, 'equity'> | null
): number[] => {
  if (!data?.equity || data.equity.length === 0) {
    return []
  }

  // Calculate average daily return based on the change between first and last equity values
  const totalReturn = data.equity[data.equity.length - 1] - data.equity[0]
  const averageDailyChange = totalReturn / (data.equity.length - 1) // Use (length - 1) to calculate the change rate correctly

  // Calculate the linear average for each data point starting from the initial equity value
  const linearAverageEquity = data.equity.map(
    (_, index) => data.equity[0] + index * averageDailyChange
  )

  return linearAverageEquity
}

/*
  Exponential Growth formula for growth:
    Future_value = last_equity × 𝑒(mean + stdDevMultiplier × stdDev)×sqrt(period)

  This simulates compounded growth, which is typical in financial modeling where returns are continuously compounded over time.
  This uses a geometric Brownian motion approximation, which reflects the compounding nature of returns over time.
  Financial assets often grow in a compounding way rather than linearly, making the exponential approach more suitable for modeling equity growth.
*/
export const generateProbabilityCones = (
  data: TradeMetrics,
  stdDevMultiplier: number = 2,
  futurePoints: number = 30,
  coneStartPercentage: number = 0.9 // 0.9 means cone starts from 90% of equity length
): ProbabilityConeData => {
  // Determine the number of historical points to use for statistics calculation
  const historicalLength = Math.floor(data.equity.length * coneStartPercentage)

  // Check if we have enough data points for meaningful calculation
  if (historicalLength < 2) {
    console.error(
      'Insufficient historical data points for calculating probability cones. Need at least 2 points.'
    )
  }

  // Calculate historical returns using the equity values
  const historicalReturns = data.equity
    .slice(0, historicalLength)
    .map((eq, i, arr) => (i > 0 ? (eq - arr[i - 1]) / arr[i - 1] : 0))

  const historicalReturnsMean = mean(historicalReturns)
  const stdDev = standardDeviation(historicalReturns)

  // Calculate the average time delta from the historical dates so that the future dates can be generated with similar intervals
  const avgTimeDelta = averageTimeDelta(data.dates)

  // Retain the dates not used for statistics (from coneStartPercentage to the end)
  const retainedDates = data.dates.slice(historicalLength)
  const lastHistoricalDate = data.dates[historicalLength - 1]

  // Generate additional future dates to complete the futurePoints requirement
  const additionalFutureDates =
    retainedDates.length >= futurePoints
      ? []
      : [...Array(futurePoints - retainedDates.length)].map(
          (_, i) =>
            new Date(
              retainedDates.length > 0
                ? calculateNextDate(retainedDates[retainedDates.length - 1], i + 1, avgTimeDelta) // Use the last retained date to calculate the next date
                : calculateNextDate(lastHistoricalDate, i + 1, avgTimeDelta)
            )
        )

  const futureDates =
    retainedDates.length >= futurePoints
      ? retainedDates.slice(0, futurePoints)
      : [...retainedDates, ...additionalFutureDates]

  // Calculate upper and lower cones based on the standard deviation multiplier
  const lastEquity = data.equity[historicalLength - 1]
  const upperCone = futureDates.map(
    (_, i) =>
      lastEquity * Math.exp((historicalReturnsMean + stdDevMultiplier * stdDev) * Math.sqrt(i + 1))
  )

  const lowerCone = futureDates.map(
    (_, i) =>
      lastEquity * Math.exp((historicalReturnsMean - stdDevMultiplier * stdDev) * Math.sqrt(i + 1))
  )

  return { futureDates, upperCone, lowerCone }
}

/*
  Linear Probability Cone Calculation
  https://alvarezquanttrading.com/blog/using-probability-cones-to-test-for-strategy-death/
  Future_value = last_value_of_equity + (avg_daily_return*period + sqrt(period)*(curve_sd*std_equity)

  Where:

  Last_value_of_equity: The last value of your backtested results. This is also the last value of your linear equity curve on the last day of your backtested results.

  Avg_daily_return: This is the average of the natural log of the daily percent returns

  Period: How many days from the last_value_equity that we want to calculate the curve value for

  Curve_sd: For what standard deviation are we calculating the curve for. Typical values are -2, -1, 1, 2.

  Std_equity: This is the standard deviation of the log of daily returns
*/
export const generateLinearProbabilityCones = (
  data: TradeMetrics,
  stdDevMultiplier: number = 2,
  futurePoints: number = 30,
  coneStartPercentage: number = 0.9 // 0.9 means cone starts from 90% of equity length
): ProbabilityConeData => {
  // Determine the start index of the historical data used for the cone
  const historicalLength = Math.max(1, Math.floor(data.equity.length * coneStartPercentage))

  // Check if we have enough data points for meaningful calculation
  if (historicalLength < 2) {
    console.error(
      'Insufficient historical data points for calculating probability cones. Need at least 2 points.'
    )
  }

  // Calculate average daily return and standard deviation using the specified length of historical data
  const historicalReturns = data.equity
    .slice(0, historicalLength)
    .map((eq, i, arr) => (i > 0 ? eq - arr[i - 1] : 0))

  const avgDailyReturn =
    historicalReturns.reduce((sum, ret) => sum + ret, 0) / historicalReturns.length
  const stdEquity = Math.sqrt(
    historicalReturns.reduce((sum, ret) => sum + Math.pow(ret - avgDailyReturn, 2), 0) /
      historicalReturns.length
  )

  // Calculate the average time delta from the historical dates so that the future dates can be generated with similar intervals
  const avgTimeDelta = averageTimeDelta(data.dates)

  // Retain the dates not used for statistics (from coneStartPercentage to the end)
  const retainedDates = data.dates.slice(historicalLength)
  const lastHistoricalDate = data.dates[historicalLength - 1]

  // Generate additional future dates to complete the futurePoints requirement
  const additionalFutureDates =
    retainedDates.length >= futurePoints
      ? []
      : [...Array(futurePoints - retainedDates.length)].map(
          (_, i) =>
            new Date(
              retainedDates.length > 0
                ? calculateNextDate(retainedDates[retainedDates.length - 1], i + 1, avgTimeDelta) // Use the last retained date to calculate the next date
                : calculateNextDate(lastHistoricalDate, i + 1, avgTimeDelta)
            )
        )

  const futureDates =
    retainedDates.length >= futurePoints
      ? retainedDates.slice(0, futurePoints)
      : [...retainedDates, ...additionalFutureDates]

  // Get the last equity value to use as a starting point for projecting future values
  const lastEquity = data.equity[historicalLength - 1]

  // Calculate upper and lower probability cones using the linear model
  const upperCone = futureDates.map(
    (_, i) =>
      lastEquity + avgDailyReturn * (i + 1) + Math.sqrt(i + 1) * (stdDevMultiplier * stdEquity)
  )

  const lowerCone = futureDates.map(
    (_, i) =>
      lastEquity + avgDailyReturn * (i + 1) - Math.sqrt(i + 1) * (stdDevMultiplier * stdEquity)
  )

  return { futureDates, upperCone, lowerCone }
}

// Function to calculate trade data statistics
export const calculateSummaryStats = (data: TradeMetrics): SummaryStats => {
  const totalTrades = data.netProfit.length
  const winningTrades = data.netProfit.filter((profit) => profit > 0)
  const winningTradesCnt = data.netProfit.filter((profit) => profit > 0).length
  const losingTrades = data.netProfit.filter((profit) => profit < 0)
  const losingTradesCnt = data.netProfit.filter((profit) => profit < 0).length
  const winRate = winningTradesCnt / totalTrades
  const totalProfit = data.netProfit.reduce((sum, profit) => sum + profit, 0)
  const totalProfitWin = winningTrades.reduce((sum, profit) => sum + profit, 0)
  const totalProfitLoss = losingTrades.reduce((sum, profit) => sum + profit, 0)
  const averageProfit = totalProfit / totalTrades
  const averageProfitWin = totalProfitWin / winningTradesCnt
  const averageProfitLoss = totalProfitLoss / losingTradesCnt
  const medianProfit = median(data.netProfit)
  const medianProfitWin = median(winningTrades)
  const medianProfitLoss = median(losingTrades)
  const firstStdDev = standardDeviation(data.netProfit)
  const secondStdDev = 2 * firstStdDev
  const maxProfit = Math.max(...data.netProfit)
  const minProfit = Math.min(...data.netProfit)
  const drawdowns = calculateDrawdowns(data.equity)
  const maxDrawdown = Math.max(...drawdowns.map((dd) => dd.drawdownValue))
  const maxDrawdownPercent = Math.max(...drawdowns.map((dd) => dd.drawdownPercent))
  const netProfitByAvgDrawdown = totalProfit / mean(drawdowns.map((dd) => dd.drawdownValue))
  const mar = marRatio(data)
  const sharpeRatio = calculateSharpeRatio(data.equity, data.dates)

  // INFO: Trading Edge Ratio: (MFE/MAE > 1)
  // To accurately calculate MFE and MAE, you need intra-trade data capturing the peak unrealized profits during each trade.
  // The ratio of maximum favorable movement (MFE) to maximum adverse movement (MAE).
  // A value greater than 1 suggests that profitable movements outweigh losses, indicating a potential trading edge.
  // const edge = maxProfit / Math.abs(minProfit);

  return {
    totalTrades,
    winningTradesCnt,
    losingTradesCnt,
    winRate,
    totalProfit,
    averageProfit,
    averageProfitWin,
    averageProfitLoss,
    medianProfit,
    medianProfitWin,
    medianProfitLoss,
    maxProfit,
    minProfit,
    firstStdDev,
    secondStdDev,
    maxDrawdown,
    maxDrawdownPercent,
    mar,
    netProfitByAvgDrawdown,
    sharpeRatio,
  }
}

// The MAR Ratio (Managed Account Ratio) is calculated as the annualized return divided by the maximum drawdown (expressed as a percentage).
// Annualization Matters: The MAR Ratio is designed to facilitate comparisons across different time periods and investment strategies by
// annualizing returns. This standardization is crucial because it accounts for the effect of time on returns.
// Return Period: If you calculate the return over a period that is not one year and do not annualize it, then the resulting ratio will
// not accurately represent the MAR Ratio.
const marRatio = (data: TradeMetrics): number => {
  const startingEquity = data.equity[0]
  const finalEquity = data.equity[data.equity.length - 1]
  const totalReturn = finalEquity - startingEquity
  const startDate = data.dates[0]
  const endDate = data.dates[data.dates.length - 1]
  const periodInYears = (endDate.getTime() - startDate.getTime()) / (365 * 24 * 60 * 60 * 1000)
  const totalReturnPercent = (totalReturn / startingEquity) * 100
  const annualizedReturnPercent = ((1 + totalReturnPercent / 100) ** (1 / periodInYears) - 1) * 100
  const drawdowns = calculateDrawdowns(data.equity)
  const maxDrawdownPercent = Math.max(...drawdowns.map((dd) => dd.drawdownPercent))
  return annualizedReturnPercent / (maxDrawdownPercent * 100)
}

// Function to calculate Sharpe ratio
// 1. Calculate Periodic Returns Adjusted for Time Intervals
//   * Calculating Logarithmic Returns (Continuously Compounded Returns): This is preferred for irregular time intervals.
//   * Annualizing Returns: Adjusting the returns to a common annual scale based on the time difference between trades.
// 2. Adjust for the Risk-Free Rate
//   * Since the risk-free rate is typically an annual rate, you can subtract it directly from the annualized returns to get the excess returns.
// 3. Calculate the Mean and Standard Deviation of Excess Returns
//   * Mean Excess Return: Average of the excess returns.
//   * Standard Deviation of Excess Returns: Measures the variability of the excess returns.
// 4. Calculate the Sharpe Ratio
export const calculateSharpeRatio = (
  equityValues: number[],
  dates: Date[],
  riskFreeRate: number = 0.02
) => {
  if (equityValues.length !== dates.length) {
    throw new Error('Equity values and dates arrays must have the same length.')
  }

  const excessReturns = []

  for (let i = 1; i < equityValues.length; i++) {
    const equityPrev = equityValues[i - 1]
    const equityCurr = equityValues[i]
    const datePrev = new Date(dates[i - 1])
    const dateCurr = new Date(dates[i])

    // Time difference in years
    const timeDiff = (dateCurr.getTime() - datePrev.getTime()) / (365.25 * 24 * 60 * 60 * 1000)

    // Handle cases where time difference is zero or negative
    if (timeDiff <= 0) {
      continue // Skip this interval
    }

    // Logarithmic return
    const logReturn = Math.log(equityCurr / equityPrev)

    // Annualized return
    const annualizedReturn = logReturn * (1 / timeDiff)

    // Excess return
    const excessReturn = annualizedReturn - riskFreeRate

    excessReturns.push(excessReturn)
  }

  if (excessReturns.length === 0) {
    throw new Error('No valid returns to calculate Sharpe Ratio.')
  }

  // Calculate mean and standard deviation of excess returns
  const meanExcessReturn = excessReturns.reduce((sum, r) => sum + r, 0) / excessReturns.length

  const stdDevExcessReturn = Math.sqrt(
    excessReturns.reduce((sum, r) => sum + Math.pow(r - meanExcessReturn, 2), 0) /
      (excessReturns.length - 1)
  )

  const sharpeRatio = meanExcessReturn / stdDevExcessReturn

  return sharpeRatio
}

// // Function to filter data by date range
// export const filterDataByDateRange = (
//   data: TradeMetrics,
//   startDate: Date,
//   endDate: Date
// ): Pick<TradeMetrics, 'dates' | 'equity' | 'netProfit' | 'cumNetProfit'> => {
//   const filteredIndices = data.dates.reduce<number[]>((indices, date, index) => {
//     if (date >= startDate && date <= endDate) {
//       indices.push(index)
//     }
//     return indices
//   }, [])

//   return {
//     dates: filteredIndices.map((i) => data.dates[i]),
//     equity: filteredIndices.map((i) => data.equity[i]),
//     netProfit: filteredIndices.map((i) => data.netProfit[i]),
//     cumNetProfit: filteredIndices.map((i) => data.cumNetProfit[i]),
//   }
// }
