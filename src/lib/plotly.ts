import type { Layout } from 'plotly.js'

const cssVar = (name: string, fallback: string): string => {
  if (typeof window === 'undefined') return fallback
  return (
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    fallback
  )
}

// Alchemist's Terminal chart palette — indigo, sky, violet, gold, emerald
export const CHART_COLORWAY = [
  '#7C5CFF',
  '#5AA3F2',
  '#B48CFF',
  '#E8B45A',
  '#3ECF8E',
  '#F26D85',
]

export const darkTheme = (): Partial<Layout> => ({
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor: 'rgba(0,0,0,0)',
  colorway: CHART_COLORWAY,
  font: {
    color: cssVar('--plot-fg', '#a7aecb'),
    family: "'IBM Plex Mono', ui-monospace, monospace",
    size: 11,
  },
  title: {
    font: {
      color: cssVar('--plot-title', '#e9ecf8'),
      family: "'Instrument Sans Variable', ui-sans-serif, sans-serif",
      size: 14,
    },
  },
  margin: { t: 36, r: 16, b: 44, l: 60 },
  xaxis: {
    gridcolor: cssVar('--plot-grid', 'rgba(146,155,205,0.13)'),
    zerolinecolor: cssVar('--plot-zeroline', 'rgba(146,155,205,0.3)'),
  },
  yaxis: {
    gridcolor: cssVar('--plot-grid', 'rgba(146,155,205,0.13)'),
    zerolinecolor: cssVar('--plot-zeroline', 'rgba(146,155,205,0.3)'),
  },
  legend: {
    bgcolor: 'rgba(0,0,0,0)',
    font: { color: cssVar('--plot-fg', '#a7aecb') },
  },
  hoverlabel: {
    bgcolor: '#1a2033',
    bordercolor: 'rgba(146,155,205,0.35)',
    font: {
      color: '#e9ecf8',
      family: "'IBM Plex Mono', ui-monospace, monospace",
    },
  },
})

// This is just a wrapper around layout to simplify applying the dark theme to all layouts
export const createLayout = (title?: string): Partial<Layout> => {
  const layout = structuredClone(darkTheme())
  layout.title =
    typeof layout.title === 'object'
      ? { ...layout.title, text: title }
      : { text: title }
  return layout
}
