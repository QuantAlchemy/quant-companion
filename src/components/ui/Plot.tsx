import Plotly from '@ralphsmith80/solid-plotly.js'

import type { Component } from 'solid-js'
import type { PlotlyComponentProps } from '@ralphsmith80/solid-plotly.js'

export const Plot: Component<PlotlyComponentProps> = (props) => {
  return (
    <Plotly
      class="rounded-xl overflow-hidden"
      config={props.config ?? { displayModeBar: false }}
      useResizeHandler={props.useResizeHandler ?? true}
      {...props}
    />
  )
}

export default Plot
