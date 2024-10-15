import { createMemo } from 'solid-js'
import Plot from 'solid-plotly.js'
import { createLayout, getChartColors } from '@/libs/plotly'
import { ProcessedData } from '@/libs/stats'

import type { Component } from 'solid-js'
import type { PlotType } from 'plotly.js'

interface ChartProps {
  data: Pick<ProcessedData, 'netProfit'> | null
}

export const ProfitDistributionBox: Component<ChartProps> = (props) => {
  const title = 'Profit Distribution Box'

  // Memoize plotData and layout to optimize performance
  const plotData = createMemo<Partial<Plotly.PlotData>[]>(() => [
    {
      y: props.data?.netProfit,
      type: 'box' as PlotType,
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

export const ProfitDistributionHist: Component<ChartProps> = (props) => {
  const title = 'Profit Distribution Hist'

  // Memoize plotData and layout to optimize performance
  const plotData = createMemo<Partial<Plotly.PlotData>[]>(() => [
    {
      x: props.data?.netProfit,
      type: 'histogram' as PlotType,
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

export default { ProfitDistributionBox, ProfitDistributionHist }
