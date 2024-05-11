/* eslint-disable @typescript-eslint/no-explicit-any */
import Plotly from 'react-plotly.js'

export function Plot({
  data,
  layout,
  ...rest
}: {
  data: any
  layout: any
  [key: string]: any
}) {
  return <Plotly data={data} layout={layout} {...rest} />
}

export default Plot
