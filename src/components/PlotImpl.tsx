import Plotly from 'plotly.js-dist-min'
import createPlotlyComponent from 'react-plotly.js/factory'

import type { PlotParams } from 'react-plotly.js'

const PlotlyComponent = createPlotlyComponent(Plotly)

export default function PlotImpl({ config, style, ...props }: PlotParams) {
  return (
    <PlotlyComponent
      className="overflow-hidden rounded-xl"
      config={config ?? { displayModeBar: false, responsive: true }}
      useResizeHandler
      style={style ?? { width: '100%', height: '100%' }}
      {...props}
    />
  )
}
