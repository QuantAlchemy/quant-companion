/** Portable trade-file helpers shared by the Convex-backed journal UI. */

export type AssetType = 'crypto' | 'traditional'
export type TradeType = 'buy' | 'sell'
export type TradeStatus = 'open' | 'closed'

export interface JournalTrade {
  id: string
  sourceId?: string
  assetName: string
  assetType: AssetType
  quantity: number
  price: number
  tradeType: TradeType
  tradeDate: string
  status: TradeStatus
  closingPrice?: number
  closingDate?: string
  /** Gross P&L. Keep commission separate in storage and exports. */
  realizedPnl?: number
  commission?: number
  initialRisk?: number
  exchange?: string
  comments?: string
  createdAt: number
}

/** Deduct recorded commission once when displaying journal P&L. */
export const netJournalPnl = (grossPnl: number | undefined, commission = 0) =>
  grossPnl == null ? null : grossPnl - commission

export interface NewTrade {
  assetName: string
  assetType: AssetType
  quantity: number
  price: number
  tradeType: TradeType
  tradeDate: string
  commission?: number
  initialRisk?: number
  exchange?: string
  comments?: string
}

export type JournalTradeData = Omit<JournalTrade, 'id' | 'createdAt'>

export type AccountTradeData = JournalTradeData

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isIsoDate = (value: string) => {
  if (!ISO_DATE.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return (
    !Number.isNaN(parsed.valueOf()) && parsed.toISOString().startsWith(value)
  )
}

const requiredString = (
  value: unknown,
  label: string,
  index: number,
  maximumLength?: number,
): string => {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (
    normalized.length === 0 ||
    (maximumLength != null && normalized.length > maximumLength)
  ) {
    throw new Error(`Trade ${index + 1} has an invalid ${label}`)
  }
  return normalized
}

const optionalString = (
  value: unknown,
  label: string,
  index: number,
  maximumLength?: number,
): string | undefined => {
  if (value == null) return undefined
  if (
    typeof value !== 'string' ||
    (maximumLength != null && value.length > maximumLength)
  ) {
    throw new Error(`Trade ${index + 1} has an invalid ${label}`)
  }
  return value
}

const finiteNumber = (
  value: unknown,
  label: string,
  index: number,
  minimum?: number,
): number => {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    (minimum != null && value < minimum)
  ) {
    throw new Error(`Trade ${index + 1} has an invalid ${label}`)
  }
  return value
}

const optionalFiniteNumber = (
  value: unknown,
  label: string,
  index: number,
  minimum?: number,
): number | undefined => {
  if (value == null) return undefined
  return finiteNumber(value, label, index, minimum)
}

const realizedPnlFor = (
  tradeType: TradeType,
  entryPrice: number,
  closingPrice: number,
  quantity: number,
) => {
  const entryValue = entryPrice * quantity
  const closingValue = closingPrice * quantity
  return tradeType === 'buy'
    ? closingValue - entryValue
    : entryValue - closingValue
}

export const tradeSignature = (trade: JournalTradeData) =>
  JSON.stringify([
    trade.assetName.toUpperCase(),
    trade.assetType,
    trade.quantity,
    trade.price,
    trade.tradeType,
    trade.tradeDate,
    trade.status,
    trade.closingPrice ?? null,
    trade.closingDate ?? null,
    trade.realizedPnl ?? null,
    trade.commission ?? null,
    trade.exchange ?? null,
    trade.comments ?? null,
    // Preserve the source IDs of backups created before risk was recorded.
    ...(trade.initialRisk == null ? [] : [trade.initialRisk]),
  ])

const stableHash = (input: string) => {
  let first = 0x811c9dc5
  let second = 0x9e3779b9
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index)
    first = Math.imul(first ^ code, 0x01000193)
    second = Math.imul(second ^ code, 0x85ebca6b)
  }
  const hex = (value: number) => (value >>> 0).toString(16).padStart(8, '0')
  return `${hex(first)}${hex(second)}`
}

/** Stable, compact key used to make cloud imports safe to repeat. */
export function tradeImportSourceId(trade: JournalTradeData) {
  return `import:${stableHash(tradeSignature(trade))}`
}

/** Preserve identical trades while keeping repeated imports idempotent. */
export function prepareTradeImport(trades: JournalTradeData[]) {
  const occurrences = new Map<string, number>()
  const sourceIds = new Set(
    trades.flatMap((trade) => (trade.sourceId == null ? [] : [trade.sourceId])),
  )
  return trades.map((trade) => {
    // Exported import IDs survive edits; older files still use content identity.
    if (trade.sourceId != null) return { ...trade, sourceId: trade.sourceId }
    const baseSourceId = tradeImportSourceId(trade)
    let occurrence = occurrences.get(baseSourceId) ?? 0
    let sourceId: string
    do {
      sourceId =
        occurrence === 0 ? baseSourceId : `${baseSourceId}:${occurrence}`
      occurrence += 1
    } while (sourceIds.has(sourceId))
    occurrences.set(baseSourceId, occurrence)
    sourceIds.add(sourceId)
    return {
      ...trade,
      sourceId,
    }
  })
}

/** Prepare only browser trades not already represented in the cloud account. */
export function prepareMissingTradeImport(
  browserTrades: JournalTradeData[],
  accountTrades: AccountTradeData[],
) {
  const preparedBrowserTrades = prepareTradeImport(browserTrades)
  const unusedAccountIndexes = new Set(accountTrades.keys())
  const accountIndexBySourceId = new Map<string, number>()
  for (const [accountIndex, accountTrade] of accountTrades.entries()) {
    if (accountTrade.sourceId != null) {
      accountIndexBySourceId.set(accountTrade.sourceId, accountIndex)
    }
  }
  const matchingRiskByBrowserIndex = new Map<number, boolean>()

  for (const [browserIndex, browserTrade] of preparedBrowserTrades.entries()) {
    const accountIndex = accountIndexBySourceId.get(browserTrade.sourceId)
    if (accountIndex == null) continue
    unusedAccountIndexes.delete(accountIndex)
    matchingRiskByBrowserIndex.set(
      browserIndex,
      accountTrades[accountIndex].initialRisk === browserTrade.initialRisk,
    )
  }

  const accountOccurrences = new Map<string, number>()
  for (const accountIndex of unusedAccountIndexes) {
    const trade = accountTrades[accountIndex]
    const signature = tradeSignature(trade)
    accountOccurrences.set(
      signature,
      (accountOccurrences.get(signature) ?? 0) + 1,
    )
  }

  return preparedBrowserTrades.filter((trade, browserIndex) => {
    const matchingRisk = matchingRiskByBrowserIndex.get(browserIndex)
    // Let the importer report risk conflicts instead of marking them migrated.
    if (matchingRisk !== undefined) return !matchingRisk
    const signature = tradeSignature(trade)
    const remaining = accountOccurrences.get(signature) ?? 0
    if (remaining === 0) return true
    accountOccurrences.set(signature, remaining - 1)
    return false
  })
}

const legacyJournalKey = (userId: string) => `qc:${userId}:journal`
const legacyMigrationKey = (userId: string) =>
  `qc:${userId}:journal:convex-migrated-v1`

/** Read the previous account-scoped browser journal without altering it. */
export function readLegacyBrowserJournal(userId: string) {
  if (typeof window === 'undefined') return null
  if (window.localStorage.getItem(legacyMigrationKey(userId)) === '1') {
    return null
  }
  const storedJournal = window.localStorage.getItem(legacyJournalKey(userId))
  return storedJournal ? parseTradeFile(storedJournal) : null
}

/** Mark a successful migration while retaining the browser journal as backup. */
export function markLegacyBrowserJournalMigrated(userId: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(legacyMigrationKey(userId), '1')
}

/** Export the account journal without Convex or ownership fields. */
export function serializeTrades(trades: JournalTrade[]): string {
  const exportData = trades.map(({ id, createdAt, ...rest }) => rest)
  return JSON.stringify(exportData, null, 2)
}

const parseDocuments = (input: string): unknown[] => {
  const trimmed = input.trim()
  if (!trimmed) throw new Error('Trade file is empty')

  try {
    const json = JSON.parse(trimmed) as unknown
    if (Array.isArray(json)) return json
    if (isRecord(json)) return [json]
    throw new Error('Expected an array of trades or JSONL trade documents')
  } catch (error) {
    if (error instanceof SyntaxError) {
      try {
        return trimmed
          .split('\n')
          .filter((line) => line.trim().length > 0)
          .map((line) => JSON.parse(line) as unknown)
      } catch {
        throw new Error('File is neither a JSON array nor valid JSONL')
      }
    }
    throw error
  }
}

/**
 * Parse a journal JSON export or Convex snapshot JSONL. Unknown fields such as
 * user IDs and Convex system fields are ignored, while journal fields are
 * validated before they can reach a mutation.
 */
export function parseTradeFile(input: string): JournalTradeData[] {
  return parseDocuments(input).map((value, index) => {
    if (!isRecord(value)) {
      throw new Error(`Trade ${index + 1} must be a JSON object`)
    }

    const assetName = requiredString(value.assetName, 'asset name', index, 32)
    const assetType = value.assetType
    if (assetType !== 'crypto' && assetType !== 'traditional') {
      throw new Error(`Trade ${index + 1} has an invalid asset type`)
    }
    const tradeType = value.tradeType
    if (tradeType !== 'buy' && tradeType !== 'sell') {
      throw new Error(`Trade ${index + 1} has an invalid trade type`)
    }
    const status = value.status ?? 'open'
    if (status !== 'open' && status !== 'closed') {
      throw new Error(`Trade ${index + 1} has an invalid status`)
    }

    const tradeDate = requiredString(value.tradeDate, 'trade date', index)
    if (!isIsoDate(tradeDate)) {
      throw new Error(`Trade ${index + 1} has an invalid trade date`)
    }

    const quantity = finiteNumber(value.quantity, 'quantity', index, 0)
    const price = finiteNumber(value.price, 'entry price', index, 0)
    if (quantity === 0 || price === 0) {
      throw new Error(
        `Trade ${index + 1} must have positive quantity and price`,
      )
    }

    const initialRisk = optionalFiniteNumber(
      value.initialRisk,
      'initial risk',
      index,
      0,
    )
    if (initialRisk === 0) {
      throw new Error(`Trade ${index + 1} must have a positive initial risk`)
    }
    const closingPrice = optionalFiniteNumber(
      value.closingPrice,
      'closing price',
      index,
      0,
    )
    if (closingPrice === 0) {
      throw new Error(`Trade ${index + 1} must have a positive closing price`)
    }
    const closingDate = optionalString(value.closingDate, 'closing date', index)
    if (closingDate != null && !isIsoDate(closingDate)) {
      throw new Error(`Trade ${index + 1} has an invalid closing date`)
    }
    if (closingDate != null && closingDate < tradeDate) {
      throw new Error(`Trade ${index + 1} closes before its entry date`)
    }

    const storedRealizedPnl = optionalFiniteNumber(
      value.realizedPnl,
      'realized P&L',
      index,
    )
    const realizedPnl =
      status === 'closed' && storedRealizedPnl == null && closingPrice != null
        ? realizedPnlFor(tradeType, price, closingPrice, quantity)
        : storedRealizedPnl

    return {
      sourceId:
        value.sourceId == null
          ? undefined
          : requiredString(value.sourceId, 'import source ID', index, 128),
      assetName: assetName.toUpperCase(),
      assetType,
      quantity,
      price,
      tradeType,
      tradeDate,
      status,
      closingPrice,
      closingDate,
      realizedPnl,
      initialRisk,
      commission: optionalFiniteNumber(
        value.commission,
        'commission',
        index,
        0,
      ),
      exchange: optionalString(value.exchange, 'exchange', index, 100),
      comments: optionalString(value.comments, 'comments', index, 10_000),
    }
  })
}
