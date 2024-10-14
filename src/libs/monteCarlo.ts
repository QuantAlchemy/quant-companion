import { getRandomInt } from './stats'

import type { ProcessedData } from './stats'

export interface MonteCarloData {
  monteCarloX: number[]
  monteCarloY: number[][]
}

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
): number[][] => {
  return [...Array(trials)].map(() => simulation(profitData, points, startingEquity))
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
