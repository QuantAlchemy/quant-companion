import { useMemo } from 'react'

import Plot from '@/components/Plot'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { currencyFormatter, percentageFormatter } from '@/lib/format'
import { unrealizedPnl } from '@/lib/performance'
import { PROFIT_LOSS_COLORS, profitLossColor } from '@/lib/colors'
import { createLayout } from '@/lib/plotly'
import { cn } from '@/lib/utils'

import type { PlotData } from 'plotly.js'
import type { JournalTrade } from '@/lib/journal'

interface JournalStatsProps {
  trades: JournalTrade[]
  prices: Record<string, number>
}

function StatCard({
  label,
  value,
  sub,
  footnote,
  tone,
}: {
  label: string
  value: string
  sub?: string
  footnote?: string
  tone?: 'profit' | 'loss' | null
}) {
  return (
    <div className="panel min-h-30 px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          'tabular mt-1 text-2xl font-semibold',
          tone === 'profit' && 'text-profit',
          tone === 'loss' && 'text-loss',
        )}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      {footnote && (
        <div className="text-xs text-muted-foreground">{footnote}</div>
      )}
    </div>
  )
}

const valueTone = (value: number) => (value >= 0 ? 'profit' : 'loss')

const formatPercentNumber = (value: number, digits = 2) =>
  `${value.toFixed(digits)}%`

const holdingDays = (trade: JournalTrade) => {
  const exit = new Date(trade.closingDate ?? trade.tradeDate).getTime()
  const entry = new Date(trade.tradeDate).getTime()
  return Number.isFinite(exit) && Number.isFinite(entry)
    ? (exit - entry) / 86_400_000
    : 0
}

const riskAmountFor = (trade: JournalTrade) =>
  trade.price * trade.quantity * 0.01

const rMultipleFor = (trade: JournalTrade) => {
  const riskAmount = riskAmountFor(trade)
  return riskAmount > 0 ? (trade.realizedPnl ?? 0) / riskAmount : 0
}

export function JournalStats({ trades, prices }: JournalStatsProps) {
  const stats = useMemo(() => {
    const closed = trades.filter(
      (t) => t.status === 'closed' && t.realizedPnl != null,
    )
    const open = trades.filter((t) => t.status === 'open')

    const wins = closed.filter((t) => (t.realizedPnl ?? 0) > 0)
    const losses = closed.filter((t) => (t.realizedPnl ?? 0) < 0)
    const winRate = closed.length > 0 ? wins.length / closed.length : 0

    const realizedPnlTotal = closed.reduce(
      (sum, t) => sum + (t.realizedPnl ?? 0),
      0,
    )
    const unrealizedPnlTotal = open.reduce(
      (sum, t) => sum + (unrealizedPnl(t, prices) ?? 0),
      0,
    )
    const grossProfit = wins.reduce((sum, t) => sum + (t.realizedPnl ?? 0), 0)
    const grossLoss = Math.abs(
      losses.reduce((sum, t) => sum + (t.realizedPnl ?? 0), 0),
    )
    const profitFactor =
      grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0
    const avgWin = wins.length > 0 ? grossProfit / wins.length : 0
    const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0
    const lossRate = closed.length > 0 ? losses.length / closed.length : 0
    const expectancy =
      closed.length > 0 ? winRate * avgWin - lossRate * avgLoss : 0
    const closedCostBasis = closed.reduce(
      (sum, t) => sum + t.price * t.quantity,
      0,
    )
    const avgDollarAtWork =
      closed.length > 0 ? closedCostBasis / closed.length : 0
    const openCostBasis = open.reduce((sum, t) => sum + t.price * t.quantity, 0)
    const openMarketValue = openCostBasis + unrealizedPnlTotal
    const expectancyPct =
      avgDollarAtWork > 0 ? (expectancy / avgDollarAtWork) * 100 : 0
    const unrealizedPct =
      openCostBasis > 0 ? (unrealizedPnlTotal / openCostBasis) * 100 : 0
    const totalPnlPct =
      closedCostBasis > 0 ? (realizedPnlTotal / closedCostBasis) * 100 : 0
    const rMultiples = closed.map(rMultipleFor)
    const avgRMultiple =
      rMultiples.length > 0
        ? rMultiples.reduce((sum, r) => sum + r, 0) / rMultiples.length
        : 0
    const longTermPnl = closed
      .filter((t) => holdingDays(t) >= 365)
      .reduce((sum, t) => sum + (t.realizedPnl ?? 0), 0)
    const shortTermPnl = closed
      .filter((t) => holdingDays(t) < 365)
      .reduce((sum, t) => sum + (t.realizedPnl ?? 0), 0)
    const assetPerformance = [
      ...closed
        .reduce((assetMap, trade) => {
          const current = assetMap.get(trade.assetName) ?? { pnl: 0, trades: 0 }
          current.pnl += trade.realizedPnl ?? 0
          current.trades += 1
          assetMap.set(trade.assetName, current)
          return assetMap
        }, new Map<string, { pnl: number; trades: number }>())
        .entries(),
    ]
      .map(([asset, data]) => ({
        asset,
        pnl: data.pnl,
        trades: data.trades,
        avgPnl: data.trades > 0 ? data.pnl / data.trades : 0,
      }))
      .sort((a, b) => b.pnl - a.pnl)

    return {
      closed,
      open,
      wins,
      losses,
      winRate,
      realizedPnlTotal,
      unrealizedPnlTotal,
      profitFactor,
      avgWin,
      avgLoss,
      expectancy,
      expectancyPct,
      unrealizedPct,
      totalPnlPct,
      avgDollarAtWork,
      openCostBasis,
      openMarketValue,
      avgRMultiple,
      longTermPnl,
      shortTermPnl,
      assetPerformance,
    }
  }, [trades, prices])

  const equityCurve = useMemo<Partial<PlotData>[]>(() => {
    const sorted = [...stats.closed].sort(
      (a, b) =>
        new Date(a.closingDate ?? a.tradeDate).getTime() -
        new Date(b.closingDate ?? b.tradeDate).getTime(),
    )
    let cumulative = 0
    const x: string[] = []
    const y: number[] = []
    for (const t of sorted) {
      cumulative += t.realizedPnl ?? 0
      x.push((t.closingDate ?? t.tradeDate).slice(0, 10))
      y.push(cumulative)
    }
    return [
      {
        x,
        y,
        type: 'scatter',
        name: 'Realized P&L',
        line: { color: '#7C5CFF', width: 2 },
        fill: 'tozeroy',
        fillcolor: 'rgba(124, 92, 255, 0.08)',
      },
    ]
  }, [stats.closed])

  const monthlyBars = useMemo<Partial<PlotData>[]>(() => {
    const monthly = new Map<string, number>()
    for (const t of stats.closed) {
      const month = (t.closingDate ?? t.tradeDate).slice(0, 7)
      monthly.set(month, (monthly.get(month) ?? 0) + (t.realizedPnl ?? 0))
    }
    const months = [...monthly.keys()].sort()
    const values = months.map((m) => monthly.get(m) ?? 0)
    return [
      {
        x: months,
        y: values,
        type: 'bar',
        name: 'Monthly P&L',
        marker: {
          color: values.map(profitLossColor),
        },
      },
    ]
  }, [stats.closed])

  const rMultipleBars = useMemo<Partial<PlotData>[]>(() => {
    const y = stats.closed.map(rMultipleFor)
    return [
      {
        x: stats.closed.map((_, index) => index + 1),
        y,
        type: 'bar',
        name: 'R-Multiple',
        marker: {
          color: y.map(profitLossColor),
        },
        hovertemplate: 'Trade #%{x}<br>%{y:.2f}R<extra></extra>',
      },
    ]
  }, [stats.closed])

  const winLossPie = useMemo<Partial<PlotData>[]>(
    () => [
      {
        values: [stats.wins.length, stats.losses.length],
        labels: ['Wins', 'Losses'],
        type: 'pie',
        marker: {
          colors: [PROFIT_LOSS_COLORS.profit, PROFIT_LOSS_COLORS.loss],
        },
        textinfo: 'label+percent',
        hovertemplate: '%{label}: %{value}<extra></extra>',
        sort: false,
      },
    ],
    [stats.wins.length, stats.losses.length],
  )

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Expectancy"
          value={formatPercentNumber(stats.expectancyPct)}
          sub={currencyFormatter.format(stats.expectancy)}
          footnote="Per trade expected value"
          tone={valueTone(stats.expectancy)}
        />
        <StatCard
          label="R-Multiple"
          value={`${stats.avgRMultiple.toFixed(2)}R`}
          footnote="Average risk multiple"
          tone={valueTone(stats.avgRMultiple)}
        />
        <StatCard
          label="Unrealized P&L"
          value={formatPercentNumber(stats.unrealizedPct)}
          sub={currencyFormatter.format(stats.unrealizedPnlTotal)}
          footnote="Current open positions"
          tone={valueTone(stats.unrealizedPnlTotal)}
        />
        <StatCard
          label="Total P&L"
          value={formatPercentNumber(stats.totalPnlPct)}
          sub={currencyFormatter.format(stats.realizedPnlTotal)}
          footnote="All closed trades"
          tone={valueTone(stats.realizedPnlTotal)}
        />
        <StatCard
          label="Win rate"
          value={percentageFormatter.format(stats.winRate)}
          sub={`${stats.wins.length}W / ${stats.losses.length}L`}
          tone={stats.winRate >= 0.5 ? 'profit' : 'loss'}
        />
        <StatCard
          label="Profit factor"
          value={
            Number.isFinite(stats.profitFactor)
              ? stats.profitFactor.toFixed(2)
              : '∞'
          }
        />
        <StatCard
          label="Avg win / loss"
          value={`${currencyFormatter.format(stats.avgWin)} / ${currencyFormatter.format(-stats.avgLoss)}`}
        />
        <StatCard
          label="Avg $ at Work"
          value={currencyFormatter.format(stats.avgDollarAtWork)}
          footnote="Average position size"
        />
      </div>

      {stats.closed.length > 0 && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card className="panel">
            <CardHeader>
              <CardTitle>Realized Equity Curve</CardTitle>
            </CardHeader>
            <CardContent>
              <Plot
                data={equityCurve}
                layout={createLayout()}
                style={{ width: '100%', height: 320 }}
              />
            </CardContent>
          </Card>
          <Card className="panel">
            <CardHeader>
              <CardTitle>R-Multiple per Trade</CardTitle>
            </CardHeader>
            <CardContent>
              <Plot
                data={rMultipleBars}
                layout={createLayout()}
                style={{ width: '100%', height: 320 }}
              />
            </CardContent>
          </Card>
          <Card className="panel">
            <CardHeader>
              <CardTitle>Monthly P&L</CardTitle>
            </CardHeader>
            <CardContent>
              <Plot
                data={monthlyBars}
                layout={createLayout()}
                style={{ width: '100%', height: 320 }}
              />
            </CardContent>
          </Card>
          <Card className="panel">
            <CardHeader>
              <CardTitle>Win/Loss Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <Plot
                data={winLossPie}
                layout={{
                  ...createLayout(),
                  showlegend: false,
                  margin: { t: 16, r: 16, b: 16, l: 16 },
                }}
                style={{ width: '100%', height: 320 }}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {stats.assetPerformance.length > 0 && (
        <Card className="panel">
          <CardHeader>
            <CardTitle>Performance by Asset</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted">
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Total P&L</TableHead>
                    <TableHead>Trades</TableHead>
                    <TableHead>Avg P&L/Trade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.assetPerformance.map((asset) => (
                    <TableRow key={asset.asset}>
                      <TableCell className="font-mono font-semibold">
                        {asset.asset}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'tabular font-semibold',
                          asset.pnl >= 0 ? 'text-profit' : 'text-loss',
                        )}
                      >
                        {currencyFormatter.format(asset.pnl)}
                      </TableCell>
                      <TableCell className="tabular">{asset.trades}</TableCell>
                      <TableCell
                        className={cn(
                          'tabular font-semibold',
                          asset.avgPnl >= 0 ? 'text-profit' : 'text-loss',
                        )}
                      >
                        {currencyFormatter.format(asset.avgPnl)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {(stats.open.length > 0 || stats.closed.length > 0) && (
        <Card className="panel">
          <CardHeader>
            <CardTitle>Portfolio Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-base md:text-lg">
              <div>
                Cost Basis (Open):{' '}
                <span className="tabular font-semibold">
                  {currencyFormatter.format(stats.openCostBasis)}
                </span>
              </div>
              <div>
                Market Value (Open):{' '}
                <span className="tabular font-semibold">
                  {currencyFormatter.format(stats.openMarketValue)}
                </span>
              </div>
              <div
                className={
                  stats.unrealizedPnlTotal >= 0 ? 'text-profit' : 'text-loss'
                }
              >
                Unrealized P&L (Open):{' '}
                <span className="tabular font-semibold">
                  {currencyFormatter.format(stats.unrealizedPnlTotal)}
                </span>
              </div>
              <div
                className={
                  stats.realizedPnlTotal >= 0 ? 'text-profit' : 'text-loss'
                }
              >
                Realized P&L (Closed):{' '}
                <span className="tabular font-semibold">
                  {currencyFormatter.format(stats.realizedPnlTotal)}
                </span>
              </div>
              <div
                className={stats.longTermPnl >= 0 ? 'text-profit' : 'text-loss'}
              >
                Long-term Gains/Losses:{' '}
                <span className="tabular font-semibold">
                  {currencyFormatter.format(stats.longTermPnl)}
                </span>
              </div>
              <div
                className={
                  stats.shortTermPnl >= 0 ? 'text-profit' : 'text-loss'
                }
              >
                Short-term Gains/Losses:{' '}
                <span className="tabular font-semibold">
                  {currencyFormatter.format(stats.shortTermPnl)}
                </span>
              </div>
            </div>
            <div className="mt-5 grid gap-3 border-t border-border pt-4 md:grid-cols-2">
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-xs text-muted-foreground">Open Trades</div>
                <div className="tabular mt-1 text-xl font-semibold text-sky">
                  {stats.open.length}
                </div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-xs text-muted-foreground">
                  Closed Trades
                </div>
                <div className="tabular mt-1 text-xl font-semibold">
                  {stats.closed.length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default JournalStats
