// returns the value of a CSS variable
export const getThemeColor = (variable: string, fallbackColor: string = '#B48CFF'): string => {
  if (typeof window === 'undefined') return fallbackColor
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim()
  return value
}

export const getHSLColor = (
  variable: string,
  options: { fallbackColor?: string; useCommaSeparatedHSL?: boolean } = {}
): string => {
  const fallbackColor = options.fallbackColor || '#B48CFF'
  const useCommaSeparatedHSL = options.useCommaSeparatedHSL || false
  const value = getThemeColor(variable, fallbackColor)

  // Check if the value contains space-separated HSL values
  if (useCommaSeparatedHSL) {
    // Convert space-separated to comma-separated HSL format
    const hslValues = value.split(' ')
    if (hslValues.length === 3) {
      return `hsl(${hslValues[0]}, ${hslValues[1]}, ${hslValues[2]})`
    }
  }

  return `hsl(${value})`
}
