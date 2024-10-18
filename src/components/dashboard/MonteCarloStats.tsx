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
import { calculateMonteCarloStats } from '@/libs/monteCarlo'
import { camelToPascalWithSpace, currencyFormatter, percentageFormatter } from '@/libs/format'
import { monteCarloData } from '@/libs/monteCarlo'

import type { Component } from 'solid-js'
import type { TradeMetrics } from '@/libs/stats'
import type { MonteCarloSummaryStats } from '@/libs/monteCarlo'

interface Props {
  data: TradeMetrics | null
}

const formatStatLabel = (key: string): string => {
  switch (key) {
    case 'positiveRuns':
      return 'Positive Runs'
    case 'negativeRuns':
      return 'Negative Runs'
    case 'successRate':
      return 'Success Rate'
    case 'maxDrawdown':
      return 'Max Drawdown'
    case 'maxDrawdownPercent':
      return 'Max Drawdown %'
    case 'maxDrawdownCombined':
      return 'Max Drawdown'
    case 'maxEquity':
      return 'Max Equity'
    case 'minEquity':
      return 'Min Equity'
    case 'maxEquityPercent':
      return 'Max Equity %'
    case 'minEquityPercent':
      return 'Min Equity %'
    case 'maxEquityCombined':
      return 'Max Equity'
    case 'minEquityCombined':
      return 'Min Equity'
    default:
      return camelToPascalWithSpace(key)
  }
}
const formatStatValue = (key: string, value: number, stats: MonteCarloSummaryStats): string => {
  if (typeof value !== 'number') return String(value)

  switch (key) {
    case 'positiveRuns':
    case 'negativeRuns':
      return value.toString()
    case 'successRate':
    case 'maxDrawdownPercent':
    case 'maxEquityPercent':
    case 'minEquityPercent':
      return percentageFormatter.format(value)
    case 'maxEquityCombined': {
      const equity = currencyFormatter.format(stats.maxEquity ?? 0)
      const equityPct = percentageFormatter.format(stats.maxEquityPercent ?? 0)
      return `${equity} / ${equityPct}`
    }
    case 'minEquityCombined': {
      const equity = currencyFormatter.format(stats.minEquity ?? 0)
      const equityPct = percentageFormatter.format(stats.minEquityPercent ?? 0)
      return `${equity} / ${equityPct}`
    }
    case 'maxDrawdownCombined': {
      const drawdown = currencyFormatter.format(stats.maxDrawdown ?? 0)
      const drawdownPct = percentageFormatter.format(stats.maxDrawdownPercent ?? 0)
      return `${drawdown} / ${drawdownPct}`
    }
    case 'maxDrawdown':
    default:
      return currencyFormatter.format(value)
  }
}

export const MonteCarloStats: Component<Props> = (props) => {
  const stats = () => calculateMonteCarloStats(monteCarloData())

  // Process stats data to combine specific stats (maxDrawdown and maxDrawdownPercent) into a single row
  const processedStats = () => {
    const statsData = stats() || {}
    return Object.entries(statsData).reduce((acc: [string, number][], [key, value]) => {
      if (key === 'maxDrawdown') {
        acc.push(['maxDrawdownCombined', value])
      } else if (key === 'maxEquity') {
        acc.push(['maxEquityCombined', value])
      } else if (key === 'minEquity') {
        acc.push(['minEquityCombined', value])
      } else if (
        key !== 'maxDrawdownPercent' &&
        key !== 'maxEquityPercent' &&
        key !== 'minEquityPercent'
      ) {
        acc.push([key, value])
      }
      return acc
    }, [])
  }

  return (
    <Table>
      {/* <TableCaption>Monte Carlo Statistics</TableCaption> */}
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

export default MonteCarloStats
