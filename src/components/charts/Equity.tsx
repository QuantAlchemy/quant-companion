import { createMemo } from 'solid-js'
import Plot from '@/components/ui/Plot'
import { createLayout } from '@/libs/plotly'
import { TradeMetrics } from '@/libs/stats'
import { getHSLColor } from '@/libs/theme'

import type { Component } from 'solid-js'
import type { PlotType } from 'plotly.js'

interface ChartProps {
  data: Pick<TradeMetrics, 'dates' | 'equity'> | null
}

export const Equity: Component<ChartProps> = (props) => {
  const title = 'Equity'
  // Memoize plotData and layout to optimize performance
  const plotData = createMemo<Partial<Plotly.PlotData>[]>(() => [
    {
      x: props.data?.dates,
      y: props.data?.equity,
      type: 'scatter' as PlotType,
      name: title,
      line: { color: getHSLColor('--secondary') },
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

export default Equity
