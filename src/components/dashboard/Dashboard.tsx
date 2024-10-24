import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { Properties } from '@/components/dashboard/Properties'
import EquityChart from '@/components/charts/Equity'
import NetProfitChart from '@/components/charts/NetProfit'
import CumNetProfitChart from '@/components/charts/CumNetProfit'
import {
  ProfitDistributionBox as ProfitDistributionBoxChart,
  ProfitDistributionHist as ProfitDistributionHistChart,
} from '@/components/charts/ProfitDistribution'
import { ZScoreDistributionBox, ZScoreDistributionHist } from '@/components/charts/ZScore'
import ProbabilityConesCard from './ProbabilityConesCard'
import MonteCarloChartCard from './MonteCarloCard'
import MonteCarloStats from './MonteCarloStats'
import TradeDataStats from './TradeDataStats'
import { tradeMetrics } from '@/libs/stats'

const Dashboard = () => {
  return (
    <div>
      {/* <h1 class="text-3xl font-bold mb-4">Dashboard</h1> */}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Properties</CardTitle>
          </CardHeader>
          <CardContent>
            <Properties />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trade Data Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <TradeDataStats data={tradeMetrics()} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monte Carlo Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <MonteCarloStats data={tradeMetrics()} />
          </CardContent>
        </Card>
      </div>

      <div class="grid grid-cols-1 2xl:grid-cols-2 gap-6 mt-6">
        <MonteCarloChartCard data={tradeMetrics()} />

        <Card>
          <CardHeader>
            <CardTitle>Cumulative Net Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <CumNetProfitChart data={tradeMetrics()} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Net Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <NetProfitChart data={tradeMetrics()} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profit Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-0">
              <ProfitDistributionBoxChart data={tradeMetrics()} />
              <ProfitDistributionHistChart data={tradeMetrics()} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Z-Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-0">
              <ZScoreDistributionBox data={tradeMetrics()} />
              <ZScoreDistributionHist data={tradeMetrics()} />
            </div>
          </CardContent>
        </Card>

        {/*
            TODO: plot histogram of sharpe ratio (or other metric) from random price
            plot sharpe ratio (or other metric) from actual price
            the value from the actual price should be an outlier

            1. Generate Random Price Series:
              * Use random walk models or stochastic processes, such as Geometric Brownian Motion (GBM), to simulate price action. This will create a time series of prices that resemble market fluctuations.
            2. Apply Your Trading Strategy:
              * Run your trading strategy on this randomized price data.
              * Record the resulting profit and loss data for each simulation.
            3. Repeat the Simulation:
              * Run the simulation multiple times to create a distribution of profits under random conditions. This gives a range of potential outcomes for your strategy when faced with random price movements.
            4. Compare Distributions:
              * Compare the distribution of profits from the actual data with the distribution of profits from simulated price action.
              * If the actual strategy’s performance significantly deviates from the random simulations, this can suggest that the strategy is indeed effective (not purely a product of random chance).

            Thoughts: It might be possible to do this through a setting in the SKX on TradingView. The web extension would need to control enabling this option and running it multiple times and collecting the data for each run.
          */}
        {/* <Card>
            <CardHeader>
              <CardTitle>Random Profit Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-0">
                <ProfitDistributionBoxChart
                  data={data()}
                />
                <ProfitDistributionHistChart
                  data={data()}
                />
              </div>
            </CardContent>
          </Card> */}

        <ProbabilityConesCard data={tradeMetrics()} />

        <Card>
          <CardHeader>
            <CardTitle>Equity</CardTitle>
          </CardHeader>
          <CardContent>
            <EquityChart data={tradeMetrics()} />
          </CardContent>
        </Card>

        {/*
            TODO: cumulativeProfits table (in code pen)
          */}
      </div>

      <p class="mt-4 text-sm text-gray-500">
        Your data privacy is important to us. All uploaded data is processed locally and is not
        stored on our servers.
      </p>
    </div>
  )
}

export default Dashboard
