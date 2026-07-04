import { useMemo } from 'react'

import Plot from '@/components/Plot'
import { PROFIT_LOSS_COLORS } from '@/lib/colors'
import { createLayout } from '@/lib/plotly'
import {
  generateLinearProbabilityCones,
  generateProbabilityCones,
} from '@/lib/stats'

import type { PlotData } from 'plotly.js'
import type { TradeMetrics } from '@/lib/stats'

export enum ConeType {
  Linear,
  Exponential,
}

interface ChartProps {
  data: TradeMetrics | null
  stdDevA?: number
  stdDevB?: number
  coneType?: ConeType
  coneLength?: number
  coneStartPercentage?: number
}

const getConeMethod = (coneType: ConeType) => {
  switch (coneType) {
    case ConeType.Linear:
      return generateLinearProbabilityCones
    case ConeType.Exponential:
      return generateProbabilityCones
    default:
      return generateProbabilityCones
  }
}

export function ProbabilityCones({
  data,
  stdDevA = 1,
  stdDevB = 2,
  coneType = ConeType.Exponential,
  coneLength = 30,
  coneStartPercentage = 90,
}: ChartProps) {
  const layout = useMemo(() => createLayout(), [])

  const plotData = useMemo<Partial<PlotData>[]>(() => {
    if (!data) return []

    const coneMethod = getConeMethod(coneType)
    const coneDataA = coneMethod(data, stdDevA, coneLength, coneStartPercentage / 100)
    const coneDataB = coneMethod(data, stdDevB, coneLength, coneStartPercentage / 100)

    return [
      // Equity line
      {
        x: data.dates,
        y: data.equity,
        type: 'scatter',
        name: 'Equity',
        line: { color: '#7C5CFF', width: 2 },
      },
      // Cone A (inner)
      {
        x: coneDataA.futureDates,
        y: coneDataA.upperCone,
        type: 'scatter',
        name: `${stdDevA}σ Upper Cone`,
        line: { color: '#E8B45A', dash: 'dot' },
      },
      {
        x: coneDataA.futureDates,
        y: coneDataA.lowerCone,
        type: 'scatter',
        name: `${stdDevA}σ Lower Cone`,
        line: { color: '#E8B45A', dash: 'dot' },
      },
      // Cone B (outer)
      {
        x: coneDataB.futureDates,
        y: coneDataB.upperCone,
        type: 'scatter',
        name: `${stdDevB}σ Upper Cone`,
        line: { color: PROFIT_LOSS_COLORS.loss, dash: 'dot' },
      },
      {
        x: coneDataB.futureDates,
        y: coneDataB.lowerCone,
        type: 'scatter',
        name: `${stdDevB}σ Lower Cone`,
        line: { color: PROFIT_LOSS_COLORS.loss, dash: 'dot' },
      },
    ]
  }, [data, stdDevA, stdDevB, coneType, coneLength, coneStartPercentage])

  return <Plot data={plotData} layout={layout} />
}

export default ProbabilityCones
