import { useMemo } from 'react'

import EquityChart from '@/components/analytics/charts/Equity'
import NetProfitChart from '@/components/analytics/charts/NetProfit'
import {
  ProfitDistributionBox,
  ProfitDistributionHist,
} from '@/components/analytics/charts/ProfitDistribution'
import {
  ZScoreDistributionBox,
  ZScoreDistributionHist,
} from '@/components/analytics/charts/ZScore'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { currencyFormatter, percentageFormatter } from '@/lib/format'
import {
  performanceTradesToTradeMetrics,
  summarizePerformance,
} from '@/lib/performance'
import { cn } from '@/lib/utils'

import type { PerformanceTrade } from '@/lib/performance'

interface PerformanceOverviewProps {
  trades: PerformanceTrade[]
  startingEquity: number
  title?: string
  sourceLabel?: string
  className?: string
}

const valueTone = (value: number) =>
  value > 0 ? 'text-profit' : value < 0 ? 'text-loss' : ''

const formatProfitFactor = (value: number) =>
  Number.isFinite(value) ? value.toFixed(2) : '∞'

function MetricTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub?: string
  tone?: number
}) {
  return (
    <div className="min-h-24 rounded-lg border border-border bg-muted/25 px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn('tabular mt-1 text-xl font-semibold', tone != null && valueTone(tone))}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  )
}

export function PerformanceOverview({
  trades,
  startingEquity,
  title = 'Performance Overview',
  sourceLabel = 'Dataset',
  className,
}: PerformanceOverviewProps) {
  const summary = useMemo(() => summarizePerformance(trades), [trades])
  const metrics = useMemo(
    () => performanceTradesToTradeMetrics(trades, startingEquity),
    [startingEquity, trades]
  )
  const hasTrades = summary.totalTrades > 0
  const hasClosedTrades = summary.closedTrades > 0

  return (
    <section className={cn('space-y-4', className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-2xl">{title}</h2>
            <Badge variant="outline">{sourceLabel}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasTrades
              ? `${summary.closedTrades} closed and ${summary.openTrades} open trades`
              : 'No trades in this dataset yet'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Realized P&L"
          value={currencyFormatter.format(summary.realizedPnl)}
          sub={`${summary.closedTrades} closed trades`}
          tone={summary.realizedPnl}
        />
        <MetricTile
          label="Total P&L"
          value={currencyFormatter.format(summary.totalPnl)}
          sub={
            summary.openTrades > 0
              ? `${currencyFormatter.format(summary.unrealizedPnl)} unrealized`
              : 'Closed trades only'
          }
          tone={summary.totalPnl}
        />
        <MetricTile
          label="Win Rate"
          value={percentageFormatter.format(summary.winRate)}
          sub={`${summary.winningTrades} wins / ${summary.losingTrades} losses`}
          tone={summary.winRate - 0.5}
        />
        <MetricTile
          label="Profit Factor"
          value={formatProfitFactor(summary.profitFactor)}
          sub={`Expectancy ${currencyFormatter.format(summary.expectancy)}`}
          tone={summary.profitFactor - 1}
        />
      </div>

      {hasClosedTrades && metrics && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card className="panel">
            <CardHeader>
              <CardTitle>Equity Curve</CardTitle>
            </CardHeader>
            <CardContent>
              <EquityChart data={metrics} />
            </CardContent>
          </Card>
          <Card className="panel">
            <CardHeader>
              <CardTitle>Net Profit by Trade</CardTitle>
            </CardHeader>
            <CardContent>
              <NetProfitChart data={metrics} />
            </CardContent>
          </Card>
          <Card className="panel">
            <CardHeader>
              <CardTitle>Profit Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <ProfitDistributionBox data={metrics} />
                <ProfitDistributionHist data={metrics} />
              </div>
            </CardContent>
          </Card>
          <Card className="panel">
            <CardHeader>
              <CardTitle>Z-Score Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <ZScoreDistributionBox data={metrics} />
                <ZScoreDistributionHist data={metrics} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  )
}

export default PerformanceOverview
