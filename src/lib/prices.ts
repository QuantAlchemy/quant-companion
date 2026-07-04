import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

/**
 * Live market prices, fetched server-side so API keys never reach the client.
 * Both providers are optional — without keys the journal simply shows
 * open trades without live unrealized P&L.
 *
 * Env: COINMARKETCAP_API_KEY, ALPACA_API_KEY_ID, ALPACA_SECRET_KEY
 */

interface CoinMarketCapResponse {
  data: {
    [key: string]: {
      symbol: string
      quote: { USD: { price: number } }
    }
  }
  status: { error_code: number; error_message: string | null }
}

const fetchCryptoPrices = async (
  symbols: string[]
): Promise<Record<string, number>> => {
  const apiKey = process.env.COINMARKETCAP_API_KEY
  if (!apiKey) {
    console.warn('CoinMarketCap API key not set. Skipping crypto price fetch.')
    return {}
  }

  const validSymbols = symbols.filter((s) => s && s.trim().length > 0)
  if (validSymbols.length === 0) return {}

  // CoinMarketCap batches up to ~100 symbols per call
  const symbolsToFetch = validSymbols.slice(0, 100)
  const url = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbolsToFetch.join(',')}&aux=cmc_rank`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(url, {
      headers: {
        'X-CMC_PRO_API_KEY': apiKey,
        Accept: 'application/json',
      },
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error(
        `CoinMarketCap API error: ${response.status} ${response.statusText}`,
        await response.text()
      )
      return {}
    }
    const data = (await response.json()) as CoinMarketCapResponse
    if (data.status.error_code !== 0) {
      console.error(
        `CoinMarketCap API error: ${data.status.error_message || 'Unknown error'}`
      )
      return {}
    }

    const priceMap: Record<string, number> = {}
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- API may omit `data`
    Object.values(data.data || {}).forEach((asset) => {
      priceMap[asset.symbol.toUpperCase()] = asset.quote.USD.price
    })
    return priceMap
  } catch (error) {
    console.error('Error fetching batch crypto prices:', error)
    return {}
  }
}

const fetchTraditionalPrice = async (symbol: string): Promise<number | null> => {
  const keyId = process.env.ALPACA_API_KEY_ID
  const secret = process.env.ALPACA_SECRET_KEY
  if (!keyId || !secret) {
    console.warn('Alpaca API keys not set. Skipping traditional asset price fetch.')
    return null
  }

  const url = `https://data.alpaca.markets/v2/stocks/${symbol.toUpperCase()}/trades/latest`
  try {
    const response = await fetch(url, {
      headers: {
        'APCA-API-KEY-ID': keyId,
        'APCA-API-SECRET-KEY': secret,
        Accept: 'application/json',
      },
    })
    if (!response.ok) {
      console.error(
        `Alpaca API error: ${response.status} ${response.statusText}`,
        await response.text()
      )
      return null
    }
    const data = (await response.json()) as { trade?: { p?: number } }
    return data.trade?.p ?? null
  } catch (error) {
    console.error('Error fetching traditional asset price:', error)
    return null
  }
}

const pricesInput = z.object({
  crypto: z.array(z.string()),
  traditional: z.array(z.string()),
})

/**
 * Batch fetch market prices for open positions.
 * Returns a symbol -> price map; symbols without a price are omitted.
 */
export const getMarketPrices = createServerFn({ method: 'POST' })
  .inputValidator(pricesInput)
  .handler(async ({ data }) => {
    const prices: Record<string, number> = {}

    const [cryptoPrices, traditionalResults] = await Promise.all([
      data.crypto.length > 0
        ? fetchCryptoPrices(data.crypto)
        : Promise.resolve({}),
      Promise.all(
        [...new Set(data.traditional)].map(async (symbol) => ({
          symbol: symbol.toUpperCase(),
          price: await fetchTraditionalPrice(symbol),
        }))
      ),
    ])

    Object.assign(prices, cryptoPrices)
    for (const { symbol, price } of traditionalResults) {
      if (price !== null) prices[symbol] = price
    }

    return prices
  })
