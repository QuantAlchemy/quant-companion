// Define interfaces for our data structures
export interface Trade {
  date: Date
  profit: number
  equity: number
}

export interface ProcessedData {
  dates: Date[]
  equity: number[]
  netProfit: number[]
  cumNetProfit: number[]
  futureDates: Date[]
  upperCone: number[]
  lowerCone: number[]
  monteCarloX: number[]
  monteCarloY: number[][]
}

export interface SummaryStats {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: string
  totalProfit: string
  averageProfit: string
  maxDrawdown: string
}

export interface ProbabilityConeParams {
  futurePoints: number
  offset: number
  length: number
}

// Simulate TradingView data
export const simulateTradingViewData = (): Trade[] => {
  const trades: Trade[] = []
  const startDate = new Date(2023, 0, 1)
  let currentEquity = 10000

  for (let i = 0; i < 100; i++) {
    const tradeDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
    const profit = Math.random() * 200 - 100 // Random profit between -100 and 100
    currentEquity += profit

    trades.push({
      date: tradeDate,
      profit: profit,
      equity: currentEquity,
    })
  }

  return trades
}

// Process raw data into format needed for charts
export const processData = (rawData: Trade[], startingEquity: number = 100000): ProcessedData => {
  const dates = rawData.map((trade) => trade.date)
  const equity = rawData.map((trade) => trade.equity)
  const netProfit = rawData.map((trade) => trade.profit)
  const cumNetProfit = netProfit.reduce<number[]>((acc, profit, index) => {
    if (index === 0) return [profit]
    return [...acc, acc[index - 1] + profit]
  }, [])

  // Simulate probability cones
  const futureDates = [...Array(30)].map(
    (_, i) => new Date(dates[dates.length - 1].getTime() + (i + 1) * 24 * 60 * 60 * 1000)
  )
  const upperCone = futureDates.map(
    (_, i) => equity[equity.length - 1] * (1 + 0.01 * Math.sqrt(i + 1))
  )
  const lowerCone = futureDates.map(
    (_, i) => equity[equity.length - 1] * (1 - 0.01 * Math.sqrt(i + 1))
  )

  // Simulate Monte Carlo data
  const monteCarloX = [...Array(100)].map((_, i) => i)
  const monteCarloY = [...Array(20)].map(() =>
    monteCarloX.map((x) => startingEquity * Math.exp(0.0002 * x + 0.01 * Math.random()))
  )

  return {
    dates,
    equity,
    netProfit,
    cumNetProfit,
    futureDates,
    upperCone,
    lowerCone,
    monteCarloX,
    monteCarloY,
  }
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
): Pick<ProcessedData, 'futureDates' | 'upperCone' | 'lowerCone'> => {
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

  const mean = historicalReturns.reduce((sum, ret) => sum + ret, 0) / historicalReturns.length
  const stdDev = Math.sqrt(
    historicalReturns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) /
      historicalReturns.length
  )

  // Calculate the average time delta from the historical dates so that the future dates can be generated with similar intervals
  const timeDeltas = data.dates
    .slice(1, historicalLength)
    .map((date, i) => date.getTime() - data.dates[i].getTime())
  const avgTimeDelta = timeDeltas.reduce((sum, delta) => sum + delta, 0) / timeDeltas.length

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
    (_, i) => lastEquity * Math.exp((mean + stdDevMultiplier * stdDev) * Math.sqrt(i + 1))
  )

  const lowerCone = futureDates.map(
    (_, i) => lastEquity * Math.exp((mean - stdDevMultiplier * stdDev) * Math.sqrt(i + 1))
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
): Pick<ProcessedData, 'futureDates' | 'upperCone' | 'lowerCone'> => {
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
  const timeDeltas = data.dates
    .slice(1, historicalLength)
    .map((date, i) => date.getTime() - data.dates[i].getTime())
  const avgTimeDelta = timeDeltas.reduce((sum, delta) => sum + delta, 0) / timeDeltas.length

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

// Function to calculate summary statistics
export const calculateSummaryStats = (data: ProcessedData): SummaryStats => {
  const totalTrades = data.netProfit.length
  const winningTrades = data.netProfit.filter((profit) => profit > 0).length
  const losingTrades = data.netProfit.filter((profit) => profit < 0).length
  const winRate = (winningTrades / totalTrades) * 100
  const totalProfit = data.netProfit.reduce((sum, profit) => sum + profit, 0)
  const averageProfit = totalProfit / totalTrades
  const maxDrawdown = Math.min(...data.cumNetProfit) - Math.max(...data.cumNetProfit)

  return {
    totalTrades,
    winningTrades,
    losingTrades,
    winRate: winRate.toFixed(2),
    totalProfit: totalProfit.toFixed(2),
    averageProfit: averageProfit.toFixed(2),
    maxDrawdown: maxDrawdown.toFixed(2),
  }
}

// Function to filter data by date range
export const filterDataByDateRange = (
  data: ProcessedData,
  startDate: Date,
  endDate: Date
): Pick<ProcessedData, 'dates' | 'equity' | 'netProfit' | 'cumNetProfit'> => {
  const filteredIndices = data.dates.reduce<number[]>((indices, date, index) => {
    if (date >= startDate && date <= endDate) {
      indices.push(index)
    }
    return indices
  }, [])

  return {
    dates: filteredIndices.map((i) => data.dates[i]),
    equity: filteredIndices.map((i) => data.equity[i]),
    netProfit: filteredIndices.map((i) => data.netProfit[i]),
    cumNetProfit: filteredIndices.map((i) => data.cumNetProfit[i]),
  }
}

// Function to generate Monte Carlo simulation data
export const generateMonteCarloData = (
  data: ProcessedData,
  trials: number,
  days: number
): { monteCarloX: number[]; monteCarloY: number[][] } => {
  const returns = data.equity.map((eq, i, arr) => (i > 0 ? (eq - arr[i - 1]) / arr[i - 1] : 0))
  const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
  const stdDev = Math.sqrt(
    returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length
  )

  const monteCarloX = [...Array(days)].map((_, i) => i)
  const monteCarloY = [...Array(trials)].map(() => {
    let equity = data.equity[data.equity.length - 1]
    return monteCarloX.map(() => {
      equity *= Math.exp(mean - 0.5 * stdDev * stdDev + stdDev * Math.random())
      return equity
    })
  })

  return { monteCarloX, monteCarloY }
}

// Function to calculate drawdowns
export const calculateDrawdowns = (equity: number[]): number[] => {
  let peak = equity[0]
  return equity.map((value) => {
    if (value > peak) {
      peak = value
      return 0
    }
    return (peak - value) / peak
  })
}

// Function to calculate Sharpe ratio
export const calculateSharpeRatio = (returns: number[], riskFreeRate: number = 0.02): number => {
  const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
  const stdDev = Math.sqrt(
    returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length
  )
  return ((meanReturn - riskFreeRate) / stdDev) * Math.sqrt(252) // Annualized Sharpe ratio
}

// Function to calculate risk-adjusted return (RAR)
export const calculateRiskAdjustedReturn = (
  returns: number[],
  riskFreeRate: number = 0.02
): number => {
  const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
  const stdDev = Math.sqrt(
    returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length
  )
  return (meanReturn - riskFreeRate) / stdDev
}
