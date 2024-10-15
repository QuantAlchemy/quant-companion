import { createMemo } from 'solid-js'
import Plot from 'solid-plotly.js'
import { createLayout, getChartColors } from '@/libs/plotly'
import { ProcessedData } from '@/libs/stats'

import type { Component } from 'solid-js'
import type { PlotType } from 'plotly.js'

interface ChartProps {
  data: Pick<ProcessedData, 'dates' | 'netProfit'> | null
}

export const NetProfit: Component<ChartProps> = (props) => {
  const title = 'Net Profit'

  // Memoize plotData and layout to optimize performance
  const plotData = createMemo<Partial<Plotly.PlotData>[]>(() => [
    {
      x: props.data?.dates,
      y: props.data?.netProfit,
      type: 'bar' as PlotType,
      name: title,
      marker: { color: getChartColors()[9] },
    },
  ])

  const layout = createMemo(() => createLayout())

  return (
    <Plot
      data={plotData()}
      layout={layout()}
      useResizeHandler={true}
      config={{ displayModeBar: false }}
    />
  )
}

export default NetProfit
