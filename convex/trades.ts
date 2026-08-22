import { v } from 'convex/values'

import { mutation, query } from './_generated/server'

import type { MutationCtx, QueryCtx } from './_generated/server'

/**
 * Trades API — semantics mirror src/lib/journal.ts (which mirrors the
 * original trading-journal Convex backend). Auth comes from Clerk via the
 * "convex" JWT template.
 */

const requireUserIdentity = async (ctx: QueryCtx | MutationCtx) => {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new Error('User not authenticated')
  }
  return identity
}

const requireUserId = async (ctx: QueryCtx | MutationCtx): Promise<string> =>
  (await requireUserIdentity(ctx)).tokenIdentifier

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const MAX_IMPORT_BATCH = 50
const MAX_DELETE_BATCH = 100

const assertPositiveNumber = (value: number, label: string) => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a finite number greater than 0`)
  }
}

const assertIsoDate = (value: string, label: string) => {
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

const validateTradeInput = (trade: {
  assetName: string
  quantity: number
  price: number
  tradeDate: string
  commission?: number
  exchange?: string
  comments?: string
}) => {
  if (!trade.assetName.trim() || trade.assetName.trim().length > 32) {
    throw new Error('Asset name must be between 1 and 32 characters')
  }
  assertPositiveNumber(trade.quantity, 'Quantity')
  assertPositiveNumber(trade.price, 'Price')
  assertIsoDate(trade.tradeDate, 'Trade date')
  if (
    trade.commission != null &&
    (!Number.isFinite(trade.commission) || trade.commission < 0)
  ) {
    throw new Error('Commission must be a finite non-negative number')
  }
  assertOptionalText(trade.exchange, 'Exchange', 100)
  assertOptionalText(trade.comments, 'Comments', 10_000)
}

const tradeInput = {
  assetName: v.string(),
  assetType: v.union(v.literal('crypto'), v.literal('traditional')),
  quantity: v.number(),
  price: v.number(),
  tradeType: v.union(v.literal('buy'), v.literal('sell')),
  tradeDate: v.string(),
  commission: v.optional(v.number()),
  exchange: v.optional(v.string()),
  comments: v.optional(v.string()),
}

const realizedPnlFor = (
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

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []
    // Intentional: journal analytics require the complete account history.
    // Imports and deletes are bounded below to keep writes within limits.
    return await ctx.db
      .query('trades')
      .withIndex('by_userId', (q) => q.eq('userId', identity.tokenIdentifier))
      .order('desc')
      .collect()
  },
})

export const add = mutation({
  args: tradeInput,
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    validateTradeInput(args)
    return await ctx.db.insert('trades', {
      ...args,
      userId,
      assetName: args.assetName.trim().toUpperCase(),
      status: 'open',
    })
  },
})

export const edit = mutation({
  args: { tradeId: v.id('trades'), ...tradeInput },
  handler: async (ctx, { tradeId, ...args }) => {
    const userId = await requireUserId(ctx)
    validateTradeInput(args)
    const trade = await ctx.db.get(tradeId)
    if (!trade) throw new Error('Trade not found')
    if (trade.userId !== userId) throw new Error('Not authorized')

    await ctx.db.patch(tradeId, {
      ...args,
      assetName: args.assetName.trim().toUpperCase(),
    })
  },
})

export const close = mutation({
  args: {
    tradeId: v.id('trades'),
    closingPrice: v.number(),
    closingDate: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    const trade = await ctx.db.get(args.tradeId)
    if (!trade) throw new Error('Trade not found')
    if (trade.userId !== userId) throw new Error('Not authorized')
    if (trade.status === 'closed') throw new Error('Trade is already closed')
    assertPositiveNumber(args.closingPrice, 'Closing price')
    assertIsoDate(args.closingDate, 'Closing date')
    if (args.closingDate < trade.tradeDate) {
      throw new Error('Closing date cannot be before the trade date')
    }

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
    return { realizedPnl }
  },
})

export const split = mutation({
  args: {
    tradeId: v.id('trades'),
    closingPrice: v.number(),
    closingDate: v.string(),
    closingQuantity: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    const trade = await ctx.db.get(args.tradeId)
    if (!trade) throw new Error('Trade not found')
    if (trade.userId !== userId) throw new Error('Not authorized')
    if (trade.status === 'closed') throw new Error('Trade is already closed')
    assertPositiveNumber(args.closingPrice, 'Closing price')
    assertIsoDate(args.closingDate, 'Closing date')
    if (args.closingDate < trade.tradeDate) {
      throw new Error('Closing date cannot be before the trade date')
    }
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
      commission:
        trade.commission != null
          ? (trade.commission * args.closingQuantity) / trade.quantity
          : undefined,
      exchange: trade.exchange,
      comments: trade.comments
        ? `${trade.comments} (Split from original trade)`
        : 'Split from original trade',
    })

    await ctx.db.patch(args.tradeId, {
      quantity: remainingQuantity,
      commission:
        trade.commission != null
          ? (trade.commission * remainingQuantity) / trade.quantity
          : undefined,
    })

    return { closedTradeId, realizedPnl }
  },
})

export const remove = mutation({
  args: { tradeIds: v.array(v.id('trades')) },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    if (args.tradeIds.length > MAX_DELETE_BATCH) {
      throw new Error(
        `Delete requests are limited to ${MAX_DELETE_BATCH} trades`,
      )
    }
    for (const tradeId of args.tradeIds) {
      const trade = await ctx.db.get(tradeId)
      if (!trade) continue
      if (trade.userId !== userId) throw new Error('Not authorized')
      await ctx.db.delete(tradeId)
    }
  },
})

export const importMany = mutation({
  args: {
    expectedSubject: v.string(),
    trades: v.array(
      v.object({
        ...tradeInput,
        sourceId: v.string(),
        status: v.union(v.literal('open'), v.literal('closed')),
        closingPrice: v.optional(v.number()),
        closingDate: v.optional(v.string()),
        realizedPnl: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await requireUserIdentity(ctx)
    // The client subject only prevents a stale batch after an account switch.
    // Ownership still comes exclusively from the authenticated token.
    if (identity.subject !== args.expectedSubject) {
      throw new Error('Signed-in account changed during import')
    }
    const userId = identity.tokenIdentifier
    if (args.trades.length > MAX_IMPORT_BATCH) {
      throw new Error(
        `Import batches are limited to ${MAX_IMPORT_BATCH} trades`,
      )
    }
    let inserted = 0
    let skipped = 0
    // Each Convex mutation is transactional. A validation error rolls back
    // this batch; the client reports progress from earlier committed batches.
    for (const trade of args.trades) {
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
        skipped += 1
        continue
      }
      await ctx.db.insert('trades', {
        ...trade,
        userId,
        assetName: trade.assetName.trim().toUpperCase(),
      })
      inserted += 1
    }
    return { inserted, skipped }
  },
})
