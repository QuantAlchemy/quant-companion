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

const smallPriceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumSignificantDigits: 2,
  maximumSignificantDigits: 4,
})

/** A dollar price that keeps sub-cent coin prices readable, such as $0.000011. */
export const formatUsdPrice = (value: number) =>
  Math.abs(value) >= 1 || value === 0
    ? currencyFormatter.format(value)
    : smallPriceFormatter.format(value)
