import { Layout } from 'plotly.js'

export const darkTheme: Partial<Layout> = {
  paper_bgcolor: '#303030',
  plot_bgcolor: '#303030',
  font: {
    color: '#e0e0e0',
  },
  title: {
    font: {
      color: '#ffffff',
    },
  },
  xaxis: {
    gridcolor: '#505050',
    zerolinecolor: '#707070',
  },
  yaxis: {
    gridcolor: '#505050',
    zerolinecolor: '#707070',
  },
  legend: {
    bgcolor: 'rgba(0,0,0,0)',
    font: {
      color: '#e0e0e0',
    },
  },
}

// This is just a wrapper around layout to simplify applying the dark theme to all layouts
export const createLayout = (title?: string): Partial<Plotly.Layout> => {
  const layout = structuredClone(darkTheme) // Deep clone darkTheme to avoid plotly.js errors because of shared object mutation
  layout.title =
    typeof layout.title === 'object' ? { ...layout.title, text: title } : { text: title }
  return layout
}

export const getChartColors = (count: number = 12): string[] => {
  const baseColors = [
    '#8dd3c7',
    '#ffffb3',
    '#bebada',
    '#fb8072',
    '#80b1d3',
    '#fdb462',
    '#b3de69',
    '#fccde5',
    '#d9d9d9',
    '#bc80bd',
    '#ccebc5',
    '#ffed6f',
  ]

  // If we need more colors than in our base set, we'll start cycling through them
  return Array(count)
    .fill(0)
    .map((_, i) => baseColors[i % baseColors.length])
}
