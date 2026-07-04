import { useMemo } from 'react'

import Plot from '@/components/Plot'
import { unrealizedPnl } from '@/components/journal/TradeTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { currencyFormatter, percentageFormatter } from '@/lib/format'
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
  tone,
}: {
  label: string
  value: string
  sub?: string
  tone?: 'profit' | 'loss' | null
}) {
  return (
    <div className="panel px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          'tabular mt-1 text-lg font-semibold',
          tone === 'profit' && 'text-profit',
          tone === 'loss' && 'text-loss'
        )}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  )
}

export function JournalStats({ trades, prices }: JournalStatsProps) {
  const stats = useMemo(() => {
    const closed = trades.filter(
      (t) => t.status === 'closed' && t.realizedPnl != null
    )
    const open = trades.filter((t) => t.status === 'open')

    const wins = closed.filter((t) => (t.realizedPnl ?? 0) > 0)
    const losses = closed.filter((t) => (t.realizedPnl ?? 0) < 0)
    const winRate = closed.length > 0 ? wins.length / closed.length : 0

    const realizedPnlTotal = closed.reduce((sum, t) => sum + (t.realizedPnl ?? 0), 0)
    const unrealizedPnlTotal = open.reduce(
      (sum, t) => sum + (unrealizedPnl(t, prices) ?? 0),
      0
    )
    const grossProfit = wins.reduce((sum, t) => sum + (t.realizedPnl ?? 0), 0)
    const grossLoss = Math.abs(
      losses.reduce((sum, t) => sum + (t.realizedPnl ?? 0), 0)
    )
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0
    const avgWin = wins.length > 0 ? grossProfit / wins.length : 0
    const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0
    const expectancy =
      closed.length > 0
        ? winRate * avgWin - (1 - winRate) * avgLoss
        : 0

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
    }
  }, [trades, prices])

  const equityCurve = useMemo<Partial<PlotData>[]>(() => {
    const sorted = [...stats.closed].sort(
      (a, b) =>
        new Date(a.closingDate ?? a.tradeDate).getTime() -
        new Date(b.closingDate ?? b.tradeDate).getTime()
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
          color: values.map((v) =>
            v >= 0 ? 'rgba(62, 207, 142, 0.75)' : 'rgba(242, 109, 133, 0.75)'
          ),
        },
      },
    ]
  }, [stats.closed])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Win rate"
          value={percentageFormatter.format(stats.winRate)}
          sub={`${stats.wins.length}W / ${stats.losses.length}L of ${stats.closed.length}`}
        />
        <StatCard
          label="Realized P&L"
          value={currencyFormatter.format(stats.realizedPnlTotal)}
          tone={stats.realizedPnlTotal >= 0 ? 'profit' : 'loss'}
        />
        <StatCard
          label="Unrealized P&L"
          value={currencyFormatter.format(stats.unrealizedPnlTotal)}
          sub={`${stats.open.length} open`}
          tone={stats.unrealizedPnlTotal >= 0 ? 'profit' : 'loss'}
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
          label="Expectancy"
          value={currencyFormatter.format(stats.expectancy)}
          sub="per closed trade"
          tone={stats.expectancy >= 0 ? 'profit' : 'loss'}
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
        </div>
      )}
    </div>
  )
}

export default JournalStats
