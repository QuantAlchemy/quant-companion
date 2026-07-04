import { useMemo } from 'react'

import Plot from '@/components/Plot'
import { profitLossBorderColor, profitLossColor } from '@/lib/colors'
import { createLayout } from '@/lib/plotly'

import type { PlotData } from 'plotly.js'
import type { TradeMetrics } from '@/lib/stats'

interface ChartProps {
  data: Pick<TradeMetrics, 'dates' | 'netProfit'> | null
}

export function NetProfitChart({ data }: ChartProps) {
  const tradeDates = useMemo(
    () => data?.dates.slice(-data.netProfit.length),
    [data]
  )

  const plotData = useMemo<Partial<PlotData>[]>(
    () => [
      {
        x: tradeDates,
        y: data?.netProfit,
        type: 'bar',
        name: 'Net Profit',
        marker: {
          color: (data?.netProfit ?? []).map(profitLossColor),
          line: {
            color: (data?.netProfit ?? []).map(profitLossBorderColor),
            width: 0.7,
          },
        },
      },
    ],
    [data, tradeDates]
  )

  const layout = useMemo(() => createLayout(), [])

  return <Plot data={plotData} layout={layout} />
}

export default NetProfitChart
