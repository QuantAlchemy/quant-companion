export const camelToPascalWithSpace = (str: string) => {
  return str
    .replace(/([A-Z])/g, ' $1') // Insert a space before each uppercase letter
    .replace(/^./, (match) => match.toUpperCase()) // Capitalize the first letter
    .trim() // Remove any leading or trailing spaces
}

export const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

export const percentageFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
