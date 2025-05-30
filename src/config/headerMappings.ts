export interface HeaderMapping {
  sourceHeader: string
  targetHeader: string
  type: 'number' | 'string'
  alternatives?: string[] // Optional array of alternative source headers
}

export interface HeaderConfig {
  name: string
  mappings: HeaderMapping[]
}

// Fixed target headers that will be used internally
export const TARGET_HEADERS = {
  TRADE_NO: 'Trade #',
  TYPE: 'Type',
  SIGNAL: 'Signal',
  DATE_TIME: 'Date/Time',
  PRICE: 'Price',
  CONTRACTS: 'Contracts',
  PROFIT: 'Profit',
  PROFIT_PCT: 'Profit %',
  CUM_PROFIT: 'Cumulative profit',
  CUM_PROFIT_PCT: 'Cumulative profit %',
  RUNUP: 'Run-up',
  RUNUP_PCT: 'Run-up %',
  DRAWDOWN: 'Drawdown',
  DRAWDOWN_PCT: 'Drawdown %',
} as const

// Default header configuration that matches the current format
export const defaultHeaderConfig: HeaderConfig = {
  name: 'Default',
  mappings: [
    { sourceHeader: 'Trade #', targetHeader: TARGET_HEADERS.TRADE_NO, type: 'number' },
    { sourceHeader: 'Type', targetHeader: TARGET_HEADERS.TYPE, type: 'string' },
    { sourceHeader: 'Signal', targetHeader: TARGET_HEADERS.SIGNAL, type: 'string' },
    { sourceHeader: 'Date/Time', targetHeader: TARGET_HEADERS.DATE_TIME, type: 'string' },
    {
      sourceHeader: 'Price USD',
      targetHeader: TARGET_HEADERS.PRICE,
      type: 'number',
      alternatives: ['Price USDT'],
    },
    {
      sourceHeader: 'Contracts',
      targetHeader: TARGET_HEADERS.CONTRACTS,
      type: 'number',
      alternatives: ['Quantity'],
    },
    {
      sourceHeader: 'Profit USD',
      targetHeader: TARGET_HEADERS.PROFIT,
      type: 'number',
      alternatives: ['P&L USDT'],
    },
    {
      sourceHeader: 'Profit %',
      targetHeader: TARGET_HEADERS.PROFIT_PCT,
      type: 'number',
      alternatives: ['P&L %'],
    },
    {
      sourceHeader: 'Cumulative profit USD',
      targetHeader: TARGET_HEADERS.CUM_PROFIT,
      type: 'number',
      alternatives: ['Cumulative P&L USDT', 'Cum. Profit USD'],
    },
    {
      sourceHeader: 'Cumulative profit %',
      targetHeader: TARGET_HEADERS.CUM_PROFIT_PCT,
      type: 'number',
      alternatives: ['Cumulative P&L %', 'Cum. Profit %'],
    },
    {
      sourceHeader: 'Run-up USD',
      targetHeader: TARGET_HEADERS.RUNUP,
      type: 'number',
      alternatives: ['Run-up USDT'],
    },
    { sourceHeader: 'Run-up %', targetHeader: TARGET_HEADERS.RUNUP_PCT, type: 'number' },
    {
      sourceHeader: 'Drawdown USD',
      targetHeader: TARGET_HEADERS.DRAWDOWN,
      type: 'number',
      alternatives: ['Drawdown USDT'],
    },
    { sourceHeader: 'Drawdown %', targetHeader: TARGET_HEADERS.DRAWDOWN_PCT, type: 'number' },
  ],
}

// Function to get all saved configurations
export function getSavedConfigs(): HeaderConfig[] {
  const savedConfigs = localStorage.getItem('headerConfigs')
  if (!savedConfigs) return [defaultHeaderConfig]
  return JSON.parse(savedConfigs)
}

// Function to save a new configuration
export function saveConfig(config: HeaderConfig): void {
  const configs = getSavedConfigs()
  const existingIndex = configs.findIndex((c) => c.name === config.name)

  if (existingIndex >= 0) {
    configs[existingIndex] = config
  } else {
    configs.push(config)
  }

  localStorage.setItem('headerConfigs', JSON.stringify(configs))
}

// Function to delete a configuration
export function deleteConfig(configName: string): void {
  const configs = getSavedConfigs()
  const filteredConfigs = configs.filter((c) => c.name !== configName)
  localStorage.setItem('headerConfigs', JSON.stringify(filteredConfigs))
}

// Function to validate if all required headers are present
export function validateHeaders(headers: string[], config: HeaderConfig): boolean {
  const requiredHeaders = config.mappings
    .map((m) => {
      // For each mapping, we need either the main header or one of its alternatives
      const allPossibleHeaders = [m.sourceHeader, ...(m.alternatives || [])]
      return allPossibleHeaders
    })
    .flat()

  console.log('Validation details:', {
    configName: config.name,
    requiredHeaders,
    actualHeaders: headers,
    missingHeaders: requiredHeaders.filter((header) => !headers.some((h) => h.includes(header))),
    extraHeaders: headers.filter((header) => !requiredHeaders.some((h) => header.includes(h))),
  })

  // For each mapping, check if either the main header or one of its alternatives is present
  return config.mappings.every((mapping) => {
    const allPossibleHeaders = [mapping.sourceHeader, ...(mapping.alternatives || [])]
    return allPossibleHeaders.some((header) => headers.some((h) => h.includes(header)))
  })
}

// Function to transform data according to header configuration
export function transformDataByHeaderConfig<T extends Record<string, string | number>>(
  data: T[],
  config: HeaderConfig
): T[] {
  return data.map((record) => {
    const transformedRecord: Record<string, string | number> = {}

    // Process each field in the record
    Object.entries(record).forEach(([key, value]) => {
      // Find the mapping for this header using exact match or alternatives
      const mapping = config.mappings.find(
        (m) =>
          m.sourceHeader.trim() === key.trim() ||
          (m.alternatives && m.alternatives.some((alt) => alt.trim() === key.trim()))
      )

      if (mapping) {
        // Use the target header as the new key
        transformedRecord[mapping.targetHeader] = value
      } else {
        // If no mapping found, keep the original key
        transformedRecord[key] = value
      }
    })

    return transformedRecord as T
  })
}
