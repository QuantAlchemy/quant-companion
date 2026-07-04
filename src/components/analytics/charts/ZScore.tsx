import { useMemo } from 'react'

import Plot from '@/components/Plot'
import { createLayout } from '@/lib/plotly'

import type { PlotData } from 'plotly.js'
import type { TradeMetrics } from '@/lib/stats'

interface ChartProps {
  data: Pick<TradeMetrics, 'dates' | 'zScores'> | null
}

export function ZScoreDistributionBox({ data }: ChartProps) {
  const plotData = useMemo<Partial<PlotData>[]>(
    () => [
      {
        y: data?.zScores,
        type: 'box',
        name: 'Z-Score Distribution',
        marker: { color: '#5AA3F2' },
      },
    ],
    [data]
  )

  const layout = useMemo(() => createLayout(), [])

  return <Plot data={plotData} layout={layout} />
}

export function ZScoreDistributionHist({ data }: ChartProps) {
  const plotData = useMemo<Partial<PlotData>[]>(
    () => [
      {
        x: data?.zScores,
        type: 'histogram',
        name: 'Z-Score Distribution',
        marker: {
          color: 'rgba(90, 163, 242, 0.8)',
          line: { color: 'rgba(10, 13, 22, 0.9)', width: 0.5 },
        },
      },
    ],
    [data]
  )

  const layout = useMemo(() => createLayout(), [])

  return <Plot data={plotData} layout={layout} />
}
