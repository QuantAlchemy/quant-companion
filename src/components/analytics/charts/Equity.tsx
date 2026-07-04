import { useMemo } from 'react'

import Plot from '@/components/Plot'
import { createLayout } from '@/lib/plotly'

import type { PlotData } from 'plotly.js'
import type { TradeMetrics } from '@/lib/stats'

interface ChartProps {
  data: Pick<TradeMetrics, 'dates' | 'equity'> | null
}

export function EquityChart({ data }: ChartProps) {
  const plotData = useMemo<Partial<PlotData>[]>(
    () => [
      {
        x: data?.dates,
        y: data?.equity,
        type: 'scatter',
        name: 'Equity',
        line: { color: '#7C5CFF', width: 2 },
        fill: 'tozeroy',
        fillcolor: 'rgba(124, 92, 255, 0.08)',
      },
    ],
    [data]
  )

  const layout = useMemo(() => createLayout(), [])

  return <Plot data={plotData} layout={layout} />
}

export default EquityChart
