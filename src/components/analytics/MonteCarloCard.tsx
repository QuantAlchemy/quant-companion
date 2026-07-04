import { useCallback, useEffect, useState } from 'react'

import MonteCarloChart from '@/components/analytics/charts/MonteCarlo'
import NumberField from '@/components/NumberField'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { award } from '@/lib/gamification'
import { monteCarloDataStore, simulations } from '@/lib/monteCarlo'

import type { TradeMetrics } from '@/lib/stats'

interface CardProps {
  data: TradeMetrics | null
}

export function MonteCarloCard({ data }: CardProps) {
  const [trials, setTrials] = useState(100)
  const [futurePoints, setFuturePoints] = useState(100)
  const [highRunsCnt, setHighRunsCnt] = useState(0)
  const [lowRunsCnt, setLowRunsCnt] = useState(0)

  const runSimulation = useCallback(() => {
    let simulationResult = simulations(
      data?.netProfit ?? [],
      trials,
      futurePoints,
      data?.startingEquity
    )
    // results are sorted by final equity, so trimming best/worst is a slice
    simulationResult = simulationResult.slice(highRunsCnt)
    simulationResult = simulationResult.slice(
      0,
      simulationResult.length - lowRunsCnt
    )
    monteCarloDataStore.setState(() => simulationResult)
  }, [data, trials, futurePoints, highRunsCnt, lowRunsCnt])

  useEffect(() => {
    if (!data) return
    runSimulation()
  }, [data, runSimulation])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monte Carlo</CardTitle>
        <div className="flex flex-row flex-wrap justify-end gap-2 pt-2">
          <NumberField label="Trials" min={1} value={trials} onValueChange={setTrials} />
          <NumberField
            label="Future Points"
            min={1}
            value={futurePoints}
            onValueChange={setFuturePoints}
          />
          <NumberField
            className="w-36"
            label="Remove Best Trials"
            min={0}
            value={highRunsCnt}
            onValueChange={setHighRunsCnt}
          />
          <NumberField
            className="w-36"
            label="Remove Worst Trials"
            min={0}
            value={lowRunsCnt}
            onValueChange={setLowRunsCnt}
          />
          <Button
            className="self-end"
            onClick={() => {
              runSimulation()
              award('monte-carlo-run')
            }}
          >
            Rerun
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <MonteCarloChart data={data} />
      </CardContent>
    </Card>
  )
}

export default MonteCarloCard
