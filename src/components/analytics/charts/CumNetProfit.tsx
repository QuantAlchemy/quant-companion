import { useMemo } from 'react'

import Plot from '@/components/Plot'
import { createLayout } from '@/lib/plotly'

import type { PlotData } from 'plotly.js'
import type { TradeMetrics } from '@/lib/stats'

interface ChartProps {
  data: Pick<TradeMetrics, 'dates' | 'cumNetProfit'> | null
}

export function CumNetProfitChart({ data }: ChartProps) {
  const plotData = useMemo<Partial<PlotData>[]>(
    () => [
      {
        x: data?.dates,
        y: data?.cumNetProfit,
        type: 'scatter',
        name: 'Cum. Net Profit',
        line: { color: '#5AA3F2', width: 2 },
      },
    ],
    [data]
  )

  const layout = useMemo(() => createLayout(), [])

  return <Plot data={plotData} layout={layout} />
}

export default CumNetProfitChart
