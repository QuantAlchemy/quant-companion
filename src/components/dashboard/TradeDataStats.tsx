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
import type { ProcessedData, SummaryStats } from '@/libs/stats'

interface Props {
  data: ProcessedData | null
}

const formatStatLabel = (key: string): string => {
  switch (key) {
    case 'totalTrades':
      return 'Total Trades'
    case 'winningTrades':
      return 'Winning Trades'
    case 'losingTrades':
      return 'Losing Trades'
    case 'winsLossesCombined':
      return 'Wins / Losses'
    case 'winRate':
      return 'Win Rate'
    case 'totalProfit':
      return 'Total Profit'
    case 'averageProfit':
      return 'Average Profit'
    case 'medianProfit':
      return 'Median Profit'
    case 'firstStdDev':
      return '1σ Profit'
    case 'secondStdDev':
      return '2σ Profit'
    case 'σCombined':
      return '1σ / 2σ Profit'
    case 'maxProfit':
      return 'Max Profit'
    case 'minProfit':
      return 'Min Profit'
    case 'maxMinProfitCombined':
      return 'Max / Min Profit'
    case 'mar':
      return 'MAR'
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

const formatStatValue = (key: string, value: number, stats: SummaryStats): string => {
  if (typeof value !== 'number') return String(value)

  switch (key) {
    case 'totalTrades':
    case 'winningTrades':
    case 'losingTrades':
      return value.toString()
    case 'winsLossesCombined': {
      const wins = stats.winningTrades ?? 0
      const losses = stats.losingTrades ?? 0
      return `${wins} / ${losses}`
    }
    case 'mar':
    case 'sharpeRatio':
      return (value as number).toFixed(2)
    case 'winRate':
    case 'maxDrawdownPercent':
      return percentageFormatter.format(value)
    case 'maxDrawdownCombined': {
      const drawdown = currencyFormatter.format(stats.maxDrawdown ?? 0)
      const drawdownPct = percentageFormatter.format(stats.maxDrawdownPercent ?? 0)
      return `${drawdown} / ${drawdownPct}`
    }
    case 'σCombined': {
      const firstStdDev = currencyFormatter.format(stats.firstStdDev ?? 0)
      const secondStdDev = currencyFormatter.format(stats.secondStdDev ?? 0)
      return `${firstStdDev} / ${secondStdDev}`
    }
    case 'maxMinProfitCombined': {
      const maxProfit = currencyFormatter.format(stats.maxProfit ?? 0)
      const minProfit = currencyFormatter.format(stats.minProfit ?? 0)
      return `${maxProfit} / ${minProfit}`
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
      } else if (key === 'winningTrades') {
        acc.push(['winsLossesCombined', statsData[key]])
      } else if (key === 'firstStdDev') {
        acc.push(['σCombined', statsData[key]])
      } else if (key === 'maxProfit') {
        acc.push(['maxMinProfitCombined', statsData[key]])
      } else if (
        key !== 'maxDrawdownPercent' &&
        key !== 'losingTrades' &&
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
