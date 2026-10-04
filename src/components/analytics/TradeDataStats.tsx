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
      return (
        <span title="Daily realized-equity log returns on UTC calendar days, including days without closes. Annualized with 365.25 days and a 2% annual risk-free rate. Does not measure daily marked-to-market equity.">
          Sharpe Ratio (realized equity)
        </span>
      )
    case 'maxDrawdownCombined':
      return 'Max Drawdown'
    default:
      return camelToPascalWithSpace(key)
  }
}

const formatCurrency = (value: number | null) =>
  value === null || !Number.isFinite(value)
    ? 'Unavailable'
    : currencyFormatter.format(value)

const formatStatValue = (
  key: string,
  value: number | null,
  stats: SummaryStats,
): ReactNode => {
  switch (key) {
    case 'totalTrades':
      return value?.toString() ?? 'Unavailable'
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
      return value === null || !Number.isFinite(value)
        ? 'Unavailable'
        : value.toFixed(2)
    case 'winRate':
      return value === null || !Number.isFinite(value)
        ? 'Unavailable'
        : percentageFormatter.format(value)
    case 'maxDrawdownCombined': {
      const drawdown = formatCurrency(stats.maxDrawdown)
      const drawdownPct = Number.isFinite(stats.maxDrawdownPercent)
        ? percentageFormatter.format(stats.maxDrawdownPercent)
        : 'Unavailable'
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
          {formatCurrency(stats.averageProfitWin)} <Divider />{' '}
          {formatCurrency(stats.averageProfitLoss)}
        </>
      )
    }
    case 'medianProfitWinLoss': {
      return (
        <>
          {formatCurrency(stats.medianProfitWin)} <Divider />{' '}
          {formatCurrency(stats.medianProfitLoss)}
        </>
      )
    }
    case 'σCombined': {
      return (
        <>
          {formatCurrency(stats.firstStdDev)} <Divider />{' '}
          {formatCurrency(stats.secondStdDev)}
        </>
      )
    }
    case 'maxMinProfitCombined': {
      return (
        <>
          {formatCurrency(stats.maxProfit)} <Divider />{' '}
          {formatCurrency(stats.minProfit)}
        </>
      )
    }
    default:
      return formatCurrency(value)
  }
}

export function TradeDataStats({ data }: Props) {
  if (!data) {
    return (
      <p className="py-6 text-sm text-muted-foreground">
        No trades to analyze. Upload trades or reduce trimming.
      </p>
    )
  }
  const stats = calculateSummaryStats(data)

  // Combine paired stats (win/loss, max/min, σ, drawdown) into single rows
  const processedStats = Object.entries(stats).reduce(
    (acc: [string, number | null][], [key, value]) => {
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
    [],
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
        {processedStats.map(([key, value]) => (
          <TableRow key={key}>
            <TableCell className="font-medium">
              {formatStatLabel(key)}
            </TableCell>
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
