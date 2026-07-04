import { createFileRoute } from '@tanstack/react-router'
import { useStore } from '@tanstack/react-store'

import EquityChart from '@/components/analytics/charts/Equity'
import CumNetProfitChart from '@/components/analytics/charts/CumNetProfit'
import NetProfitChart from '@/components/analytics/charts/NetProfit'
import {
  ProfitDistributionBox,
  ProfitDistributionHist,
} from '@/components/analytics/charts/ProfitDistribution'
import {
  ZScoreDistributionBox,
  ZScoreDistributionHist,
} from '@/components/analytics/charts/ZScore'
import MonteCarloCard from '@/components/analytics/MonteCarloCard'
import MonteCarloStats from '@/components/analytics/MonteCarloStats'
import ProbabilityConesCard from '@/components/analytics/ProbabilityConesCard'
import Properties from '@/components/analytics/Properties'
import StrategyInvalidationLab from '@/components/analytics/StrategyInvalidationLab'
import TradeDataStats from '@/components/analytics/TradeDataStats'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { tradeMetricsStore } from '@/lib/stats'
import { seo } from '@/lib/seo'

export const Route = createFileRoute('/analytics')({
  head: () =>
    seo({
      title: 'Strategy Analytics · Quant Companion',
      description:
        'Stress-test TradingView exports: Monte Carlo, probability cones, z-scores, and the Strategy Invalidation Lab.',
      path: '/analytics',
      keywords:
        'trading strategy analytics, monte carlo simulation, probability cones, strategy invalidation, tradingview backtest',
    }),
  component: AnalyticsPage,
})

function AnalyticsPage() {
  const tradeMetrics = useStore(tradeMetricsStore)

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-8 md:px-8">
      <div className="rise-in mb-8 max-w-2xl">
        <p className="kicker">Strategy Performance</p>
        <h1 className="font-display mt-2 text-3xl md:text-4xl">Analytics</h1>
        <p className="mt-2 text-muted-foreground">
          Upload a TradingView export (CSV or XLSX) and stress-test your strategy —
          Monte Carlo, probability cones, and the Invalidation Lab. Everything is
          processed locally in your browser.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="panel panel-hover">
          <CardHeader>
            <CardTitle>Properties</CardTitle>
          </CardHeader>
          <CardContent>
            <Properties />
          </CardContent>
        </Card>

        <Card className="panel panel-hover">
          <CardHeader>
            <CardTitle>Trade Data Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <TradeDataStats data={tradeMetrics} />
          </CardContent>
        </Card>

        <Card className="panel panel-hover">
          <CardHeader>
            <CardTitle>Monte Carlo Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <MonteCarloStats data={tradeMetrics} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 2xl:grid-cols-2">
        <StrategyInvalidationLab />

        <MonteCarloCard data={tradeMetrics} />

        <Card className="panel">
          <CardHeader>
            <CardTitle>Cumulative Net Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <CumNetProfitChart data={tradeMetrics} />
          </CardContent>
        </Card>

        <Card className="panel">
          <CardHeader>
            <CardTitle>Net Profits</CardTitle>
          </CardHeader>
          <CardContent>
            <NetProfitChart data={tradeMetrics} />
          </CardContent>
        </Card>

        <Card className="panel">
          <CardHeader>
            <CardTitle>Profit Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ProfitDistributionBox data={tradeMetrics} />
              <ProfitDistributionHist data={tradeMetrics} />
            </div>
          </CardContent>
        </Card>

        <Card className="panel">
          <CardHeader>
            <CardTitle>Z-Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ZScoreDistributionBox data={tradeMetrics} />
              <ZScoreDistributionHist data={tradeMetrics} />
            </div>
          </CardContent>
        </Card>

        <ProbabilityConesCard data={tradeMetrics} />

        <Card className="panel">
          <CardHeader>
            <CardTitle>Equity</CardTitle>
          </CardHeader>
          <CardContent>
            <EquityChart data={tradeMetrics} />
          </CardContent>
        </Card>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        Your data privacy is important to us. All uploaded data is processed locally and
        is not stored on our servers.
      </p>
    </div>
  )
}
