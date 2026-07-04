import { useStore } from '@tanstack/react-store'

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
import { calculateMonteCarloStats, monteCarloDataStore } from '@/lib/monteCarlo'

import type { ReactNode } from 'react'
import type { MonteCarloSummaryStats } from '@/lib/monteCarlo'
import type { TradeMetrics } from '@/lib/stats'

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
    case 'maxDrawdownCombined':
      return 'Max Drawdown'
    case 'minDrawdownCombined':
      return 'Min Drawdown'
    case 'maxEquityCombined':
      return 'Max Equity'
    case 'minEquityCombined':
      return 'Min Equity'
    default:
      return camelToPascalWithSpace(key)
  }
}

const combined = (main: string, sub: string): ReactNode => (
  <>
    <div>{main}</div>
    <div className="text-xs text-muted-foreground">{sub}</div>
  </>
)

const formatStatValue = (
  key: string,
  value: number,
  stats: MonteCarloSummaryStats
): ReactNode => {
  if (typeof value !== 'number') return String(value)

  switch (key) {
    case 'positiveRuns':
    case 'negativeRuns':
      return value.toString()
    case 'successRate':
      return percentageFormatter.format(value)
    case 'maxEquityCombined':
      return combined(
        currencyFormatter.format(stats.maxEquity),
        percentageFormatter.format(stats.maxEquityPercent)
      )
    case 'minEquityCombined':
      return combined(
        currencyFormatter.format(stats.minEquity),
        percentageFormatter.format(stats.minEquityPercent)
      )
    case 'maxDrawdownCombined':
      return combined(
        currencyFormatter.format(stats.maxDrawdown),
        percentageFormatter.format(stats.maxDrawdownPercent)
      )
    case 'minDrawdownCombined':
      return combined(
        currencyFormatter.format(stats.minDrawdown),
        percentageFormatter.format(stats.minDrawdownPercent)
      )
    default:
      return currencyFormatter.format(value)
  }
}

export function MonteCarloStats({ data }: Props) {
  const monteCarloData = useStore(monteCarloDataStore)

  if (!data || monteCarloData.length === 0) {
    return (
      <p className="py-6 text-sm text-muted-foreground">
        Run a Monte Carlo simulation to see its statistics.
      </p>
    )
  }

  const stats = calculateMonteCarloStats(monteCarloData)

  // Combine value/% pairs into single rows
  const processedStats = Object.entries(stats).reduce(
    (acc: [string, number][], [key, value]) => {
      if (key === 'maxDrawdown') {
        acc.push(['maxDrawdownCombined', value])
      } else if (key === 'minDrawdown') {
        acc.push(['minDrawdownCombined', value])
      } else if (key === 'maxEquity') {
        acc.push(['maxEquityCombined', value])
      } else if (key === 'minEquity') {
        acc.push(['minEquityCombined', value])
      } else if (
        key !== 'maxDrawdownPercent' &&
        key !== 'minDrawdownPercent' &&
        key !== 'maxEquityPercent' &&
        key !== 'minEquityPercent'
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
        {processedStats.map(([key, value]) => (
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

export default MonteCarloStats
