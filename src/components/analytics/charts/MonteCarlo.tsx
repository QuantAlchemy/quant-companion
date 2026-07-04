import { useStore } from '@tanstack/react-store'
import { useMemo } from 'react'

import Plot from '@/components/Plot'
import { monteCarloDataStore } from '@/lib/monteCarlo'
import { createLayout } from '@/lib/plotly'
import { averageOfArrays, averageTimeDelta } from '@/lib/stats'

import type { PlotData } from 'plotly.js'
import type { TradeMetrics } from '@/lib/stats'

interface ChartProps {
  data: Pick<TradeMetrics, 'dates' | 'netProfit' | 'startingEquity'> | null
  staticPoints?: boolean
}

const formatMonteCarloData = (
  simulation: number[],
  name: string,
  dates: Date[] = [],
  params: Partial<PlotData> = {}
) => {
  // If dates are provided, use them to create x-axis points that are date relative
  const lastHistoricalDate = dates[dates.length - 1]
  const xAxis = dates.length
    ? simulation.map((_, i) => {
        if (i === 0) return lastHistoricalDate
        return new Date(lastHistoricalDate.getTime() + i * averageTimeDelta(dates))
      })
    : simulation.map((_, i) => i)
  return {
    name,
    type: 'scatter' as const,
    x: xAxis,
    y: simulation,
    hovertemplate: '%{fullData.name}<br>Point: %{x}<br>Value: %{y:,.2f}<extra></extra>',
    ...params,
  }
}

export function MonteCarloChart({ data, staticPoints = true }: ChartProps) {
  const monteCarloData = useStore(monteCarloDataStore)

  const layout = useMemo(() => createLayout(), [])

  const plotData = useMemo<Partial<PlotData>[]>(() => {
    const runs = monteCarloData.map((simulation, i) =>
      formatMonteCarloData(
        simulation,
        `run ${i + 1}`,
        staticPoints ? undefined : (data?.dates ?? undefined),
        { line: { width: 1 }, opacity: 0.55 }
      )
    )
    const averageMonteCarlo = averageOfArrays(monteCarloData)
    const avgPlotData = formatMonteCarloData(averageMonteCarlo, 'average', undefined, {
      line: { color: '#E8B45A', width: 3 },
      hoverlabel: {
        bgcolor: '#E8B45A',
        bordercolor: '#F4CF87',
        font: { color: '#0A0D16' },
      },
      hovertemplate:
        '<b>Average Monte Carlo Line</b><br>Point: %{x}<br>Average value: %{y:,.2f}<extra></extra>',
    })
    return [...runs, avgPlotData]
  }, [monteCarloData, data, staticPoints])

  return <Plot data={plotData} layout={{ ...layout, showlegend: false }} />
}

export default MonteCarloChart
