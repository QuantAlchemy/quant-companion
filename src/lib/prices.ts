import { auth } from '@clerk/tanstack-react-start/server'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

/**
 * Live market prices, fetched server-side so API keys never reach the client.
 * Both providers are optional — without keys the journal simply shows
 * open trades without live unrealized P&L.
 *
 * Env: COINMARKETCAP_API_KEY, ALPACA_API_KEY_ID, ALPACA_SECRET_KEY
 */

const REQUEST_TIMEOUT_MS = 10_000
const MAX_CRYPTO_SYMBOLS = 100
const MAX_TRADITIONAL_SYMBOLS = 25
const TRADITIONAL_REQUEST_CONCURRENCY = 5
const MAX_BAR_RANGE_DAYS = 3_660
const MAX_BAR_PAGES = 5
const SYMBOL_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._-]*(?:\/[A-Za-z0-9][A-Za-z0-9._-]*)?$/

const coinMarketCapResponse = z.object({
  data: z.record(
    z.string(),
    z.object({
      symbol: z.string(),
      quote: z.object({ USD: z.object({ price: z.number().finite() }) }),
    }),
  ),
  status: z.object({
    error_code: z.number(),
    error_message: z.string().nullable(),
  }),
})

const latestTradeResponse = z.object({
  trade: z.object({ p: z.number().finite().optional() }).optional(),
})

const alpacaBar = z.object({ t: z.string(), c: z.number().finite() })
const alpacaBarsResponse = z.object({
  bars: z
    .union([z.array(alpacaBar), z.record(z.string(), z.array(alpacaBar))])
    .optional(),
  next_page_token: z.string().nullable().optional(),
})

const requireApprovedUser = async () => {
  const { isAuthenticated } = await auth()
  if (!isAuthenticated) {
    throw new Error('Approved account access is required for live market data')
  }
}

const fetchWithTimeout = async (url: string, init?: RequestInit) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

const fetchCryptoPrices = async (
  symbols: string[],
): Promise<Record<string, number>> => {
  const apiKey = process.env.COINMARKETCAP_API_KEY
  if (!apiKey) {
    console.warn('CoinMarketCap API key not set. Skipping crypto price fetch.')
    return {}
  }

  const validSymbols = symbols.filter((s) => s && s.trim().length > 0)
  if (validSymbols.length === 0) return {}

  const symbolsToFetch = [...new Set(validSymbols)].slice(0, MAX_CRYPTO_SYMBOLS)
  const url = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbolsToFetch.join(',')}&aux=cmc_rank`

  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        'X-CMC_PRO_API_KEY': apiKey,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      console.error(
        `CoinMarketCap API error: ${response.status} ${response.statusText}`,
        await response.text(),
      )
      return {}
    }
    const parsed = coinMarketCapResponse.safeParse(await response.json())
    if (!parsed.success) {
      console.error('CoinMarketCap returned an invalid response')
      return {}
    }
    const data = parsed.data
    if (data.status.error_code !== 0) {
      console.error(
        `CoinMarketCap API error: ${data.status.error_message || 'Unknown error'}`,
      )
      return {}
    }

    const priceMap: Record<string, number> = {}
    Object.values(data.data).forEach((asset) => {
      priceMap[asset.symbol.toUpperCase()] = asset.quote.USD.price
    })
    return priceMap
  } catch (error) {
    console.error('Error fetching batch crypto prices:', error)
    return {}
  }
}

const fetchTraditionalPrice = async (
  symbol: string,
): Promise<number | null> => {
  const keyId = process.env.ALPACA_API_KEY_ID
  const secret = process.env.ALPACA_SECRET_KEY
  if (!keyId || !secret) {
    console.warn(
      'Alpaca API keys not set. Skipping traditional asset price fetch.',
    )
    return null
  }

  const encodedSymbol = encodeURIComponent(symbol.toUpperCase())
  const url = `https://data.alpaca.markets/v2/stocks/${encodedSymbol}/trades/latest`
  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        'APCA-API-KEY-ID': keyId,
        'APCA-API-SECRET-KEY': secret,
        Accept: 'application/json',
      },
    })
    if (!response.ok) {
      console.error(
        `Alpaca API error: ${response.status} ${response.statusText}`,
        await response.text(),
      )
      return null
    }
    const parsed = latestTradeResponse.safeParse(await response.json())
    if (!parsed.success) {
      console.error('Alpaca returned an invalid latest-trade response')
      return null
    }
    return parsed.data.trade?.p ?? null
  } catch (error) {
    console.error('Error fetching traditional asset price:', error)
    return null
  }
}

const marketSymbol = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .regex(SYMBOL_PATTERN, 'Invalid market symbol')

export const marketPricesInput = z.object({
  crypto: z.array(marketSymbol).max(MAX_CRYPTO_SYMBOLS),
  traditional: z.array(marketSymbol).max(MAX_TRADITIONAL_SYMBOLS),
})

const fetchTraditionalPrices = async (symbols: string[]) => {
  const uniqueSymbols = [...new Set(symbols)]
  const results: Array<{ symbol: string; price: number | null }> = []
  for (
    let index = 0;
    index < uniqueSymbols.length;
    index += TRADITIONAL_REQUEST_CONCURRENCY
  ) {
    const chunk = uniqueSymbols.slice(
      index,
      index + TRADITIONAL_REQUEST_CONCURRENCY,
    )
    results.push(
      ...(await Promise.all(
        chunk.map(async (symbol) => ({
          symbol: symbol.toUpperCase(),
          price: await fetchTraditionalPrice(symbol),
        })),
      )),
    )
  }
  return results
}

/**
 * Batch fetch market prices for open positions.
 * Returns a symbol -> price map; symbols without a price are omitted.
 */
export const getMarketPrices = createServerFn({ method: 'POST' })
  .validator(marketPricesInput)
  .handler(async ({ data }) => {
    await requireApprovedUser()
    const prices: Record<string, number> = {}

    const [cryptoPrices, traditionalResults] = await Promise.all([
      data.crypto.length > 0
        ? fetchCryptoPrices(data.crypto)
        : Promise.resolve({}),
      fetchTraditionalPrices(data.traditional),
    ])

    Object.assign(prices, cryptoPrices)
    for (const { symbol, price } of traditionalResults) {
      if (price !== null) prices[symbol] = price
    }

    return prices
  })

// ---------------------------------------------------------------------------
// Historical daily bars (for the Invalidation Lab's benchmark tests)

export interface DailyBar {
  date: string // YYYY-MM-DD
  close: number
}

const isoDate = z.iso.date()
export const dailyBarsInput = z
  .object({
    symbol: marketSymbol,
    start: isoDate,
    end: isoDate,
  })
  .superRefine(({ start, end }, context) => {
    const startTime = Date.parse(`${start}T00:00:00.000Z`)
    const endTime = Date.parse(`${end}T00:00:00.000Z`)
    const rangeDays = (endTime - startTime) / 86_400_000
    if (rangeDays < 0) {
      context.addIssue({
        code: 'custom',
        message: 'End date precedes start date',
      })
    } else if (rangeDays > MAX_BAR_RANGE_DAYS) {
      context.addIssue({
        code: 'custom',
        message: `Date range cannot exceed ${MAX_BAR_RANGE_DAYS} days`,
      })
    }
  })

/**
 * Daily closing bars from Alpaca. Symbols containing '/' (e.g. BTC/USD) use
 * the crypto endpoint, everything else the stocks endpoint (IEX feed, so it
 * works on free market-data plans). Returns [] when keys are missing.
 */
export const getDailyBars = createServerFn({ method: 'POST' })
  .validator(dailyBarsInput)
  .handler(async ({ data }): Promise<DailyBar[]> => {
    await requireApprovedUser()
    const keyId = process.env.ALPACA_API_KEY_ID
    const secret = process.env.ALPACA_SECRET_KEY
    if (!keyId || !secret) {
      console.warn('Alpaca API keys not set. Skipping historical bars fetch.')
      return []
    }

    const headers = {
      'APCA-API-KEY-ID': keyId,
      'APCA-API-SECRET-KEY': secret,
      Accept: 'application/json',
    }
    const isCrypto = data.symbol.includes('/')
    const symbol = data.symbol.toUpperCase()

    const bars: DailyBar[] = []
    let pageToken: string | null = null
    let pageCount = 0
    try {
      do {
        pageCount += 1
        const params = new URLSearchParams({
          timeframe: '1Day',
          start: data.start,
          end: data.end,
          limit: '10000',
        })
        if (pageToken) params.set('page_token', pageToken)

        let url: string
        if (isCrypto) {
          params.set('symbols', symbol)
          url = `https://data.alpaca.markets/v1beta3/crypto/us/bars?${params}`
        } else {
          params.set('feed', 'iex')
          params.set('adjustment', 'split')
          url = `https://data.alpaca.markets/v2/stocks/${encodeURIComponent(symbol)}/bars?${params}`
        }

        const response = await fetchWithTimeout(url, { headers })
        if (!response.ok) {
          console.error(
            `Alpaca bars API error: ${response.status} ${response.statusText}`,
            await response.text(),
          )
          return bars
        }
        const parsed = alpacaBarsResponse.safeParse(await response.json())
        if (!parsed.success) {
          console.error('Alpaca returned an invalid bars response')
          return bars
        }
        const json = parsed.data
        const rawBars = Array.isArray(json.bars)
          ? json.bars
          : (json.bars?.[symbol] ?? [])
        for (const bar of rawBars) {
          bars.push({ date: bar.t.slice(0, 10), close: bar.c })
        }
        pageToken = json.next_page_token ?? null
      } while (pageToken && pageCount < MAX_BAR_PAGES)
      if (pageToken) {
        console.warn(`Alpaca bars response exceeded ${MAX_BAR_PAGES} pages`)
      }
      return bars
    } catch (error) {
      console.error('Error fetching historical bars:', error)
      return bars
    }
  })
