import { Component, createMemo } from 'solid-js'
import Plot from 'solid-plotly.js'
import { createLayout, getChartColors } from '@/libs/plotly'
import { generateProbabilityCones, calculateLinearAverageEquity } from '@/libs/stats'

import type { PlotType } from 'plotly.js'
import type { ProcessedData } from '@/libs/stats'

interface ChartProps {
  data: ProcessedData | null
}

export const ProbabilityCones: Component<ChartProps> = (props) => {
  // Memoize plotData and layout to optimize performance
  const equityPlotData = createMemo<Partial<Plotly.PlotData>[]>(() => [
    {
      x: props.data?.dates,
      y: props.data?.equity,
      type: 'scatter' as PlotType,
      name: 'Equity',
      line: { color: getChartColors()[9] },
    },
  ])
  const linearEquityPlotData = createMemo<Partial<Plotly.PlotData>[]>(() => [
    {
      x: props.data?.dates,
      y: calculateLinearAverageEquity(props.data),
      type: 'scatter' as PlotType,
      name: 'Average Equity',
      line: { color: getChartColors()[0] },
    },
  ])

  const coneAData = createMemo(() =>
    props.data
      ? generateProbabilityCones(props.data, 1)
      : { futureDates: [], upperCone: [], lowerCone: [] }
  )
  const upperConeAData = createMemo<Partial<Plotly.PlotData>[]>(() => [
    {
      x: coneAData().futureDates,
      y: coneAData().upperCone,
      type: 'scatter' as PlotType,
      name: `1σ Cone`,
      line: { color: getChartColors()[11] },
    },
  ])
  const lowerConeAData = createMemo<Partial<Plotly.PlotData>[]>(() => [
    {
      x: coneAData().futureDates,
      y: coneAData().lowerCone,
      type: 'scatter' as PlotType,
      name: `1σ Cone`,
      line: { color: getChartColors()[11] },
    },
  ])

  const coneBData = createMemo(() =>
    props.data
      ? generateProbabilityCones(props.data)
      : { futureDates: [], upperCone: [], lowerCone: [] }
  )
  const upperConeBData = createMemo<Partial<Plotly.PlotData>[]>(() => [
    {
      x: coneBData().futureDates,
      y: coneBData().upperCone,
      type: 'scatter' as PlotType,
      name: `2σ Cone`,
      line: { color: getChartColors()[3] },
    },
  ])
  const lowerConeBData = createMemo<Partial<Plotly.PlotData>[]>(() => [
    {
      x: coneBData().futureDates,
      y: coneBData().lowerCone,
      type: 'scatter' as PlotType,
      name: `2σ Cone`,
      line: { color: getChartColors()[3] },
    },
  ])

  // console.log({ coneAData: coneAData() })

  const layout = createMemo(() => createLayout())

  return (
    <Plot
      data={[
        ...equityPlotData(),
        ...linearEquityPlotData(),
        ...upperConeAData(),
        ...lowerConeAData(),
        ...upperConeBData(),
        ...lowerConeBData(),
      ]}
      layout={layout()}
      useResizeHandler={true}
    />
  )
}

export default ProbabilityCones
