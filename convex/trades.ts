import { v } from 'convex/values'

import { mutation, query } from './_generated/server'
import {
  addTrade,
  closeTrade,
  editInput,
  editTrade,
  importTrades,
  importedTrade,
  listTrades,
  removeTrades,
  splitTrade,
  tradeInput,
} from './model/trades'

import type { MutationCtx, QueryCtx } from './_generated/server'

/**
 * Trades API — semantics mirror src/lib/journal.ts (which mirrors the
 * original trading-journal Convex backend). Auth comes from Clerk via the
 * "convex" JWT template. The rules live in model/trades.ts, which the MCP
 * server shares.
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

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []
    // Intentional: journal analytics require the complete account history.
    // Imports and deletes are bounded below to keep writes within limits.
    return await listTrades(ctx, identity.tokenIdentifier)
  },
})

export const add = mutation({
  args: tradeInput,
  handler: async (ctx, args) => addTrade(ctx, await requireUserId(ctx), args),
})

export const edit = mutation({
  args: { tradeId: v.id('trades'), ...editInput },
  handler: async (ctx, { tradeId, ...args }) =>
    editTrade(ctx, await requireUserId(ctx), tradeId, args),
})

export const close = mutation({
  args: {
    tradeId: v.id('trades'),
    closingPrice: v.number(),
    closingDate: v.string(),
  },
  handler: async (ctx, args) => closeTrade(ctx, await requireUserId(ctx), args),
})

export const split = mutation({
  args: {
    tradeId: v.id('trades'),
    closingPrice: v.number(),
    closingDate: v.string(),
    closingQuantity: v.number(),
  },
  handler: async (ctx, args) => splitTrade(ctx, await requireUserId(ctx), args),
})

export const remove = mutation({
  args: { tradeIds: v.array(v.id('trades')) },
  handler: async (ctx, args) =>
    removeTrades(ctx, await requireUserId(ctx), args.tradeIds),
})

export const importMany = mutation({
  args: {
    expectedSubject: v.string(),
    trades: v.array(importedTrade),
  },
  handler: async (ctx, args) => {
    const identity = await requireUserIdentity(ctx)
    // The client subject only prevents a stale batch after an account switch.
    // Ownership still comes exclusively from the authenticated token.
    if (identity.subject !== args.expectedSubject) {
      throw new Error('Signed-in account changed during import')
    }
    return importTrades(ctx, identity.tokenIdentifier, args.trades)
  },
})
