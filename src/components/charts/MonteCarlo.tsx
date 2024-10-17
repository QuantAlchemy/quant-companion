import { createMemo, mergeProps } from 'solid-js'
import Plot from 'solid-plotly.js'
import { createLayout } from '@/libs/plotly'
import { averageTimeDelta, averageOfArrays } from '@/libs/stats'
import { monteCarloData } from '@/libs/monteCarlo'

import type { Component } from 'solid-js'
import type { PlotType, PlotData } from 'plotly.js'
import type { ProcessedData } from '@/libs/stats'
import type { MonteCarloData } from '@/libs/monteCarlo'

interface ChartProps {
  data: Pick<ProcessedData, 'dates' | 'netProfit' | 'startingEquity'> | null
  staticPoints?: boolean
}

const sortArraysByLastNumberDescending = (arrays: MonteCarloData) => {
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
      staticPoints: true,
    },
    props
  )

  const layout = createMemo(() => createLayout())

  const plotData = createMemo<Partial<Plotly.PlotData>[]>(() => {
    const sortedMonteCarloData = sortArraysByLastNumberDescending(monteCarloData())
    const data = sortedMonteCarloData.map((simulation: number[], i: number) =>
      formatMonteCarloData(
        simulation,
        `run ${i + 1}`,
        props.staticPoints ? undefined : props.data?.dates
      )
    )
    const averageMonteCarlo = averageOfArrays(sortedMonteCarloData)
    const avgPlotData = formatMonteCarloData(averageMonteCarlo, 'average', undefined, {
      line: {
        color: 'rgba(0, 0, 0, 0.6)',
        width: 3,
      },
    })
    return [...data, avgPlotData]
  })

  return (
    <Plot
      data={plotData()}
      layout={layout()}
      useResizeHandler={true}
      config={{ displayModeBar: false }}
    />
  )
}

export default MonteCarlo
