import { createEffect, createSignal } from 'solid-js'
// import { Info } from 'lucide-solid'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
// import { Checkbox, CheckboxControl, CheckboxLabel } from '@/components/ui/checkbox'
// import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { NumberInput } from '@/components/ui/NumberInput'
import MonteCarloChart from '@/components/charts/MonteCarlo'
import { setMonteCarloData, simulations } from '@/libs/monteCarlo'

import type { Component } from 'solid-js'
import type { TradeMetrics } from '@/libs/stats'

interface CardProps {
  data: TradeMetrics | null
}

export const MonteCarloCard: Component<CardProps> = (props) => {
  const [trials, setTrials] = createSignal(100)
  const [futurePoints, setFuturePoints] = createSignal(100)
  // const [staticPoints, setStaticPoints] = createSignal(false)

  const handleMonteCarloData = () => {
    const simulationResult = simulations(
      props.data?.netProfit ?? [],
      trials(),
      futurePoints(),
      props.data?.startingEquity
    )
    setMonteCarloData(() => simulationResult)
  }

  createEffect(() => {
    handleMonteCarloData()
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monte Carlo</CardTitle>
        <div class="flex flex-row justify-end gap-2">
          <NumberInput
            id="trials"
            label="Trials"
            min={1}
            value={trials()}
            onInput={(e) => setTrials(Number((e.target as HTMLInputElement).value))}
          />
          <NumberInput
            id="futurePoints"
            label="Future Points"
            min={1}
            value={futurePoints()}
            onInput={(e) => setFuturePoints(Number((e.target as HTMLInputElement).value))}
          />

          {/* <Checkbox
            checked={staticPoints()}
            onChange={(checked: boolean) => setStaticPoints(checked)}
          >
            <CheckboxControl />
            <CheckboxLabel>Static Points</CheckboxLabel>
          </Checkbox> */}

          {/* <Tooltip>
            <TooltipTrigger class="self-start">
              <Info />
            </TooltipTrigger>
            <TooltipContent>
              <p>
                The x-axis will apply future dates based on the average dates in the trade data
                provided.
              </p>
            </TooltipContent>
          </Tooltip> */}
        </div>
      </CardHeader>
      <CardContent>
        <MonteCarloChart
          data={props.data}
          // staticPoints={staticPoints()}
        />
      </CardContent>
    </Card>
  )
}

export default MonteCarloCard
