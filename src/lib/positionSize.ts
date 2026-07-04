/**
 * Position sizing with liquidation analysis.
 * Math ported verbatim from the standalone Position Size Calculator.
 */

export interface PositionSizeInput {
  accountSize: number
  exchangeBalance: number
  entryPrice: number
  stopLoss: number
  leverage: number
  maintenanceMarginPercent: number
  riskMode: 'percent' | 'dollar'
  riskPercent: number
  riskDollar: number
}

export type BufferLevel = 'safe' | 'moderate' | 'risky'

export interface PositionSizeResult {
  isLong: boolean
  riskAmount: number
  rMultiple: number
  positionSize: number
  notionalValue: number
  initialMargin: number
  maintenanceMarginAmount: number
  liquidationPrice: number
  liquidationDistance: number
  liquidationDistancePercent: number
  availableBuffer: number
  bufferRatio: number
  maxLossBeforeLiquidation: number
  bufferLevel: BufferLevel
  bufferStatus: string
  riskTips: string[]
}

export function calculatePosition(input: PositionSizeInput): PositionSizeResult {
  const {
    accountSize,
    exchangeBalance,
    entryPrice,
    stopLoss,
    leverage,
    maintenanceMarginPercent,
  } = input

  // Determine risk amount
  let riskAmount: number
  if (input.riskMode === 'percent') {
    if (!input.riskPercent || input.riskPercent <= 0) {
      throw new Error('Please enter a valid risk percentage')
    }
    riskAmount = (accountSize * input.riskPercent) / 100
  } else {
    riskAmount = input.riskDollar
    if (!riskAmount || riskAmount <= 0) {
      throw new Error('Please enter a valid risk amount')
    }
  }

  // Validate inputs
  if (!accountSize || accountSize <= 0) {
    throw new Error('Please enter a valid account size')
  }
  if (!exchangeBalance || exchangeBalance <= 0) {
    throw new Error('Please enter a valid exchange balance')
  }
  if (exchangeBalance > accountSize) {
    throw new Error('Exchange balance cannot be greater than total account size')
  }
  if (!entryPrice || entryPrice <= 0) {
    throw new Error('Please enter a valid entry price')
  }
  if (!stopLoss || stopLoss <= 0) {
    throw new Error('Please enter a valid stop loss price')
  }
  if (entryPrice === stopLoss) {
    throw new Error('Entry price and stop loss cannot be the same')
  }

  // Long if the stop sits below entry
  const isLong = stopLoss < entryPrice

  // R multiple (risk per unit)
  const rMultiple = Math.abs(entryPrice - stopLoss)
  const positionSize = riskAmount / rMultiple
  const notionalValue = positionSize * entryPrice

  // Margin requirements
  const initialMargin = notionalValue / leverage
  const maintenanceMarginAmount = (notionalValue * maintenanceMarginPercent) / 100

  // Liquidation when equity falls to maintenance margin
  const liquidationPrice = isLong
    ? entryPrice - (exchangeBalance - maintenanceMarginAmount) / positionSize
    : entryPrice + (exchangeBalance - maintenanceMarginAmount) / positionSize

  const liquidationDistance = Math.abs(entryPrice - liquidationPrice)
  const liquidationDistancePercent = (liquidationDistance / entryPrice) * 100

  // Buffer analysis
  const availableBuffer = exchangeBalance - initialMargin
  const bufferRatio = availableBuffer / riskAmount
  const maxLossBeforeLiquidation = exchangeBalance - maintenanceMarginAmount

  let bufferLevel: BufferLevel
  let bufferStatus: string
  let riskTips: string[]
  if (bufferRatio >= 3) {
    bufferLevel = 'safe'
    bufferStatus = 'SAFE: Excellent margin buffer. Very low liquidation risk.'
    riskTips = [
      'Your buffer is strong enough to handle significant slippage',
      'Consider this setup as low liquidation risk',
      'Monitor for extreme market volatility',
    ]
  } else if (bufferRatio >= 1.5) {
    bufferLevel = 'moderate'
    bufferStatus = 'MODERATE: Adequate buffer, but monitor closely.'
    riskTips = [
      'Your buffer provides reasonable protection',
      'Be aware of potential slippage in volatile markets',
      'Consider tighter stop-losses or smaller position size',
      'Monitor funding fees if holding overnight',
    ]
  } else {
    bufferLevel = 'risky'
    bufferStatus = 'RISKY: Low margin buffer. High liquidation risk!'
    riskTips = [
      'DANGER: Your buffer may not protect against slippage',
      'Consider reducing position size or increasing exchange balance',
      'Use lower leverage to increase your buffer',
      'This setup has significant liquidation risk',
    ]
  }

  // Check if position is even possible
  if (initialMargin > exchangeBalance) {
    throw new Error(
      `Insufficient exchange balance. You need at least $${initialMargin.toFixed(2)} but only have $${exchangeBalance.toFixed(2)} on the exchange.`
    )
  }

  return {
    isLong,
    riskAmount,
    rMultiple,
    positionSize,
    notionalValue,
    initialMargin,
    maintenanceMarginAmount,
    liquidationPrice,
    liquidationDistance,
    liquidationDistancePercent,
    availableBuffer,
    bufferRatio,
    maxLossBeforeLiquidation,
    bufferLevel,
    bufferStatus,
    riskTips,
  }
}
