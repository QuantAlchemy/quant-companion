import { Component, createMemo } from 'solid-js'
import Plot from 'solid-plotly.js'
// import type { PlotlyFigure } from 'solid-plotly.js';
import type { PlotType } from 'plotly.js'
import { createLayout, getChartColors } from '@/libs/plotly'

interface ChartProps {
  data: {
    dates: Date[]
    equity: number[]
  }
}

export const EquityChart: Component<ChartProps> = (props) => {
  // Memoize plotData and layout to optimize performance
  const plotData = createMemo<Partial<Plotly.PlotData>[]>(() => [
    {
      x: props.data?.dates,
      y: props.data?.equity,
      type: 'scatter' as PlotType,
      mode: 'lines',
      name: 'Equity',
      line: { color: getChartColors(1)[0] },
    },
  ])

  const layout = createMemo(() => createLayout('Equity Over Time'))

  return (
    <Plot
      data={plotData()}
      layout={layout()}
      useResizeHandler={true}
      // Pass any additional props or event handlers if needed
    />
  )
}

export default EquityChart
