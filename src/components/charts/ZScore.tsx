import { createMemo } from 'solid-js'
import Plot from '@/components/ui/Plot'
import { createLayout } from '@/libs/plotly'
import { TradeMetrics } from '@/libs/stats'
import { getHSLColor } from '@/libs/theme'

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
      marker: { color: getHSLColor('--secondary') },
    },
  ])

  const layout = createMemo(() => createLayout())

  return (
    <Plot
      data={plotData()}
      layout={layout()}
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
      marker: {
        color: getHSLColor('--secondary'),
        line: {
          color: getHSLColor('--plot-paper'),
          width: 0.1,
        },
      },
    },
  ])

  const layout = createMemo(() => createLayout())

  return (
    <Plot
      data={plotData()}
      layout={layout()}
    />
  )
}

export default { ZScoreDistributionBox, ZScoreDistributionHist }
