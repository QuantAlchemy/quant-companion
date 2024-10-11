import { createSignal } from 'solid-js'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { NumberInput } from '@/components/ui/NumberInput'
import MonteCarloChart from '@/components/charts/MonteCarlo'

import type { Component } from 'solid-js'
import type { ProcessedData } from '@/libs/stats'

interface CardProps {
  data: ProcessedData | null
}

export const MonteCarloCard: Component<CardProps> = (props) => {
  const [trials, setTrials] = createSignal(100)
  const [futurePoints, setFuturePoints] = createSignal(100)

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
        </div>
      </CardHeader>
      <CardContent>
        <MonteCarloChart
          data={props.data}
          trials={trials()}
          futurePoints={futurePoints()}
        />
      </CardContent>
    </Card>
  )
}

export default MonteCarloCard
