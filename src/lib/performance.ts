import { calculateZScores } from '@/lib/stats'

import type { JournalTrade } from '@/lib/journal'
import type { TradeMetrics, TradeRecord } from '@/lib/stats'

export type PerformanceSource = 'journal' | 'tradingview'
export type PerformanceSide = 'long' | 'short'
export type PerformanceStatus = 'open' | 'closed'

export interface PerformanceTrade {
  id: string
  source: PerformanceSource
  sourceLabel: string
  symbol?: string
  side?: PerformanceSide
  entryDate: Date
  exitDate?: Date
  quantity?: number
  entryPrice?: number
  exitPrice?: number
  realizedPnl: number
  unrealizedPnl?: number
  fees?: number
  status: PerformanceStatus
  notes?: string
}

export interface PerformanceSummary {
  totalTrades: number
  closedTrades: number
  openTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  realizedPnl: number
  unrealizedPnl: number
  totalPnl: number
  grossProfit: number
  grossLoss: number
  profitFactor: number
  averageWin: number
  averageLoss: number
  expectancy: number
  averageTradePnl: number
  bestTrade: number
  worstTrade: number
}

const asDate = (value: Date | string | undefined): Date | null => {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const sideFromValue = (
  value: string | undefined,
): PerformanceSide | undefined => {
  const normalized = value?.toLowerCase() ?? ''
  if (normalized.includes('short') || normalized.includes('sell'))
    return 'short'
  if (normalized.includes('long') || normalized.includes('buy')) return 'long'
  return undefined
}

const numberOrZero = (value: number | undefined | null) =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0

export const calculateJournalUnrealizedPnl = (
  trade: JournalTrade,
  prices: Record<string, number>,
): number | null => {
  if (trade.status !== 'open') return null
  const marketPrice = prices[trade.assetName]
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- index access may be undefined
  if (marketPrice == null) return null
  const entryValue = trade.price * trade.quantity
  const currentValue = marketPrice * trade.quantity
  return trade.tradeType === 'buy'
    ? currentValue - entryValue
    : entryValue - currentValue
}

export const unrealizedPnl = calculateJournalUnrealizedPnl

export const journalTradesToPerformanceTrades = (
  trades: JournalTrade[],
  prices: Record<string, number> = {},
): PerformanceTrade[] =>
  trades.map((trade) => {
    const livePnl = calculateJournalUnrealizedPnl(trade, prices) ?? undefined
    return {
      id: trade.id,
      source: 'journal',
      sourceLabel: 'Journal',
      symbol: trade.assetName,
      side: trade.tradeType === 'sell' ? 'short' : 'long',
      entryDate: asDate(trade.tradeDate) ?? new Date(0),
      exitDate: asDate(trade.closingDate) ?? undefined,
      quantity: trade.quantity,
      entryPrice: trade.price,
      exitPrice: trade.closingPrice,
      realizedPnl: numberOrZero(trade.realizedPnl),
      unrealizedPnl: livePnl,
      fees: trade.commission,
      status: trade.status,
      notes: trade.comments,
    }
  })

export const tradingViewRecordsToPerformanceTrades = (
  records: TradeRecord[],
): PerformanceTrade[] =>
  records.map((record) => ({
    id: `${record.filename}:${record.tradeNo ?? record.tradeNoOrig}`,
    source: 'tradingview',
    sourceLabel: 'TradingView Upload',
    symbol: record.filename,
    side: sideFromValue(record.exitType) ?? sideFromValue(record.entryType),
    entryDate: record.entryDate,
    exitDate: record.exitDate,
    quantity: record.exitContracts || record.entryContracts,
    entryPrice: record.entryPrice,
    exitPrice: record.exitPrice,
    realizedPnl: numberOrZero(record.exitProfit),
    status: 'closed',
  }))

export const combinePerformanceTrades = (
  ...groups: Array<PerformanceTrade[] | null | undefined>
): PerformanceTrade[] =>
  groups
    .flatMap((group) => group ?? [])
    .sort(
      (a, b) =>
        (a.exitDate ?? a.entryDate).getTime() -
        (b.exitDate ?? b.entryDate).getTime(),
    )

const safeZScores = (values: number[]) => {
  if (values.length < 2 || values.every((value) => value === values[0])) {
    return values.map(() => 0)
  }
  return calculateZScores(values).map((value) =>
    Number.isFinite(value) ? value : 0,
  )
}

export const performanceTradesToTradeMetrics = (
  trades: PerformanceTrade[],
  startingEquity: number,
): TradeMetrics | null => {
  const closedTrades = trades
    .filter(
      (trade) =>
        trade.status === 'closed' && Number.isFinite(trade.realizedPnl),
    )
    .sort(
      (a, b) =>
        (a.exitDate ?? a.entryDate).getTime() -
        (b.exitDate ?? b.entryDate).getTime(),
    )

  if (closedTrades.length === 0) return null

  const netProfit = closedTrades.map((trade) => trade.realizedPnl)
  const dates = closedTrades.map((trade) => trade.exitDate ?? trade.entryDate)
  const firstDate = dates[0]
  const startingDate =
    dates.length > 1
      ? new Date(
          firstDate.getTime() - (dates[1].getTime() - firstDate.getTime()),
        )
      : new Date(firstDate.getTime() - 86_400_000)
  const equity = netProfit.reduce<number[]>(
    (acc, profit) => [...acc, acc[acc.length - 1] + profit],
    [startingEquity],
  )
  const cumNetProfit = netProfit.reduce<number[]>((acc, profit, index) => {
    if (index === 0) return [profit]
    return [...acc, acc[index - 1] + profit]
  }, [])

  return {
    dates: [startingDate, ...dates],
    equity,
    netProfit,
    cumNetProfit,
    startingEquity,
    zScores: safeZScores(netProfit),
  }
}

export const summarizePerformance = (
  trades: PerformanceTrade[],
): PerformanceSummary => {
  const closed = trades.filter((trade) => trade.status === 'closed')
  const open = trades.filter((trade) => trade.status === 'open')
  const wins = closed.filter((trade) => trade.realizedPnl > 0)
  const losses = closed.filter((trade) => trade.realizedPnl < 0)
  const realizedPnl = closed.reduce((sum, trade) => sum + trade.realizedPnl, 0)
  const unrealizedPnlTotal = open.reduce(
    (sum, trade) => sum + numberOrZero(trade.unrealizedPnl),
    0,
  )
  const grossProfit = wins.reduce((sum, trade) => sum + trade.realizedPnl, 0)
  const grossLoss = Math.abs(
    losses.reduce((sum, trade) => sum + trade.realizedPnl, 0),
  )
  const averageWin = wins.length > 0 ? grossProfit / wins.length : 0
  const averageLoss = losses.length > 0 ? grossLoss / losses.length : 0
  const closedPnl = closed.map((trade) => trade.realizedPnl)

  return {
    totalTrades: trades.length,
    closedTrades: closed.length,
    openTrades: open.length,
    winningTrades: wins.length,
    losingTrades: losses.length,
    winRate: closed.length > 0 ? wins.length / closed.length : 0,
    realizedPnl,
    unrealizedPnl: unrealizedPnlTotal,
    totalPnl: realizedPnl + unrealizedPnlTotal,
    grossProfit,
    grossLoss,
    profitFactor:
      grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    averageWin,
    averageLoss,
    expectancy:
      closed.length > 0
        ? (wins.length / closed.length) * averageWin -
          (losses.length / closed.length) * averageLoss
        : 0,
    averageTradePnl: closed.length > 0 ? realizedPnl / closed.length : 0,
    bestTrade: closedPnl.length > 0 ? Math.max(...closedPnl) : 0,
    worstTrade: closedPnl.length > 0 ? Math.min(...closedPnl) : 0,
  }
}
