import { Component, createMemo } from 'solid-js'
import Plot from 'solid-plotly.js'
import type { PlotType } from 'plotly.js'
import { createLayout, getChartColors } from '@/libs/plotly'
import { ProcessedData } from '@/libs/stats'

interface ChartProps {
  data: Pick<ProcessedData, 'dates' | 'cumNetProfit'> | null
}

export const CumNetProfit: Component<ChartProps> = (props) => {
  const title = 'Cum. Net Profit'

  // Memoize plotData and layout to optimize performance
  const plotData = createMemo<Partial<Plotly.PlotData>[]>(() => [
    {
      x: props.data?.dates,
      y: props.data?.cumNetProfit,
      type: 'scatter' as PlotType,
      name: title,
      line: { color: getChartColors()[9] },
    },
  ])

  const layout = createMemo(() => createLayout())

  return (
    <Plot
      data={plotData()}
      layout={layout()}
      useResizeHandler={true}
    />
  )
}

export default CumNetProfit
