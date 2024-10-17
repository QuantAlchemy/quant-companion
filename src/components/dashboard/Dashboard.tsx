import { createSignal, createEffect } from 'solid-js'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { TextField, TextFieldLabel, TextFieldRoot } from '@/components/ui/textfield'
import EquityChart from '@/components/charts/Equity'
import NetProfitChart from '@/components/charts/NetProfit'
import CumNetProfitChart from '@/components/charts/CumNetProfit'
import {
  ProfitDistributionBox as ProfitDistributionBoxChart,
  ProfitDistributionHist as ProfitDistributionHistChart,
} from '@/components/charts/ProfitDistribution'
import ProbabilityConesCard from './ProbabilityConesCard'
import MonteCarloChartCard from './MonteCarloCard'
import MonteCarloStats from './MonteCarloStats'
import TradeDataStats from './TradeDataStats'
import { simulateTradingViewData, processData, ProcessedData } from '@/libs/stats'

const Dashboard = () => {
  const [data, setData] = createSignal<ProcessedData | null>(null)
  const [startingEquity, setStartingEquity] = createSignal(10000)

  createEffect(() => {
    // Simulate initial data load
    const simulatedData = simulateTradingViewData()
    setData(() => processData(simulatedData, startingEquity()))
  })

  const handleFileUpload = (event: Event) => {
    // Placeholder for file upload functionality
    const input = event.target as HTMLInputElement
    if (input.files) {
      console.log('File uploaded:', input.files[0])
    }
  }

  return (
    <div class="container py-4 px-0">
      <div class="mb-8">
        <h1 class="text-3xl font-bold mb-4">Quant Companion</h1>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Properties</CardTitle>
            </CardHeader>
            <CardContent>
              <TextFieldRoot>
                <TextFieldLabel
                  for="startingEquity"
                  class="mt-4"
                >
                  Starting Equity
                </TextFieldLabel>
                <TextField
                  id="startingEquity"
                  type="number"
                  value={startingEquity()}
                  onInput={(e) => setStartingEquity(Number((e.target as HTMLInputElement).value))}
                  class="mt-2"
                />
              </TextFieldRoot>

              <Button
                as="label"
                class="mt-4"
                variant="default"
              >
                <input
                  type="file"
                  hidden
                  onChange={handleFileUpload}
                />
                Upload Data
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trade Data Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <TradeDataStats data={data()} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Monte Carlo Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <MonteCarloStats data={data()} />
            </CardContent>
          </Card>
        </div>

        <div class="grid grid-cols-1 2xl:grid-cols-2 gap-6 mt-6">
          <MonteCarloChartCard data={data()} />

          <Card>
            <CardHeader>
              <CardTitle>Equity</CardTitle>
            </CardHeader>
            <CardContent>
              <EquityChart data={data()} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Net Profit</CardTitle>
            </CardHeader>
            <CardContent>
              <NetProfitChart data={data()} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cum. Net Profit</CardTitle>
            </CardHeader>
            <CardContent>
              <CumNetProfitChart data={data()} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Profit Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-0">
                <ProfitDistributionBoxChart data={data()} />
                <ProfitDistributionHistChart data={data()} />
              </div>
            </CardContent>
          </Card>

          {/*
            TODO: plot histogram of sharpe ratio (or other metric) from random price
            plot sharpe ratio (or other metric) from actual price
            the value from the actual price should be an outlier
          */}
          {/* <Card>
            <CardHeader>
              <CardTitle>Random Profit Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-0">
                <ProfitDistributionBoxChart
                  data={processData(simulateTradingViewData(), startingEquity())}
                />
                <ProfitDistributionHistChart
                  data={processData(simulateTradingViewData(), startingEquity())}
                />
              </div>
            </CardContent>
          </Card> */}

          <ProbabilityConesCard data={data()} />

          {/*
            TODO: cumulativeProfits table (in code pen)
          */}

          {/*
            TODO: The z-score is the number of standard deviations a value is away from it's mean. It’s a great way to summarize where a value lies on a distribution.
            For example, if you’re 189 cm tall, the z-score of your height might be 2.5. That means you are 2.5 standard deviations away from the mean height of everyone in the distribution.
            The math is simple:
            (value - average value) / standard deviation of values
          */}
        </div>

        <p class="mt-4 text-sm text-gray-500">
          Your data privacy is important to us. All uploaded data is processed locally and is not
          stored on our servers.
        </p>
      </div>
    </div>
  )
}

export default Dashboard
