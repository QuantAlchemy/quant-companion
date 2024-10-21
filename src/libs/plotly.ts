import { getHSLColor } from '@/libs/theme'

import type { Layout } from 'plotly.js'

export const darkTheme = (): Partial<Layout> => ({
  paper_bgcolor: getHSLColor('--plot-paper'),
  plot_bgcolor: getHSLColor('--plot-paper'),
  font: {
    color: getHSLColor('--plot-foreground'),
  },
  title: {
    font: {
      color: getHSLColor('--plot-title'),
    },
  },
  xaxis: {
    gridcolor: getHSLColor('--plot-xaxis-grid'),
    zerolinecolor: getHSLColor('--plot-xaxis-zeroline'),
  },
  yaxis: {
    gridcolor: getHSLColor('--plot-yaxis-grid'),
    zerolinecolor: getHSLColor('--plot-yaxis-zeroline'),
  },
  legend: {
    bgcolor: getHSLColor('--plot-legend'),
    font: {
      color: getHSLColor('--plot-legend-foreground'),
    },
  },
})

// This is just a wrapper around layout to simplify applying the dark theme to all layouts
export const createLayout = (title?: string): Partial<Plotly.Layout> => {
  const layout = structuredClone(darkTheme()) // Deep clone darkTheme to avoid plotly.js errors because of shared object mutation
  layout.title =
    typeof layout.title === 'object' ? { ...layout.title, text: title } : { text: title }
  return layout
}
