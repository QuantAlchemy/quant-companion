import { v } from 'convex/values'

import { mutation, query } from './_generated/server'

import type { MutationCtx, QueryCtx } from './_generated/server'

/**
 * Trades API — semantics mirror src/lib/journal.ts (which mirrors the
 * original trading-journal Convex backend). Auth comes from Clerk via the
 * "convex" JWT template.
 */

const requireUserId = async (ctx: QueryCtx | MutationCtx): Promise<string> => {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new Error('User not authenticated')
  }
  return identity.tokenIdentifier
}

const assertPositiveNumber = (value: number, label: string) => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a finite number greater than 0`)
  }
}

const validateTradeInput = (trade: { quantity: number; price: number }) => {
  assertPositiveNumber(trade.quantity, 'Quantity')
  assertPositiveNumber(trade.price, 'Price')
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
      assetName: args.assetName.toUpperCase(),
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
      assetName: args.assetName.toUpperCase(),
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
    trades: v.array(
      v.object({
        ...tradeInput,
        status: v.union(v.literal('open'), v.literal('closed')),
        closingPrice: v.optional(v.number()),
        closingDate: v.optional(v.string()),
        realizedPnl: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    for (const trade of args.trades) {
      validateTradeInput(trade)
      if (trade.closingPrice != null) {
        assertPositiveNumber(trade.closingPrice, 'Closing price')
      }
      await ctx.db.insert('trades', {
        ...trade,
        userId,
        assetName: trade.assetName.toUpperCase(),
      })
    }
    return args.trades.length
  },
})
