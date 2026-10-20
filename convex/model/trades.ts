import { v } from 'convex/values'

import type { Infer } from 'convex/values'
import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'

/**
 * Trade rules shared by the browser API (trades.ts) and the MCP server
 * (mcp/journal.ts). Callers resolve the owner first: the browser from its
 * Clerk session, the MCP server from a verified OAuth token. Both store the
 * same Clerk tokenIdentifier, so the two paths see one journal.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
export const MAX_IMPORT_BATCH = 50
export const MAX_DELETE_BATCH = 100

export const assertPositiveNumber = (value: number, label: string) => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a finite number greater than 0`)
  }
}

export const assertIsoDate = (value: string, label: string) => {
  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (
    !ISO_DATE.test(value) ||
    Number.isNaN(parsed.valueOf()) ||
    !parsed.toISOString().startsWith(value)
  ) {
    throw new Error(`${label} must use a valid YYYY-MM-DD date`)
  }
}

const assertOptionalText = (
  value: string | undefined,
  label: string,
  maximumLength: number,
) => {
  if (value != null && value.length > maximumLength) {
    throw new Error(`${label} must be ${maximumLength} characters or fewer`)
  }
}

export const validateTradeInput = (trade: {
  assetName: string
  quantity: number
  price: number
  tradeDate: string
  commission?: number
  initialRisk?: number | null
  exchange?: string
  comments?: string
}) => {
  if (!trade.assetName.trim() || trade.assetName.trim().length > 32) {
    throw new Error('Asset name must be between 1 and 32 characters')
  }
  assertPositiveNumber(trade.quantity, 'Quantity')
  assertPositiveNumber(trade.price, 'Price')
  assertIsoDate(trade.tradeDate, 'Trade date')
  if (trade.initialRisk != null) {
    assertPositiveNumber(trade.initialRisk, 'Initial risk')
  }
  if (
    trade.commission != null &&
    (!Number.isFinite(trade.commission) || trade.commission < 0)
  ) {
    throw new Error('Commission must be a finite non-negative number')
  }
  assertOptionalText(trade.exchange, 'Exchange', 100)
  assertOptionalText(trade.comments, 'Comments', 10_000)
}

export const tradeInput = {
  assetName: v.string(),
  assetType: v.union(v.literal('crypto'), v.literal('traditional')),
  quantity: v.number(),
  price: v.number(),
  tradeType: v.union(v.literal('buy'), v.literal('sell')),
  tradeDate: v.string(),
  commission: v.optional(v.number()),
  initialRisk: v.optional(v.number()),
  exchange: v.optional(v.string()),
  comments: v.optional(v.string()),
}

export const editInput = {
  ...tradeInput,
  initialRisk: v.optional(v.union(v.number(), v.null())),
}

export const importedTrade = v.object({
  ...tradeInput,
  sourceId: v.string(),
  status: v.union(v.literal('open'), v.literal('closed')),
  closingPrice: v.optional(v.number()),
  closingDate: v.optional(v.string()),
  realizedPnl: v.optional(v.number()),
})

const tradeInputValidator = v.object(tradeInput)
const editInputValidator = v.object(editInput)
export type TradeInput = Infer<typeof tradeInputValidator>
export type EditInput = Infer<typeof editInputValidator>
export type ImportedTrade = Infer<typeof importedTrade>

export const normalizeAssetName = (assetName: string) =>
  assetName.trim().toUpperCase()

export const realizedPnlFor = (
  tradeType: 'buy' | 'sell',
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

/** Every trade for one owner, newest first. Journal analytics need the full history. */
export const listTrades = (ctx: QueryCtx, userId: string) =>
  ctx.db
    .query('trades')
    .withIndex('by_userId', (q) => q.eq('userId', userId))
    .order('desc')
    .collect()

export const getOwnedTrade = async (
  ctx: QueryCtx,
  userId: string,
  tradeId: Id<'trades'>,
) => {
  const trade = await ctx.db.get(tradeId)
  if (!trade) throw new Error('Trade not found')
  if (trade.userId !== userId) throw new Error('Not authorized')
  return trade
}

export const addTrade = async (
  ctx: MutationCtx,
  userId: string,
  args: TradeInput,
) => {
  validateTradeInput(args)
  return await ctx.db.insert('trades', {
    ...args,
    userId,
    assetName: normalizeAssetName(args.assetName),
    status: 'open',
  })
}

export const editTrade = async (
  ctx: MutationCtx,
  userId: string,
  tradeId: Id<'trades'>,
  args: EditInput,
) => {
  validateTradeInput(args)
  const trade = await getOwnedTrade(ctx, userId, tradeId)

  if (trade.closingDate != null && args.tradeDate > trade.closingDate) {
    throw new Error('Trade date cannot be after the closing date')
  }
  const calculationChanged =
    args.price !== trade.price ||
    args.quantity !== trade.quantity ||
    args.tradeType !== trade.tradeType
  let realizedPnl = trade.realizedPnl
  if (trade.status === 'closed' && calculationChanged) {
    if (trade.closingPrice == null) {
      throw new Error(
        'Cannot recalculate a closed trade without a closing price',
      )
    }
    assertPositiveNumber(trade.closingPrice, 'Closing price')
    realizedPnl = realizedPnlFor(
      args.tradeType,
      args.price,
      trade.closingPrice,
      args.quantity,
    )
    if (!Number.isFinite(realizedPnl)) {
      throw new Error('Realized P&L must be finite')
    }
  }

  await ctx.db.patch(tradeId, {
    ...args,
    // A cleared form field is omitted from the request; remove its saved fee.
    commission: args.commission,
    // Preserve supplied historical gross P&L when calculation inputs match.
    realizedPnl,
    assetName: normalizeAssetName(args.assetName),
    // Omission preserves risk for older clients; null explicitly clears it.
    initialRisk:
      args.initialRisk === null
        ? undefined
        : (args.initialRisk ?? trade.initialRisk),
  })
}

const assertCanClose = (
  trade: Doc<'trades'>,
  closingPrice: number,
  closingDate: string,
) => {
  if (trade.status === 'closed') throw new Error('Trade is already closed')
  assertPositiveNumber(closingPrice, 'Closing price')
  assertIsoDate(closingDate, 'Closing date')
  if (closingDate < trade.tradeDate) {
    throw new Error('Closing date cannot be before the trade date')
  }
}

export const closeTrade = async (
  ctx: MutationCtx,
  userId: string,
  args: { tradeId: Id<'trades'>; closingPrice: number; closingDate: string },
) => {
  const trade = await getOwnedTrade(ctx, userId, args.tradeId)
  assertCanClose(trade, args.closingPrice, args.closingDate)

  const realizedPnl = realizedPnlFor(
    trade.tradeType,
    trade.price,
    args.closingPrice,
    trade.quantity,
  )
  await ctx.db.patch(args.tradeId, {
    status: 'closed',
    closingPrice: args.closingPrice,
    closingDate: args.closingDate,
    realizedPnl,
  })
  return { realizedPnl, commission: trade.commission }
}

/** Close part of an open trade. The closed part becomes a new row; the original keeps the rest. */
export const splitTrade = async (
  ctx: MutationCtx,
  userId: string,
  args: {
    tradeId: Id<'trades'>
    closingPrice: number
    closingDate: string
    closingQuantity: number
  },
) => {
  const trade = await getOwnedTrade(ctx, userId, args.tradeId)
  assertCanClose(trade, args.closingPrice, args.closingDate)
  assertPositiveNumber(args.closingQuantity, 'Closing quantity')
  if (args.closingQuantity <= 0 || args.closingQuantity >= trade.quantity) {
    throw new Error(
      'Closing quantity must be greater than 0 and less than the total quantity',
    )
  }

  const realizedPnl = realizedPnlFor(
    trade.tradeType,
    trade.price,
    args.closingPrice,
    args.closingQuantity,
  )
  const remainingQuantity = trade.quantity - args.closingQuantity
  const closedRisk =
    trade.initialRisk == null
      ? undefined
      : trade.initialRisk * (args.closingQuantity / trade.quantity)
  const commission =
    trade.commission != null
      ? (trade.commission * args.closingQuantity) / trade.quantity
      : undefined

  const closedTradeId = await ctx.db.insert('trades', {
    userId,
    assetName: trade.assetName,
    assetType: trade.assetType,
    quantity: args.closingQuantity,
    price: trade.price,
    tradeType: trade.tradeType,
    tradeDate: trade.tradeDate,
    status: 'closed',
    closingPrice: args.closingPrice,
    closingDate: args.closingDate,
    realizedPnl,
    initialRisk: closedRisk,
    commission,
    exchange: trade.exchange,
    comments: trade.comments
      ? `${trade.comments} (Split from original trade)`
      : 'Split from original trade',
  })

  await ctx.db.patch(args.tradeId, {
    quantity: remainingQuantity,
    initialRisk:
      trade.initialRisk != null && closedRisk != null
        ? trade.initialRisk - closedRisk
        : undefined,
    commission:
      trade.commission != null
        ? (trade.commission * remainingQuantity) / trade.quantity
        : undefined,
  })

  return { closedTradeId, realizedPnl, commission }
}

export const removeTrades = async (
  ctx: MutationCtx,
  userId: string,
  tradeIds: Id<'trades'>[],
) => {
  if (tradeIds.length > MAX_DELETE_BATCH) {
    throw new Error(`Delete requests are limited to ${MAX_DELETE_BATCH} trades`)
  }
  for (const tradeId of tradeIds) {
    const trade = await ctx.db.get(tradeId)
    if (!trade) continue
    if (trade.userId !== userId) throw new Error('Not authorized')
    await ctx.db.delete(tradeId)
  }
}

/** Insert trades by stable source ID, so repeating an import adds nothing. */
export const importTrades = async (
  ctx: MutationCtx,
  userId: string,
  trades: ImportedTrade[],
) => {
  if (trades.length > MAX_IMPORT_BATCH) {
    throw new Error(`Import batches are limited to ${MAX_IMPORT_BATCH} trades`)
  }
  let inserted = 0
  let skipped = 0
  let conflicts = 0
  // Each Convex mutation is transactional. A validation error rolls back
  // this batch; the client reports progress from earlier committed batches.
  for (const trade of trades) {
    validateTradeInput(trade)
    if (trade.closingPrice != null) {
      assertPositiveNumber(trade.closingPrice, 'Closing price')
    }
    if (trade.closingDate != null) {
      assertIsoDate(trade.closingDate, 'Closing date')
      if (trade.closingDate < trade.tradeDate) {
        throw new Error('Closing date cannot be before the trade date')
      }
    }
    if (trade.realizedPnl != null && !Number.isFinite(trade.realizedPnl)) {
      throw new Error('Realized P&L must be finite')
    }
    if (!trade.sourceId || trade.sourceId.length > 128) {
      throw new Error('Import source ID must be between 1 and 128 characters')
    }
    const existing = await ctx.db
      .query('trades')
      .withIndex('by_userId_and_sourceId', (q) =>
        q.eq('userId', userId).eq('sourceId', trade.sourceId),
      )
      .unique()
    if (existing) {
      // Keep current risk and report conflicts without blocking other records.
      if (existing.initialRisk !== trade.initialRisk) {
        conflicts += 1
        continue
      }
      skipped += 1
      continue
    }
    await ctx.db.insert('trades', {
      ...trade,
      userId,
      assetName: normalizeAssetName(trade.assetName),
    })
    inserted += 1
  }
  return { inserted, skipped, conflicts }
}
