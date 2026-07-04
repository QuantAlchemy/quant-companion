import { Store } from '@tanstack/store'
import { calculateDrawdowns, getRandomInt } from './stats'

export type MonteCarloData = number[][]

export interface MonteCarloSummaryStats {
  positiveRuns: number
  negativeRuns: number
  maxEquity: number
  minEquity: number
  maxEquityPercent: number
  minEquityPercent: number
  successRate: number
  maxDrawdown: number
  maxDrawdownPercent: number
  minDrawdown: number
  minDrawdownPercent: number
}

export const monteCarloDataStore = new Store<MonteCarloData>([])

export const sortArraysByLastNumberDescending = (arrays: MonteCarloData) => {
  return arrays.sort((a, b) => {
    const lastA = a.length > 0 ? a[a.length - 1] : Infinity
    const lastB = b.length > 0 ? b[b.length - 1] : Infinity
    return lastB - lastA
  })
}

/*
  INFO:
  https://kjtradingsystems.com/monte-carlo-probability-cones.html
  This uses a process called “sampling with replacement”.
  Each trade in the backtest can be chosen numerous times, based on the random selection process.
  Some trades may not be chosen at all. This leads to a wide range of ending equity values.
  If “sampling without replacement” was used, then eventually all equity curves would converge to a common end point,
  since each backtest trade was used once and only once).
*/
export const simulation = (
  profitData: number[],
  points: number,
  startingEquity: number
): number[] => {
  let equity = startingEquity
  const path = [equity]
  for (let point = 0; point < points; point++) {
    const tradeNo = getRandomInt(0, profitData.length)
    const nextProfit = profitData[tradeNo]
    equity += nextProfit
    path.push(equity)
  }
  return path
}

export const simulations = (
  profitData: number[],
  trials: number = 100,
  points: number = 100,
  startingEquity: number = 10000
): MonteCarloData => {
  const runs = [...Array(trials)].map(() =>
    simulation(profitData, points, startingEquity)
  )

  return sortArraysByLastNumberDescending(runs)
}

// Function to calculate monte carlo data statistics
export const calculateMonteCarloStats = (data: MonteCarloData): MonteCarloSummaryStats => {
  const startingEquity = data[0][0]
  const results = data.reduce(
    (acc, run) => {
      const finalEquity = run[run.length - 1]

      if (finalEquity > startingEquity) {
        acc.positive++
      } else {
        acc.negative++
      }
      if (finalEquity < acc.min) {
        acc.min = finalEquity
      }
      if (finalEquity > acc.max) {
        acc.max = finalEquity
      }
      return acc
    },
    { positive: 0, negative: 0, min: startingEquity, max: startingEquity }
  )

  const successRate = results.positive / (results.positive + results.negative)
  const drawdowns = data.map((run) => calculateDrawdowns(run))
  const maxDrawdowns = drawdowns.map((dd) => Math.max(...dd.map((d) => d.drawdownValue)))
  const maxDrawdownPercentages = drawdowns.map((dd) =>
    Math.max(...dd.map((d) => d.drawdownPercent))
  )
  const maxDrawdown = Math.max(...maxDrawdowns)
  const maxDrawdownPercent = Math.max(...maxDrawdownPercentages)
  const minDrawdown = Math.min(...maxDrawdowns)
  const minDrawdownPercent = Math.min(...maxDrawdownPercentages)

  return {
    positiveRuns: results.positive,
    negativeRuns: results.negative,
    successRate,
    maxEquity: results.max,
    minEquity: results.min,
    maxEquityPercent: results.max / startingEquity - 1,
    minEquityPercent: results.min / startingEquity - 1,
    maxDrawdown,
    maxDrawdownPercent,
    minDrawdown,
    minDrawdownPercent,
  }
}
