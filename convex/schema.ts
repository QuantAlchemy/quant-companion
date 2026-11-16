import { authTables } from '@convex-dev/auth/server'
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

// Mirrors src/lib/journal.ts JournalTrade. userId is Clerk's stable
// identity.tokenIdentifier, so every query stays scoped to one auth identity.
export default defineSchema({
  // Preserve the legacy Convex Auth tables during the Clerk transition. They
  // are no longer used for new sessions, but their records remain intact.
  ...authTables,
  trades: defineTable({
    userId: v.string(),
    sourceId: v.optional(v.string()),
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
    initialRisk: v.optional(v.number()), // dollars allocated to this portion
    exchange: v.optional(v.string()),
    comments: v.optional(v.string()),
    // Price levels. A level alerts once when the price reaches it. Changing
    // the level clears its hit time, so it can alert again.
    stopPrice: v.optional(v.number()),
    targetPrice: v.optional(v.number()),
    priceAlerts: v.optional(v.boolean()), // absent means on
    stopHitAt: v.optional(v.number()),
    targetHitAt: v.optional(v.number()),
  })
    .index('by_userId', ['userId'])
    .index('by_userId_and_assetName', ['userId', 'assetName'])
    .index('by_userId_and_status', ['userId', 'status'])
    .index('by_userId_and_sourceId', ['userId', 'sourceId'])
    // The price check reads open trades across all users.
    .index('by_status', ['status']),
  // One row each time a trade reaches its stop or target.
  alerts: defineTable({
    userId: v.string(),
    tradeId: v.id('trades'),
    kind: v.union(v.literal('stop'), v.literal('target')),
    assetName: v.string(),
    tradeType: v.union(v.literal('buy'), v.literal('sell')),
    level: v.number(),
    price: v.number(), // the price that crossed the level
    readAt: v.optional(v.number()),
    pushedAt: v.optional(v.number()),
    emailedAt: v.optional(v.number()),
  })
    .index('by_userId', ['userId'])
    .index('by_userId_and_readAt', ['userId', 'readAt']),
  // Optional alert channels. In-app alerts are always on.
  alertSettings: defineTable({
    userId: v.string(),
    email: v.boolean(),
    // Captured from the sign-in token when email is turned on, because the
    // scheduled job runs without a signed-in user.
    emailAddress: v.optional(v.string()),
  }).index('by_userId', ['userId']),
  // One row for each browser that allowed notifications.
  pushSubscriptions: defineTable({
    userId: v.string(),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
  })
    .index('by_userId', ['userId'])
    .index('by_endpoint', ['endpoint']),
  // Results of agent writes, keyed by the agent's request ID, so a retried
  // MCP call returns the first result instead of writing twice.
  agentRequests: defineTable({
    userId: v.string(),
    requestId: v.string(),
    input: v.string(), // JSON of the original arguments
    result: v.string(), // JSON of the original result
  }).index('by_userId_and_requestId', ['userId', 'requestId']),
})
