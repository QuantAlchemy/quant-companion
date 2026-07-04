import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

// Mirrors src/lib/journal.ts JournalTrade. userId is the Clerk user id
// (identity.subject) — Clerk owns user records, so there is no users table.
export default defineSchema({
  trades: defineTable({
    userId: v.string(),
    assetName: v.string(),
    assetType: v.union(v.literal('crypto'), v.literal('traditional')),
    quantity: v.number(),
    price: v.number(), // entry price
    tradeType: v.union(v.literal('buy'), v.literal('sell')),
    tradeDate: v.string(), // ISO date

    status: v.union(v.literal('open'), v.literal('closed')),
    closingPrice: v.optional(v.number()),
    closingDate: v.optional(v.string()),
    realizedPnl: v.optional(v.number()),
    commission: v.optional(v.number()),
    exchange: v.optional(v.string()),
    comments: v.optional(v.string()),
  })
    .index('by_userId', ['userId'])
    .index('by_userId_and_status', ['userId', 'status']),
})
