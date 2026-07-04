import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  camelToPascalWithSpace,
  currencyFormatter,
  percentageFormatter,
} from '@/lib/format'
import { calculateSummaryStats } from '@/lib/stats'

import type { ReactNode } from 'react'
import type { SummaryStats, TradeMetrics } from '@/lib/stats'

interface Props {
  data: TradeMetrics | null
}

const Divider = () => <span className="text-muted-foreground">/</span>

const formatStatLabel = (key: string): ReactNode => {
  switch (key) {
    case 'totalTrades':
      return 'Total Trades'
    case 'winsLossesCombined':
      return (
        <>
          Wins <Divider /> Losses
        </>
      )
    case 'winRate':
      return 'Win Rate'
    case 'totalProfit':
      return 'Net Profit'
    case 'averageProfit':
      return 'Average Profit'
    case 'averageProfitWinLoss':
      return (
        <>
          Average Profit Win <Divider /> Loss
        </>
      )
    case 'medianProfit':
      return 'Median Profit'
    case 'medianProfitWinLoss':
      return (
        <>
          Median Profit Win <Divider /> Loss
        </>
      )
    case 'σCombined':
      return (
        <>
          1σ <Divider /> 2σ Profit
        </>
      )
    case 'maxMinProfitCombined':
      return (
        <>
          Max <Divider /> Min Profit
        </>
      )
    case 'mar':
      return 'MAR'
    case 'netProfitByAvgDrawdown':
      return (
        <>
          Profit
          <Divider />
          Drawdown Ratio
        </>
      )
    case 'sharpeRatio':
      return 'Sharpe Ratio'
    case 'maxDrawdownCombined':
      return 'Max Drawdown'
    default:
      return camelToPascalWithSpace(key)
  }
}

const formatStatValue = (
  key: string,
  value: number,
  stats: SummaryStats
): ReactNode => {
  if (typeof value !== 'number') return String(value)

  switch (key) {
    case 'totalTrades':
      return value.toString()
    case 'winsLossesCombined': {
      const wins = stats.winningTradesCnt
      const losses = stats.losingTradesCnt
      return (
        <>
          {wins} <Divider /> {losses}
        </>
      )
    }
    case 'mar':
    case 'netProfitByAvgDrawdown':
    case 'sharpeRatio':
      return value.toFixed(2)
    case 'winRate':
      return percentageFormatter.format(value)
    case 'maxDrawdownCombined': {
      const drawdown = currencyFormatter.format(stats.maxDrawdown)
      const drawdownPct = percentageFormatter.format(stats.maxDrawdownPercent)
      return (
        <>
          <div>{drawdown}</div>
          <div className="text-xs text-muted-foreground">{drawdownPct}</div>
        </>
      )
    }
    case 'averageProfitWinLoss': {
      return (
        <>
          {currencyFormatter.format(stats.averageProfitWin)} <Divider />{' '}
          {currencyFormatter.format(stats.averageProfitLoss)}
        </>
      )
    }
    case 'medianProfitWinLoss': {
      return (
        <>
          {currencyFormatter.format(stats.medianProfitWin)} <Divider />{' '}
          {currencyFormatter.format(stats.medianProfitLoss)}
        </>
      )
    }
    case 'σCombined': {
      return (
        <>
          {currencyFormatter.format(stats.firstStdDev)} <Divider />{' '}
          {currencyFormatter.format(stats.secondStdDev)}
        </>
      )
    }
    case 'maxMinProfitCombined': {
      return (
        <>
          {currencyFormatter.format(stats.maxProfit)} <Divider />{' '}
          {currencyFormatter.format(stats.minProfit)}
        </>
      )
    }
    default:
      return currencyFormatter.format(value)
  }
}

export function TradeDataStats({ data }: Props) {
  const stats = data ? calculateSummaryStats(data) : ({} as SummaryStats)

  // Combine paired stats (win/loss, max/min, σ, drawdown) into single rows
  const processedStats = Object.entries(stats).reduce(
    (acc: [string, number][], [key, value]) => {
      if (key === 'maxDrawdown') {
        acc.push(['maxDrawdownCombined', value])
      } else if (key === 'averageProfitWin') {
        acc.push(['averageProfitWinLoss', value])
      } else if (key === 'medianProfitWin') {
        acc.push(['medianProfitWinLoss', value])
      } else if (key === 'winningTradesCnt') {
        acc.push(['winsLossesCombined', value])
      } else if (key === 'firstStdDev') {
        acc.push(['σCombined', value])
      } else if (key === 'maxProfit') {
        acc.push(['maxMinProfitCombined', value])
      } else if (
        key !== 'maxDrawdownPercent' &&
        key !== 'averageProfitLoss' &&
        key !== 'medianProfitLoss' &&
        key !== 'losingTradesCnt' &&
        key !== 'secondStdDev' &&
        key !== 'minProfit'
      ) {
        acc.push([key, value])
      }
      return acc
    },
    []
  )

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Statistic</TableHead>
          <TableHead className="text-right">Value</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {(data ? processedStats : []).map(([key, value]) => (
          <TableRow key={key}>
            <TableCell className="font-medium">{formatStatLabel(key)}</TableCell>
            <TableCell className="tabular text-right">
              {formatStatValue(key, value, stats)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default TradeDataStats
