import { createEffect, createSignal } from 'solid-js'
// import { Info } from 'lucide-solid'
import { Button } from '@/components/ui/button'
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
  const [highRunsCnt, setHighRunsCnt] = createSignal(0)
  const [lowRunsCnt, setLowRunsCnt] = createSignal(0)
  // const [staticPoints, setStaticPoints] = createSignal(false)

  const handleMonteCarloData = () => {
    let simulationResult = simulations(
      props.data?.netProfit ?? [],
      trials(),
      futurePoints(),
      props.data?.startingEquity
    )
    // the data is already sorted by the last number in the array
    // so we can just slice the array to remove the high and low points
    // Slice off the high points (remove from the end)
    const removeHigh = highRunsCnt()
    // const highRemoved = simulationResult.slice(0, removeHigh)
    simulationResult = simulationResult.slice(removeHigh)

    // Slice off the low points (remove from the start)
    const removeLow = lowRunsCnt()
    // const lowRemoved = simulationResult.slice(simulationResult.length - removeLow)
    simulationResult = simulationResult.slice(0, simulationResult.length - removeLow)

    // INFO: validation of high/low points
    // console.log(`Removed high/low points (last values):`)
    // const currentHighPointSimulation = simulationResult[0]
    // const currentHighPoint = currentHighPointSimulation[currentHighPointSimulation.length - 1]
    // const currentLowPointSimulation = simulationResult[simulationResult.length - 1]
    // const currentLowPoint = currentLowPointSimulation[currentLowPointSimulation.length - 1]
    // const lastHighsRemoved = highRemoved.map((simulation) => {
    //   const lastValue = simulation[simulation.length - 1]
    //   return { value: lastValue, label: 'High' }
    // })

    // const lastLowsRemoved = lowRemoved.map((simulation) => {
    //   const lastValue = simulation[simulation.length - 1]
    //   return { value: lastValue, label: 'Low' }
    // })
    // console.table([
    //   ...lastHighsRemoved,
    //   ...lastLowsRemoved,
    //   { value: currentHighPoint, label: 'Current High' },
    //   { value: currentLowPoint, label: 'Current Low' },
    // ])

    // console.log(simulationResult[0][0], simulationResult[0][simulationResult[0].length - 1])
    setMonteCarloData(() => simulationResult)
  }

  createEffect(() => {
    handleMonteCarloData()
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monte Carlo</CardTitle>
        <div class="flex flex-wrap flex-row justify-end gap-2">
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
          <NumberInput
            class="w-36"
            id="removeHighRuns"
            label="Remove Best Trials"
            min={0}
            value={highRunsCnt()}
            onInput={(e) => setHighRunsCnt(Number((e.target as HTMLInputElement).value))}
          />
          <NumberInput
            class="w-36"
            id="removeLowRuns"
            label="Remove Worst Trials"
            min={0}
            value={lowRunsCnt()}
            onInput={(e) => setLowRunsCnt(Number((e.target as HTMLInputElement).value))}
          />
          <Button
            class="self-end"
            style={{ 'margin-bottom': '0.3rem' }}
            variant="default"
            onClick={() => handleMonteCarloData()}
          >
            Rerun
          </Button>

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
