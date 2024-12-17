import { For } from 'solid-js'
import {
  Table,
  TableBody,
  // TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { calculateSummaryStats } from '@/libs/stats'
import { camelToPascalWithSpace, currencyFormatter, percentageFormatter } from '@/libs/format'

import type { Component } from 'solid-js'
import type { JSX } from 'solid-js/jsx-runtime'
import type { TradeMetrics, SummaryStats } from '@/libs/stats'

interface Props {
  data: TradeMetrics | null
}

const Divider: Component = () => <span class="text-muted-foreground">/</span>

const formatStatLabel = (key: string): string | JSX.Element => {
  switch (key) {
    case 'totalTrades':
      return 'Total Trades'
    case 'winningTrades':
      return 'Winning Trades'
    case 'losingTrades':
      return 'Losing Trades'
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
    case 'averageProfitWin':
      return 'Average Profit Win'
    case 'averageProfitLoss':
      return 'Average Profit Loss'
    case 'averageProfitWinLoss':
      return (
        <>
          Average Profit Win <Divider /> Loss
        </>
      )
    case 'medianProfit':
      return 'Median Profit'
    case 'medianProfitWin':
      return 'Median Profit Win'
    case 'medianProfitLoss':
      return 'Median Profit Loss'
    case 'medianProfitWinLoss':
      return (
        <>
          Median Profit Win <Divider /> Loss
        </>
      )
    case 'firstStdDev':
      return '1σ Profit'
    case 'secondStdDev':
      return '2σ Profit'
    case 'σCombined':
      return (
        <>
          1σ <Divider /> 2σ Profit
        </>
      )
    case 'maxProfit':
      return 'Max Profit'
    case 'minProfit':
      return 'Min Profit'
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
    case 'maxDrawdown':
      return 'Max Drawdown'
    case 'maxDrawdownPercent':
      return 'Max Drawdown %'
    case 'maxDrawdownCombined':
      return 'Max Drawdown'
    default:
      return camelToPascalWithSpace(key)
  }
}

const formatStatValue = (key: string, value: number, stats: SummaryStats): string | JSX.Element => {
  if (typeof value !== 'number') return String(value)

  switch (key) {
    case 'totalTrades':
    case 'winningTrades':
    case 'losingTrades':
      return value.toString()
    case 'winsLossesCombined': {
      const wins = stats.winningTradesCnt ?? 0
      const losses = stats.losingTradesCnt ?? 0
      return (
        <>
          {wins} <Divider /> {losses}
        </>
      )
    }
    case 'mar':
    case 'netProfitByAvgDrawdown':
    case 'sharpeRatio':
      return (value as number).toFixed(2)
    case 'winRate':
    case 'maxDrawdownPercent':
      return percentageFormatter.format(value)
    case 'maxDrawdownCombined': {
      const drawdown = currencyFormatter.format(stats.maxDrawdown ?? 0)
      const drawdownPct = percentageFormatter.format(stats.maxDrawdownPercent ?? 0)
      return (
        <>
          <div>{drawdown}</div>
          <div class="text-xs">{drawdownPct}</div>
        </>
      )
    }
    case 'averageProfitWinLoss': {
      const avgProfitWin = currencyFormatter.format(stats.averageProfitWin ?? 0)
      const avgProfitLoss = currencyFormatter.format(stats.averageProfitLoss ?? 0)
      return (
        <>
          {avgProfitWin} <Divider /> {avgProfitLoss}
        </>
      )
    }
    case 'medianProfitWinLoss': {
      const medianProfitWin = currencyFormatter.format(stats.medianProfitWin ?? 0)
      const medianProfitLoss = currencyFormatter.format(stats.medianProfitLoss ?? 0)
      return (
        <>
          {medianProfitWin} <Divider /> {medianProfitLoss}
        </>
      )
    }
    case 'σCombined': {
      const firstStdDev = currencyFormatter.format(stats.firstStdDev ?? 0)
      const secondStdDev = currencyFormatter.format(stats.secondStdDev ?? 0)
      return (
        <>
          {firstStdDev} <Divider /> {secondStdDev}
        </>
      )
    }
    case 'maxMinProfitCombined': {
      const maxProfit = currencyFormatter.format(stats.maxProfit ?? 0)
      const minProfit = currencyFormatter.format(stats.minProfit ?? 0)
      return (
        <>
          {maxProfit} <Divider /> {minProfit}
        </>
      )
    }
    case 'totalProfit':
    case 'averageProfit':
    case 'medianProfit':
    case '1σProfit':
    case '2σProfit':
    case 'maxProfit':
    case 'minProfit':
    case 'maxDrawdown':
    default:
      return currencyFormatter.format(value)
  }
}

export const TradeDataStats: Component<Props> = (props) => {
  const stats = () => (props.data ? calculateSummaryStats(props.data) : ({} as SummaryStats))

  // Process stats data to combine specific stats (maxDrawdown and maxDrawdownPercent) into a single row
  const processedStats = () => {
    const statsData = stats() || {}
    return Object.entries(statsData).reduce((acc: [string, number][], [key, value]) => {
      if (key === 'maxDrawdown') {
        acc.push(['maxDrawdownCombined', statsData[key]])
      } else if (key === 'averageProfitWin') {
        acc.push(['averageProfitWinLoss', statsData[key]])
      } else if (key === 'medianProfitWin') {
        acc.push(['medianProfitWinLoss', statsData[key]])
      } else if (key === 'winningTradesCnt') {
        acc.push(['winsLossesCombined', statsData[key]])
      } else if (key === 'firstStdDev') {
        acc.push(['σCombined', statsData[key]])
      } else if (key === 'maxProfit') {
        acc.push(['maxMinProfitCombined', statsData[key]])
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
    }, [])
  }

  return (
    <Table>
      {/* <TableCaption>Trade Data Statistics</TableCaption> */}
      <TableHeader>
        <TableRow>
          <TableHead>Statistic</TableHead>
          <TableHead class="text-right">Value</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <For each={props.data ? processedStats() : []}>
          {(stat) => {
            const key = stat[0]
            const value = stat[1]

            return (
              <TableRow>
                <TableCell class="font-medium">{formatStatLabel(key)}</TableCell>
                <TableCell class="text-right">{formatStatValue(key, value, stats())}</TableCell>
              </TableRow>
            )
          }}
        </For>
      </TableBody>
    </Table>
  )
}

export default TradeDataStats
