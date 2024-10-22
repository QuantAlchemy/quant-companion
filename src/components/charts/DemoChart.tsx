import { createSignal } from 'solid-js'
import Plot from '@/components/ui/Plot'
import type { PlotlyFigure } from 'solid-plotly.js'
import type { PlotType } from 'plotly.js'

export const Chart = () => {
  const [data] = createSignal<Partial<Plotly.PlotData>[]>([
    {
      x: [1, 2, 3, 4],
      y: [10, 15, 13, 17],
      type: 'scatter' as PlotType,
      mode: 'lines+markers',
      marker: { color: 'red' },
    },
  ])

  const [layout] = createSignal<PlotlyFigure['layout']>({
    title: 'A Simple Plot',
  })

  const handleInitialized = (figure: PlotlyFigure) => {
    console.log('Plotly chart initialized:', figure)
  }

  const handleUpdate = (figure: PlotlyFigure) => {
    console.log('Plotly chart updated:', figure)
  }

  const handleError = (error: Error) => {
    console.error('Plotly chart error:', error)
  }

  const handlePurge = () => {
    console.log('Plotly chart purged.')
  }

  return (
    <Plot
      data={data()}
      layout={layout()}
      onInitialized={handleInitialized}
      onUpdate={handleUpdate}
      onPurge={handlePurge}
      onError={handleError}
      useResizeHandler={true}
      class="my-plotly-chart"
      divId="my-plotly-div"
    />
  )
}

export default Chart
