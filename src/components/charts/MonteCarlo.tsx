import { createEffect, createMemo, mergeProps } from 'solid-js'
import Plot from 'solid-plotly.js'
import { createLayout } from '@/libs/plotly'
import { averageTimeDelta } from '@/libs/stats'
import { simulations } from '@/libs/monteCarlo'

import type { Component } from 'solid-js'
import type { PlotType, PlotData } from 'plotly.js'
import type { ProcessedData } from '@/libs/stats'
import type { MonteCarloData } from '@/libs/monteCarlo'

/*
  INFO:
  https://kjtradingsystems.com/monte-carlo-probability-cones.html
  This uses a process called “sampling with replacement”.
  Each trade in the backtest can be chosen numerous times, based on the random selection process.
  Some trades may not be chosen at all. This leads to a wide range of ending equity values.
  If “sampling without replacement” was used, then eventually all equity curves would converge to a common end point,
  since each backtest trade was used once and only once).
*/

interface ChartProps {
  data: Pick<ProcessedData, 'dates' | 'netProfit' | 'startingEquity'> | null
  futurePoints?: number
  trials?: number
  staticPoints?: boolean
}

const sortArraysByLastNumberDescending = (arrays: MonteCarloData['monteCarloY']) => {
  return arrays.sort((a, b) => {
    const lastA = a.length > 0 ? a[a.length - 1] : Infinity
    const lastB = b.length > 0 ? b[b.length - 1] : Infinity
    return lastB - lastA
  })
}

const formatMonteCarloData = (
  simulation: number[],
  name: string,
  dates: Date[] = [],
  params: Partial<PlotData> = {}
) => {
  // If dates are provided, use them to create x-axis points that are date relative
  const lastHistoricalDate = dates[dates.length - 1]
  const xAxis = dates.length
    ? simulation.map((_, i) => {
        if (i === 0) return lastHistoricalDate
        return new Date(lastHistoricalDate.getTime() + i * averageTimeDelta(dates))
      })
    : simulation.map((_, i) => i)
  return {
    name: name,
    type: 'scatter' as PlotType,
    x: xAxis,
    y: simulation,
    ...params,
  }
}

export const MonteCarlo: Component<ChartProps> = (props) => {
  // eslint-disable-next-line solid/reactivity
  props = mergeProps(
    {
      trials: 100,
      futurePoints: 100,
      staticPoints: true,
    },
    props
  )

  const layout = createMemo(() => createLayout())

  const plotData = createMemo<Partial<Plotly.PlotData>[]>(() => {
    let monteCarloData = simulations(
      props.data?.netProfit ?? [],
      props.trials,
      props.futurePoints,
      props.data?.startingEquity
    )
    monteCarloData = sortArraysByLastNumberDescending(monteCarloData)
    const data = monteCarloData.map((simulation, i) =>
      formatMonteCarloData(
        simulation,
        `simulation ${i + 1}`,
        props.staticPoints ? undefined : props.data?.dates
      )
    )
    return data
  })

  return (
    <Plot
      data={plotData()}
      layout={layout()}
      useResizeHandler={true}
    />
  )
}

export default MonteCarlo
