import { createSignal } from 'solid-js'
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
}

export const [monteCarloData, setMonteCarloData] = createSignal<MonteCarloData>([])

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
  const simulation = [equity]
  for (let point = 0; point < points; point++) {
    const tradeNo = getRandomInt(0, profitData.length)
    const nextProfit = profitData[tradeNo]
    equity += nextProfit
    simulation.push(equity)
  }
  return simulation
}

export const simulations = (
  profitData: number[],
  trials: number = 100,
  points: number = 100,
  startingEquity: number = 10000
): MonteCarloData => {
  const monteCarloData = [...Array(trials)].map(() =>
    simulation(profitData, points, startingEquity)
  )
  return sortArraysByLastNumberDescending(monteCarloData)
}

// Function to calculate monte carlo data statistics
export const calculateMonteCarloStats = (data: MonteCarloData): MonteCarloSummaryStats => {
  const startingEquity = data[0][0]
  const results = monteCarloData().reduce(
    (acc, simulation) => {
      const finalEquity = simulation[simulation.length - 1]

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
  const drawdowns = monteCarloData().map((simulation) => calculateDrawdowns(simulation))
  const maxDrawdown = Math.max(...drawdowns.flat().map((dd) => dd.drawdownValue))
  const maxDrawdownPercent = Math.max(...drawdowns.flat().map((dd) => dd.drawdownPercent))

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
  }
}
