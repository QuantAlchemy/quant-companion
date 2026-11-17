import type { Doc } from '../_generated/dataModel'

/**
 * Stop and target hit rules, shared by the hourly price check and its tests.
 * A long (buy) hits its stop at or below the stop and its target at or above
 * the target. A short (sell) is the mirror image.
 */

export type LevelKind = 'stop' | 'target'

export const levelHit = (
  tradeType: 'buy' | 'sell',
  kind: LevelKind,
  level: number,
  price: number,
) => {
  const priceFalls = (tradeType === 'buy') === (kind === 'stop')
  return priceFalls ? price <= level : price >= level
}

/** The levels of an open trade that can still alert. */
export const armedLevels = (trade: Doc<'trades'>) => {
  if (trade.status !== 'open' || trade.priceAlerts === false) return []
  const levels: { kind: LevelKind; level: number }[] = []
  if (trade.stopPrice != null && trade.stopHitAt == null) {
    levels.push({ kind: 'stop', level: trade.stopPrice })
  }
  if (trade.targetPrice != null && trade.targetHitAt == null) {
    levels.push({ kind: 'target', level: trade.targetPrice })
  }
  return levels
}

/** One crossed level, with the instrument and side its price was for. */
export type LevelHit = {
  tradeId: Doc<'trades'>['_id']
  kind: LevelKind
  level: number
  price: number
  assetName: string
  assetType: Doc<'trades'>['assetType']
  tradeType: Doc<'trades'>['tradeType']
}

/** Latest prices by asset type, so a stock and a coin with one ticker never mix. */
export type PricesByType = Record<
  Doc<'trades'>['assetType'],
  Partial<Record<string, number>>
>

/**
 * Every armed level the latest prices reached. A trade without a price is
 * skipped. When a gap passes both levels at once, only one can be true, so a
 * trade never reports both.
 */
export const findHits = (
  trades: Doc<'trades'>[],
  prices: PricesByType,
): LevelHit[] =>
  trades.flatMap((trade) => {
    const price = prices[trade.assetType][trade.assetName.toUpperCase()]
    if (price == null) return []
    return armedLevels(trade)
      .filter(({ kind, level }) =>
        levelHit(trade.tradeType, kind, level, price),
      )
      .map(({ kind, level }) => ({
        tradeId: trade._id,
        kind,
        level,
        price,
        assetName: trade.assetName,
        assetType: trade.assetType,
        tradeType: trade.tradeType,
      }))
  })
