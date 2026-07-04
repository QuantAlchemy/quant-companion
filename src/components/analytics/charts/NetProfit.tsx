import { useMemo } from 'react'

import Plot from '@/components/Plot'
import { createLayout } from '@/lib/plotly'

import type { PlotData } from 'plotly.js'
import type { TradeMetrics } from '@/lib/stats'

interface ChartProps {
  data: Pick<TradeMetrics, 'dates' | 'netProfit'> | null
}

export function NetProfitChart({ data }: ChartProps) {
  const plotData = useMemo<Partial<PlotData>[]>(
    () => [
      {
        x: data?.dates,
        y: data?.netProfit,
        type: 'bar',
        name: 'Net Profit',
        marker: {
          color: (data?.netProfit ?? []).map((p) =>
            p >= 0 ? 'rgba(62, 207, 142, 0.75)' : 'rgba(242, 109, 133, 0.75)'
          ),
        },
      },
    ],
    [data]
  )

  const layout = useMemo(() => createLayout(), [])

  return <Plot data={plotData} layout={layout} />
}

export default NetProfitChart
