import { z } from 'zod'

/**
 * Latest market prices from CoinMarketCap (crypto) and Alpaca (stocks).
 * Shared by the journal's live prices (src/lib/prices.ts, on the web server)
 * and the hourly stop and target check (convex/alerts.ts, on Convex). Each
 * runtime passes its own copy of the keys. A provider without keys returns no
 * prices instead of failing.
 */

export type MarketDataKeys = {
  coinMarketCap?: string
  alpacaKeyId?: string
  alpacaSecret?: string
}

const REQUEST_TIMEOUT_MS = 10_000
export const MAX_CRYPTO_SYMBOLS = 100
const TRADITIONAL_REQUEST_CONCURRENCY = 5

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

export const fetchWithTimeout = async (url: string, init?: RequestInit) => {
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
  apiKey: string | undefined,
): Promise<Record<string, number>> => {
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
  keyId: string | undefined,
  secret: string | undefined,
): Promise<number | null> => {
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

const fetchTraditionalPrices = async (
  symbols: string[],
  keys: MarketDataKeys,
) => {
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
          price: await fetchTraditionalPrice(
            symbol,
            keys.alpacaKeyId,
            keys.alpacaSecret,
          ),
        })),
      )),
    )
  }
  return results
}

/** A symbol -> price map for both asset types. Symbols without a price are omitted. */
export const fetchMarketPrices = async (
  { crypto, traditional }: { crypto: string[]; traditional: string[] },
  keys: MarketDataKeys,
): Promise<Record<string, number>> => {
  const [cryptoPrices, traditionalResults] = await Promise.all([
    crypto.length > 0
      ? fetchCryptoPrices(crypto, keys.coinMarketCap)
      : Promise.resolve({}),
    fetchTraditionalPrices(traditional, keys),
  ])
  const prices: Record<string, number> = { ...cryptoPrices }
  for (const { symbol, price } of traditionalResults) {
    if (price !== null) prices[symbol] = price
  }
  return prices
}
