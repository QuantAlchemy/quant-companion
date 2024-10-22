import { createMemo, mergeProps } from 'solid-js'
import Plot from '@/components/ui/Plot'
import { createLayout } from '@/libs/plotly'
import { generateProbabilityCones, generateLinearProbabilityCones } from '@/libs/stats'
import { getHSLColor } from '@/libs/theme'

import type { Component } from 'solid-js'
import type { PlotType } from 'plotly.js'
import type { TradeMetrics } from '@/libs/stats'

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

export const ProbabilityCones: Component<ChartProps> = (props) => {
  // eslint-disable-next-line solid/reactivity
  props = mergeProps(
    {
      coneType: ConeType.Exponential,
      coneLength: 30,
      coneStartPercentage: 90,
      stdDevA: 1,
      stdDevB: 2,
    },
    props
  )

  const coneMethod = (coneType = props.coneType) => getConeMethod(coneType as ConeType)
  const layout = createMemo(() => createLayout())

  const plotData = createMemo(() => {
    if (!props.data) {
      return []
    }

    const coneDataA = coneMethod()(
      props.data,
      props.stdDevA,
      props.coneLength,
      (props.coneStartPercentage ?? 90) / 100
    )
    const coneDataB = coneMethod()(
      props.data,
      props.stdDevB,
      props.coneLength,
      (props.coneStartPercentage ?? 90) / 100
    )

    return [
      // Equity line
      {
        x: props.data.dates,
        y: props.data.equity,
        type: 'scatter' as PlotType,
        name: 'Equity',
        line: { color: getHSLColor('--secondary') },
      },
      // Average equity line
      // {
      //   x: props.data?.dates,
      //   y: calculateLinearAverageEquity(props.data),
      //   type: 'scatter' as PlotType,
      //   name: 'Average Equity',
      //   line: { color: getThemeColor('--primary-foreground') },
      // },
      // Upper cone A
      {
        x: coneDataA.futureDates,
        y: coneDataA.upperCone,
        type: 'scatter' as PlotType,
        name: `${props.stdDevA}σ Upper Cone`,
        line: { color: '#ffed6f' },
      },
      // Lower cone A
      {
        x: coneDataA.futureDates,
        y: coneDataA.lowerCone,
        type: 'scatter' as PlotType,
        name: `${props.stdDevA}σ Lower Cone`,
        line: { color: '#ffed6f' },
      },
      // Upper cone B
      {
        x: coneDataB.futureDates,
        y: coneDataB.upperCone,
        type: 'scatter' as PlotType,
        name: `${props.stdDevB}σ Upper Cone`,
        line: { color: '#fb8072' },
      },
      // Lower cone B
      {
        x: coneDataB.futureDates,
        y: coneDataB.lowerCone,
        type: 'scatter' as PlotType,
        name: `${props.stdDevB}σ Lower Cone`,
        line: { color: '#fb8072' },
      },
    ]
  })

  return (
    <Plot
      data={plotData()}
      layout={layout()}
    />
  )
}

export default ProbabilityCones
