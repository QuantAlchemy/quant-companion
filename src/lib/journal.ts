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
        : t
    )
  )
}

const realizedPnlFor = (
  tradeType: TradeType,
  entryPrice: number,
  closingPrice: number,
  quantity: number
) => {
  const entryValue = entryPrice * quantity
  const closingValue = closingPrice * quantity
  // sell = short position being bought back
  return tradeType === 'buy' ? closingValue - entryValue : entryValue - closingValue
}

export function closeTrade(id: string, closingPrice: number, closingDate: string) {
  let realizedPnl = 0
  update((trades) =>
    trades.map((t) => {
      if (t.id !== id || t.status === 'closed') return t
      realizedPnl = realizedPnlFor(t.tradeType, t.price, closingPrice, t.quantity)
      return { ...t, status: 'closed' as const, closingPrice, closingDate, realizedPnl }
    })
  )
  award('trade-closed')
  if (realizedPnl > 0) award('trade-won')
  return realizedPnl
}

/** Close part of a position: the closed portion becomes its own closed trade. */
export function splitTrade(
  id: string,
  closingPrice: number,
  closingDate: string,
  closingQuantity: number
) {
  const trade = journalStore.state.find((t) => t.id === id)
  if (!trade || trade.status === 'closed') return
  if (closingQuantity <= 0 || closingQuantity >= trade.quantity) {
    throw new Error(
      'Closing quantity must be greater than 0 and less than the total quantity'
    )
  }

  const realizedPnl = realizedPnlFor(
    trade.tradeType,
    trade.price,
    closingPrice,
    closingQuantity
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
        : t
    ),
  ])
  award('trade-closed')
  if (realizedPnl > 0) award('trade-won')
  return realizedPnl
}

export function deleteTrades(ids: string[]) {
  const toDelete = new Set(ids)
  update((trades) => trades.filter((t) => !toDelete.has(t.id)))
}

/** Export the journal as a JSON download (lossless, re-importable). */
export function exportTrades(): string {
  const exportData = journalStore.state.map(({ id, createdAt, ...rest }) => rest)
  return JSON.stringify(exportData, null, 2)
}

/** Import trades from a JSON export; validates shape and merges into the journal. */
export function importTrades(json: string): number {
  const parsed = JSON.parse(json) as Partial<JournalTrade>[]
  if (!Array.isArray(parsed)) throw new Error('Expected an array of trades')

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
    const trade: JournalTrade = {
      id: newId(),
      assetName: String(raw.assetName).toUpperCase(),
      assetType: raw.assetType === 'crypto' ? 'crypto' : 'traditional',
      quantity: raw.quantity,
      price: raw.price,
      tradeType: raw.tradeType === 'sell' ? 'sell' : 'buy',
      tradeDate: raw.tradeDate,
      status: raw.status === 'closed' ? 'closed' : 'open',
      closingPrice: raw.closingPrice,
      closingDate: raw.closingDate,
      realizedPnl: raw.realizedPnl,
      commission: raw.commission,
      exchange: raw.exchange,
      comments: raw.comments,
      createdAt: Date.now() + index,
    }
    return trade
  })

  update((trades) => [...imported, ...trades])
  return imported.length
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
    { assetName: 'BTC', assetType: 'crypto', quantity: 0.5, price: 61250, tradeType: 'buy', tradeDate: daysAgo(45), exchange: 'Coinbase', comments: 'Breakout above range high on strong volume.' },
    { assetName: 'ETH', assetType: 'crypto', quantity: 4, price: 2980, tradeType: 'buy', tradeDate: daysAgo(38), exchange: 'Kraken', comments: 'ETH/BTC ratio basing; swing entry.' },
    { assetName: 'SOL', assetType: 'crypto', quantity: 60, price: 138, tradeType: 'buy', tradeDate: daysAgo(30), exchange: 'Binance' },
    { assetName: 'NVDA', assetType: 'traditional', quantity: 15, price: 118.4, tradeType: 'buy', tradeDate: daysAgo(24), exchange: 'Alpaca', comments: 'Earnings momentum continuation.' },
    { assetName: 'SPY', assetType: 'traditional', quantity: 10, price: 545.2, tradeType: 'sell', tradeDate: daysAgo(18), comments: 'Hedge against crypto exposure.' },
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
    t.realizedPnl = realizedPnlFor(t.tradeType, t.price, closingPrice, t.quantity)
  }
  update((trades) => [...created, ...trades])
}
