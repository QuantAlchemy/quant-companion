import { useMemo } from 'react'

import Plot from '@/components/Plot'
import { createLayout } from '@/lib/plotly'

import type { PlotData } from 'plotly.js'
import type { TradeMetrics } from '@/lib/stats'

interface ChartProps {
  data: Pick<TradeMetrics, 'netProfit'> | null
}

export function ProfitDistributionBox({ data }: ChartProps) {
  const plotData = useMemo<Partial<PlotData>[]>(
    () => [
      {
        y: data?.netProfit,
        type: 'box',
        name: 'Profit Distribution',
        marker: { color: '#B48CFF' },
      },
    ],
    [data]
  )

  const layout = useMemo(() => createLayout(), [])

  return <Plot data={plotData} layout={layout} />
}

export function ProfitDistributionHist({ data }: ChartProps) {
  const plotData = useMemo<Partial<PlotData>[]>(
    () => [
      {
        x: data?.netProfit,
        type: 'histogram',
        name: 'Profit Distribution',
        marker: {
          color: 'rgba(180, 140, 255, 0.8)',
          line: { color: 'rgba(10, 13, 22, 0.9)', width: 0.5 },
        },
      },
    ],
    [data]
  )

  const layout = useMemo(() => createLayout(), [])

  return <Plot data={plotData} layout={layout} />
}
