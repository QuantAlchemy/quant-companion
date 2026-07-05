import { Store } from '@tanstack/store'

import { award } from '@/lib/gamification'

/**
 * Trading journal — local-first persistence keyed per Clerk user.
 *
 * The operation semantics (close/split P&L math, validation) mirror the
 * original Convex trading-journal backend so exported data stays compatible.
 * Swapping localStorage for a hosted database only requires replacing the
 * `persist`/`load` pair and making the ops async.
 */

export type AssetType = 'crypto' | 'traditional'
export type TradeType = 'buy' | 'sell'
export type TradeStatus = 'open' | 'closed'

export interface JournalTrade {
  id: string
  assetName: string
  assetType: AssetType
  quantity: number
  price: number // entry price
  tradeType: TradeType
  tradeDate: string // ISO date (YYYY-MM-DD)
  status: TradeStatus
  closingPrice?: number
  closingDate?: string
  realizedPnl?: number
  commission?: number
  exchange?: string
  comments?: string
  createdAt: number
}

export interface NewTrade {
  assetName: string
  assetType: AssetType
  quantity: number
  price: number
  tradeType: TradeType
  tradeDate: string
  commission?: number
  exchange?: string
  comments?: string
}

let userKey = 'guest'
const storageKey = () => `qc:${userKey}:journal`

const load = (): JournalTrade[] => {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(storageKey())
    return raw ? (JSON.parse(raw) as JournalTrade[]) : []
  } catch {
    return []
  }
}

const persist = (trades: JournalTrade[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(storageKey(), JSON.stringify(trades))
}

export const journalStore = new Store<JournalTrade[]>([])

/** Swap the active user (Clerk user id or 'guest') and reload their journal. */
export function setJournalUser(id: string | null | undefined) {
  userKey = id ?? 'guest'
  journalStore.setState(() => load())
}

const update = (fn: (trades: JournalTrade[]) => JournalTrade[]) => {
  journalStore.setState((prev) => {
    const next = fn(prev)
    persist(next)
    return next
  })
}

const newId = () =>
  `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`

const realizedPnlFor = (
  tradeType: TradeType,
  entryPrice: number,
  closingPrice: number,
  quantity: number,
) => {
  const entryValue = entryPrice * quantity
  const closingValue = closingPrice * quantity
  // sell = short position being bought back
  return tradeType === 'buy'
    ? closingValue - entryValue
    : entryValue - closingValue
}

const tradeSignature = (trade: Omit<JournalTrade, 'id' | 'createdAt'>) =>
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
  ])

const dedupeTrades = (trades: JournalTrade[]) => {
  const seen = new Set<string>()
  const deduped: JournalTrade[] = []
  for (const trade of trades) {
    const { id: _id, createdAt: _createdAt, ...signatureInput } = trade
    const signature = tradeSignature(signatureInput)
    if (seen.has(signature)) continue
    seen.add(signature)
    deduped.push(trade)
  }
  return deduped
}

export function addTrade(input: NewTrade): JournalTrade {
  const trade: JournalTrade = {
    ...input,
    id: newId(),
    assetName: input.assetName.toUpperCase(),
    status: 'open',
    createdAt: Date.now(),
  }
  update((trades) => [trade, ...trades])
  award('trade-logged')
  if (input.comments?.trim()) award('note-added')
  return trade
}

export function editTrade(id: string, input: NewTrade) {
  update((trades) =>
    trades.map((t) =>
      t.id === id
        ? { ...t, ...input, assetName: input.assetName.toUpperCase() }
        : t,
    ),
  )
}

export function closeTrade(
  id: string,
  closingPrice: number,
  closingDate: string,
) {
  let realizedPnl = 0
  update((trades) =>
    trades.map((t) => {
      if (t.id !== id || t.status === 'closed') return t
      realizedPnl = realizedPnlFor(
        t.tradeType,
        t.price,
        closingPrice,
        t.quantity,
      )
      return {
        ...t,
        status: 'closed' as const,
        closingPrice,
        closingDate,
        realizedPnl,
      }
    }),
  )
  award('trade-closed')
  if (realizedPnl > 0) award('trade-won')
  if (realizedPnl < 0) award('trade-lost')
  return realizedPnl
}

/** Close part of a position: the closed portion becomes its own closed trade. */
export function splitTrade(
  id: string,
  closingPrice: number,
  closingDate: string,
  closingQuantity: number,
) {
  const trade = journalStore.state.find((t) => t.id === id)
  if (!trade || trade.status === 'closed') return
  if (closingQuantity <= 0 || closingQuantity >= trade.quantity) {
    throw new Error(
      'Closing quantity must be greater than 0 and less than the total quantity',
    )
  }

  const realizedPnl = realizedPnlFor(
    trade.tradeType,
    trade.price,
    closingPrice,
    closingQuantity,
  )
  const remainingQuantity = trade.quantity - closingQuantity

  const closedPortion: JournalTrade = {
    ...trade,
    id: newId(),
    quantity: closingQuantity,
    status: 'closed',
    closingPrice,
    closingDate,
    realizedPnl,
    commission: trade.commission
      ? (trade.commission * closingQuantity) / trade.quantity
      : undefined,
    comments: trade.comments
      ? `${trade.comments} (Split from original trade)`
      : 'Split from original trade',
    createdAt: Date.now(),
  }

  update((trades) => [
    closedPortion,
    ...trades.map((t) =>
      t.id === id
        ? {
            ...t,
            quantity: remainingQuantity,
            commission: t.commission
              ? (t.commission * remainingQuantity) / trade.quantity
              : undefined,
          }
        : t,
    ),
  ])
  award('trade-closed')
  if (realizedPnl > 0) award('trade-won')
  if (realizedPnl < 0) award('trade-lost')
  return realizedPnl
}

export function deleteTrades(ids: string[]) {
  const toDelete = new Set(ids)
  update((trades) => trades.filter((t) => !toDelete.has(t.id)))
}

/** Export the journal as a JSON download (lossless, re-importable). */
export function exportTrades(): string {
  const exportData = journalStore.state.map(
    ({ id, createdAt, ...rest }) => rest,
  )
  return JSON.stringify(exportData, null, 2)
}

/**
 * Import trades and merge them into the journal. Accepts either a JSON array
 * (this app's export, or the legacy trading-journal download) or JSONL — one
 * document per line — as produced by a Convex dashboard snapshot export.
 * Unknown fields (userId, _id, _creationTime, marketPrice, …) are ignored.
 */
export function importTrades(input: string): number {
  let parsed: Partial<JournalTrade>[]
  const trimmed = input.trim()
  try {
    const json = JSON.parse(trimmed) as unknown
    if (!Array.isArray(json)) throw new Error('Expected an array of trades')
    parsed = json as Partial<JournalTrade>[]
  } catch (arrayError) {
    // fall back to JSONL (Convex snapshot export: documents.jsonl)
    try {
      parsed = trimmed
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map((line) => JSON.parse(line) as Partial<JournalTrade>)
    } catch {
      throw arrayError instanceof Error
        ? arrayError
        : new Error('File is neither a JSON array nor JSONL')
    }
  }

  const imported = parsed.map((raw, index) => {
    if (
      !raw.assetName ||
      !raw.assetType ||
      typeof raw.quantity !== 'number' ||
      typeof raw.price !== 'number' ||
      !raw.tradeType ||
      !raw.tradeDate
    ) {
      throw new Error(`Trade ${index + 1} is missing required fields`)
    }
    const tradeType = raw.tradeType === 'sell' ? 'sell' : 'buy'
    const status = raw.status === 'closed' ? 'closed' : 'open'
    const realizedPnl =
      status === 'closed' &&
      raw.realizedPnl == null &&
      typeof raw.closingPrice === 'number'
        ? realizedPnlFor(tradeType, raw.price, raw.closingPrice, raw.quantity)
        : raw.realizedPnl
    const trade: JournalTrade = {
      id: newId(),
      assetName: String(raw.assetName).toUpperCase(),
      assetType: raw.assetType === 'crypto' ? 'crypto' : 'traditional',
      quantity: raw.quantity,
      price: raw.price,
      tradeType,
      tradeDate: raw.tradeDate,
      status,
      closingPrice: raw.closingPrice,
      closingDate: raw.closingDate,
      realizedPnl,
      commission: raw.commission,
      exchange: raw.exchange,
      comments: raw.comments,
      createdAt: Date.now() + index,
    }
    return trade
  })

  let addedCount = 0
  update((trades) => {
    const dedupedExisting = dedupeTrades(trades)
    const existingSignatures = new Set(
      dedupedExisting.map(({ id: _id, createdAt: _createdAt, ...trade }) =>
        tradeSignature(trade),
      ),
    )
    const newTrades = imported.filter(
      ({ id: _id, createdAt: _createdAt, ...trade }) =>
        !existingSignatures.has(tradeSignature(trade)),
    )
    addedCount = newTrades.length
    return [...newTrades, ...dedupedExisting]
  })
  if (addedCount > 0) award('journal-imported')
  return addedCount
}

/** Demo data so new users can explore the journal before logging real trades. */
export function loadDemoTrades() {
  const today = new Date()
  const daysAgo = (n: number) => {
    const d = new Date(today)
    d.setDate(d.getDate() - n)
    return d.toISOString().slice(0, 10)
  }
  const demo: NewTrade[] = [
    {
      assetName: 'BTC',
      assetType: 'crypto',
      quantity: 0.5,
      price: 61250,
      tradeType: 'buy',
      tradeDate: daysAgo(45),
      exchange: 'Coinbase',
      comments: 'Breakout above range high on strong volume.',
    },
    {
      assetName: 'ETH',
      assetType: 'crypto',
      quantity: 4,
      price: 2980,
      tradeType: 'buy',
      tradeDate: daysAgo(38),
      exchange: 'Kraken',
      comments: 'ETH/BTC ratio basing; swing entry.',
    },
    {
      assetName: 'SOL',
      assetType: 'crypto',
      quantity: 60,
      price: 138,
      tradeType: 'buy',
      tradeDate: daysAgo(30),
      exchange: 'Binance',
    },
    {
      assetName: 'NVDA',
      assetType: 'traditional',
      quantity: 15,
      price: 118.4,
      tradeType: 'buy',
      tradeDate: daysAgo(24),
      exchange: 'Alpaca',
      comments: 'Earnings momentum continuation.',
    },
    {
      assetName: 'SPY',
      assetType: 'traditional',
      quantity: 10,
      price: 545.2,
      tradeType: 'sell',
      tradeDate: daysAgo(18),
      comments: 'Hedge against crypto exposure.',
    },
  ]
  const closes: [number, number, number][] = [
    // [demo index, closingPrice, daysAgo]
    [0, 67400, 12],
    [2, 129.5, 9],
    [4, 552.8, 3],
  ]
  const created = demo.map((t) => {
    const trade: JournalTrade = {
      ...t,
      id: newId(),
      assetName: t.assetName.toUpperCase(),
      status: 'open',
      createdAt: Date.now(),
    }
    return trade
  })
  for (const [idx, closingPrice, closedDaysAgo] of closes) {
    const t = created[idx]
    t.status = 'closed'
    t.closingPrice = closingPrice
    t.closingDate = daysAgo(closedDaysAgo)
    t.realizedPnl = realizedPnlFor(
      t.tradeType,
      t.price,
      closingPrice,
      t.quantity,
    )
  }
  update((trades) => [...created, ...trades])
}
