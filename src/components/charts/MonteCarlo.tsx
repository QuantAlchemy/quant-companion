import { createMemo, mergeProps } from 'solid-js'
import Plot from 'solid-plotly.js'
import { createLayout, getChartColors } from '@/libs/plotly'
import { ProcessedData } from '@/libs/stats'

import type { Component } from 'solid-js'
import type { PlotType } from 'plotly.js'

interface ChartProps {
  data: Pick<ProcessedData, 'dates' | 'equity'> | null
  trials?: number
  futurePoints?: number
}

export const MonteCarlo: Component<ChartProps> = (props) => {
  // eslint-disable-next-line solid/reactivity
  props = mergeProps(
    {
      trials: 100,
      futurePoints: 100,
    },
    props
  )

  // Memoize plotData and layout to optimize performance
  const plotData = createMemo<Partial<Plotly.PlotData>[]>(() => [
    {
      x: props.data?.dates,
      y: props.data?.equity,
      type: 'scatter' as PlotType,
      name: 'Monte Carlo',
      line: { color: getChartColors()[9] },
    },
  ])

  const layout = createMemo(() => createLayout())

  return (
    <>
      <p>{props.trials}</p>
      <p>{props.futurePoints}</p>
      <Plot
        data={plotData()}
        layout={layout()}
        useResizeHandler={true}
      />
    </>
  )
}

export default MonteCarlo
