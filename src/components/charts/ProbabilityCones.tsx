import { createMemo, mergeProps } from 'solid-js'
import Plot from 'solid-plotly.js'
import { createLayout, getChartColors } from '@/libs/plotly'
import { generateProbabilityCones, generateLinearProbabilityCones } from '@/libs/stats'

import type { Component } from 'solid-js'
import type { PlotType } from 'plotly.js'
import type { ProcessedData } from '@/libs/stats'

export enum ConeType {
  Linear,
  Exponential,
}

interface ChartProps {
  data: ProcessedData | null
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
        line: { color: getChartColors()[9] },
      },
      // Average equity line
      // {
      //   x: props.data?.dates,
      //   y: calculateLinearAverageEquity(props.data),
      //   type: 'scatter' as PlotType,
      //   name: 'Average Equity',
      //   line: { color: getChartColors()[0] },
      // },
      // Upper cone A
      {
        x: coneDataA.futureDates,
        y: coneDataA.upperCone,
        type: 'scatter' as PlotType,
        name: `${props.stdDevA}σ Upper Cone`,
        line: { color: getChartColors()[11] },
      },
      // Lower cone A
      {
        x: coneDataA.futureDates,
        y: coneDataA.lowerCone,
        type: 'scatter' as PlotType,
        name: `${props.stdDevA}σ Lower Cone`,
        line: { color: getChartColors()[11] },
      },
      // Upper cone B
      {
        x: coneDataB.futureDates,
        y: coneDataB.upperCone,
        type: 'scatter' as PlotType,
        name: `${props.stdDevB}σ Upper Cone`,
        line: { color: getChartColors()[3] },
      },
      // Lower cone B
      {
        x: coneDataB.futureDates,
        y: coneDataB.lowerCone,
        type: 'scatter' as PlotType,
        name: `${props.stdDevB}σ Lower Cone`,
        line: { color: getChartColors()[3] },
      },
    ]
  })

  return (
    <>
      <div>Current Cone Length: {props.coneLength}</div>
      <Plot
        data={plotData()}
        layout={layout()}
        useResizeHandler={true}
      />
    </>
  )
}

export default ProbabilityCones
