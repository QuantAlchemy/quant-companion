// Define interfaces for our data structures
export interface Trade {
  date: Date
  profit: number
}

export interface ProcessedData {
  dates: Date[]
  equity: number[]
  netProfit: number[]
  cumNetProfit: number[]
  startingEquity: number
}

export interface SummaryStats {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  totalProfit: number
  averageProfit: number
  medianProfit: number
  firstStdDev: number
  secondStdDev: number
  maxProfit: number
  minProfit: number
  maxDrawdown: number
  maxDrawdownPercent: number
  mar: number
  sharpeRatio: number
}

export interface ProbabilityConeData {
  futureDates: Date[]
  upperCone: number[]
  lowerCone: number[]
}

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

// Function to calculate drawdowns
// Maximum Drawdown (MDD) = (Trough Value – Peak Value) ÷ Peak Value
// https://youtu.be/tXUrvH1T19o?si=8oDGpo1WeaO06yhU
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

// Simulate TradingView data
export const simulateTradingViewData = (): Trade[] => {
  const trades: Trade[] = []
  const startDate = new Date(2023, 0, 1)

  for (let i = 0; i < 100; i++) {
    const tradeDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
    const profit = Math.random() * 200 - 100 // Random profit between -100 and 100

    trades.push({
      date: tradeDate,
      profit: profit,
    })
  }

  return trades
}

// Function to dedupe trading view data based on a key which is 'Trade #' by default
// Trading View exports the data with duplicate trade numbers, so we need to dedupe them
// export const dedupeTradingViewData = (arr: any[], key = 'Trade #') => {
//   const map = new Map()
//   arr.forEach((obj) => map.set(obj[key], obj))
//   return Array.from(map.values())
// }

// Process raw data into format needed for charts
export const processData = (rawData: Trade[], startingEquity: number = 100000): ProcessedData => {
  const dates = rawData.map((trade) => trade.date)
  const equity = rawData.reduce(
    (acc, trade, i) => {
      acc.push(acc[i] + trade.profit)
      return acc
    },
    [startingEquity]
  )
  const netProfit = rawData.map((trade) => trade.profit)
  const cumNetProfit = netProfit.reduce<number[]>((acc, profit, index) => {
    if (index === 0) return [profit]
    return [...acc, acc[index - 1] + profit]
  }, [])

  return {
    dates,
    equity,
    netProfit,
    cumNetProfit,
    startingEquity,
  }
}

// Calculate average time delta between dates so that the future dates can be generated with similar intervals
export const averageTimeDelta = (dates: Date[]): number => {
  const timeDeltas = dates.slice(1).map((date, i) => date.getTime() - dates[i].getTime())
  return timeDeltas.reduce((sum, delta) => sum + delta, 0) / timeDeltas.length
}

export const calculateLinearAverageEquity = (
  data: Pick<ProcessedData, 'equity'> | null
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
  data: ProcessedData,
  stdDevMultiplier: number = 2,
  futurePoints: number = 30,
  coneStartPercentage: number = 0.9 // 0.9 means cone starts from 90% of equity length
): ProbabilityConeData => {
  // Determine the number of historical points to use for statistics calculation
  const historicalLength = Math.floor(data.equity.length * coneStartPercentage)

  // Check if we have enough data points for meaningful calculation
  if (historicalLength < 2) {
    throw new Error(
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
                ? retainedDates[retainedDates.length - 1].getTime() + (i + 1) * avgTimeDelta
                : lastHistoricalDate.getTime() + (i + 1) * avgTimeDelta
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
  data: ProcessedData,
  stdDevMultiplier: number = 2,
  futurePoints: number = 30,
  coneStartPercentage: number = 0.9 // 0.9 means cone starts from 90% of equity length
): ProbabilityConeData => {
  // Determine the start index of the historical data used for the cone
  const historicalLength = Math.max(1, Math.floor(data.equity.length * coneStartPercentage))

  // Check if we have enough data points for meaningful calculation
  if (historicalLength < 2) {
    throw new Error(
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
                ? retainedDates[retainedDates.length - 1].getTime() + (i + 1) * avgTimeDelta
                : lastHistoricalDate.getTime() + (i + 1) * avgTimeDelta
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
export const calculateSummaryStats = (data: ProcessedData): SummaryStats => {
  const totalTrades = data.netProfit.length
  const winningTrades = data.netProfit.filter((profit) => profit > 0).length
  const losingTrades = data.netProfit.filter((profit) => profit < 0).length
  const winRate = winningTrades / totalTrades
  const totalProfit = data.netProfit.reduce((sum, profit) => sum + profit, 0)
  const averageProfit = totalProfit / totalTrades
  const medianProfit = median(data.netProfit)
  const firstStdDev = standardDeviation(data.netProfit)
  const secondStdDev = 2 * firstStdDev
  const maxProfit = Math.max(...data.netProfit)
  const minProfit = Math.min(...data.netProfit)
  const drawdowns = calculateDrawdowns(data.equity)
  const maxDrawdown = Math.max(...drawdowns.map((dd) => dd.drawdownValue))
  const maxDrawdownPercent = Math.max(...drawdowns.map((dd) => dd.drawdownPercent))
  const mar = marRatio(data)

  // we need the same number of dates as equity values and since we add an extra equity value for starting equity
  // we also need to add a date for that extra equity value
  // As an estimate, we use the average time delta between dates to estimate the date for the extra equity value
  const avgTimeDelta = averageTimeDelta(data.dates)
  const firstHistoricalDate = data.dates[0]
  const previousDate = new Date(firstHistoricalDate.getTime() - avgTimeDelta)
  const sharpeRatio = calculateSharpeRatio(data.equity, [previousDate, ...data.dates])

  // INFO: Trading Edge Ratio: (MFE/MAE > 1)
  // To accurately calculate MFE and MAE, you need intra-trade data capturing the peak unrealized profits during each trade.
  // The ratio of maximum favorable movement (MFE) to maximum adverse movement (MAE).
  // A value greater than 1 suggests that profitable movements outweigh losses, indicating a potential trading edge.
  // const edge = maxProfit / Math.abs(minProfit);

  return {
    totalTrades,
    winningTrades,
    losingTrades,
    winRate,
    totalProfit,
    averageProfit,
    medianProfit,
    firstStdDev,
    secondStdDev,
    maxProfit,
    minProfit,
    maxDrawdown,
    maxDrawdownPercent,
    mar,
    sharpeRatio,
  }
}

// The MAR Ratio (Managed Account Ratio) is calculated as the annualized return divided by the maximum drawdown (expressed as a percentage).
// Annualization Matters: The MAR Ratio is designed to facilitate comparisons across different time periods and investment strategies by
// annualizing returns. This standardization is crucial because it accounts for the effect of time on returns.
// Return Period: If you calculate the return over a period that is not one year and do not annualize it, then the resulting ratio will
// not accurately represent the MAR Ratio.
const marRatio = (data: ProcessedData): number => {
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
//   data: ProcessedData,
//   startDate: Date,
//   endDate: Date
// ): Pick<ProcessedData, 'dates' | 'equity' | 'netProfit' | 'cumNetProfit'> => {
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
