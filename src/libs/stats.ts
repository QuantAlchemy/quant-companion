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
  profitBins: number[]
  profitCounts: number[]
  futureDates: Date[]
  upperCone: number[]
  lowerCone: number[]
  monteCarloX: number[]
  monteCarloY: number[][]
  priceBins: number[]
  priceCounts: number[]
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

  // Calculate profit distribution
  const profitBins = [-100, -50, 0, 50, 100]
  const profitCounts = profitBins.map(
    (bin) => netProfit.filter((profit) => profit >= bin && profit < bin + 50).length
  )

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

  // Simulate random price distribution
  const priceBins = [...Array(20)].map((_, i) => equity[equity.length - 1] * (0.9 + i * 0.01))
  const priceCounts = priceBins.map(
    (bin) => equity.filter((eq) => eq >= bin && eq < bin + equity[equity.length - 1] * 0.01).length
  )

  return {
    dates,
    equity,
    netProfit,
    cumNetProfit,
    profitBins,
    profitCounts,
    futureDates,
    upperCone,
    lowerCone,
    monteCarloX,
    monteCarloY,
    priceBins,
    priceCounts,
  }
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

// Function to generate probability cones
export const generateProbabilityCones = (
  data: ProcessedData,
  params: ProbabilityConeParams
): Pick<ProcessedData, 'futureDates' | 'upperCone' | 'lowerCone'> => {
  const { futurePoints, offset, length } = params
  const startIndex = Math.max(0, data.equity.length - length - offset)
  const endIndex = Math.min(data.equity.length, startIndex + length)

  const historicalReturns = data.equity
    .slice(startIndex, endIndex)
    .map((eq, i, arr) => (i > 0 ? (eq - arr[i - 1]) / arr[i - 1] : 0))

  const mean = historicalReturns.reduce((sum, ret) => sum + ret, 0) / historicalReturns.length
  const stdDev = Math.sqrt(
    historicalReturns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) /
      historicalReturns.length
  )

  const futureDates = [...Array(futurePoints)].map(
    (_, i) => new Date(data.dates[data.dates.length - 1].getTime() + (i + 1) * 24 * 60 * 60 * 1000)
  )

  const lastEquity = data.equity[data.equity.length - 1]
  const upperCone = futureDates.map((_, i) => lastEquity * Math.exp((mean + 2 * stdDev) * (i + 1)))
  const lowerCone = futureDates.map((_, i) => lastEquity * Math.exp((mean - 2 * stdDev) * (i + 1)))

  return { futureDates, upperCone, lowerCone }
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
