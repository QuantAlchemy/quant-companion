import { createMemo } from 'solid-js'
import Plot from 'solid-plotly.js'
import { createLayout, getChartColors } from '@/libs/plotly'
import { TradeMetrics } from '@/libs/stats'

import type { Component } from 'solid-js'
import type { PlotType } from 'plotly.js'

interface ChartProps {
  data: Pick<TradeMetrics, 'dates' | 'zScores'> | null
}

export const ZScoreDistributionBox: Component<ChartProps> = (props) => {
  const title = 'Z-Score Distribution'

  const plotData = createMemo<Partial<Plotly.PlotData>[]>(() => [
    {
      y: props.data?.zScores,
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

export const ZScoreDistributionHist: Component<ChartProps> = (props) => {
  const title = 'Z-Score Distribution'

  // Memoize plotData and layout to optimize performance
  const plotData = createMemo<Partial<Plotly.PlotData>[]>(() => [
    {
      x: props.data?.zScores,
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

export default { ZScoreDistributionBox, ZScoreDistributionHist }
