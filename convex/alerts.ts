import { v } from 'convex/values'

import { internal } from './_generated/api'
import {
  env,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from './_generated/server'
import { MAX_CRYPTO_SYMBOLS, fetchMarketPrices } from '../src/lib/marketData'
import {
  alertEmail,
  alertSummary,
  alertTitle,
  sendResendEmail,
} from './model/alertMessage'
import { armedLevels, findHits } from './model/levels'
import type { PricesByType } from './model/levels'

import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'

/**
 * Stop and target alerts. Every hour `checkLevels` (crons.ts) reads the open
 * trades with an armed level, fetches their prices, and records each level the
 * price reached. A level alerts once: `recordHits` stamps its hit time on the
 * trade, and an edit to the level clears it (model/trades.ts). Each new alert
 * then goes to the browser (push.ts) and by email when the user turned those on.
 * In-app alerts need no delivery: the inbox reads this table live.
 */

const INBOX_SIZE = 30
const UNREAD_LIMIT = 99

/**
 * Push services of Chrome and most Chromium browsers, Firefox, Edge, and
 * Safari. The server posts to the endpoint, so it must be one of these.
 */
const PUSH_HOSTS = [
  'fcm.googleapis.com',
  'push.services.mozilla.com',
  'notify.windows.com',
  'push.apple.com',
]

const isPushEndpoint = (endpoint: string) => {
  try {
    const url = new URL(endpoint)
    return (
      url.protocol === 'https:' &&
      PUSH_HOSTS.some(
        (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
      )
    )
  } catch {
    return false
  }
}

const identityOf = async (ctx: QueryCtx | MutationCtx) => {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) throw new Error('User not authenticated')
  return identity
}

const settingsFor = (ctx: QueryCtx, userId: string) =>
  ctx.db
    .query('alertSettings')
    .withIndex('by_userId', (q) => q.eq('userId', userId))
    .unique()

const journalUrl = () =>
  env.APP_URL ? `${env.APP_URL.replace(/\/+$/, '')}/journal` : undefined

// ---------------------------------------------------------------------------
// Inbox and settings, for the signed-in user

/** Newest alerts with the current state of their trade, and the unread count. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return { alerts: [], unread: 0 }
    const userId = identity.tokenIdentifier
    const rows = await ctx.db
      .query('alerts')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .order('desc')
      .take(INBOX_SIZE)
    const alerts = await Promise.all(
      rows.map(async (alert) => {
        const trade = await ctx.db.get(alert.tradeId)
        return {
          ...alert,
          // A deleted trade has no actions left.
          tradeStatus: trade?.status ?? null,
          closingPrice: trade?.closingPrice ?? null,
        }
      }),
    )
    const unread = (
      await ctx.db
        .query('alerts')
        .withIndex('by_userId_and_readAt', (q) =>
          q.eq('userId', userId).eq('readAt', undefined),
        )
        .take(UNREAD_LIMIT)
    ).length
    return { alerts, unread }
  },
})

/** Marks one alert read, or every unread alert when no ID is given. */
export const markRead = mutation({
  args: { alertId: v.optional(v.id('alerts')) },
  handler: async (ctx, { alertId }) => {
    const userId = (await identityOf(ctx)).tokenIdentifier
    const now = Date.now()
    if (alertId) {
      const alert = await ctx.db.get(alertId)
      if (!alert || alert.userId !== userId) throw new Error('Alert not found')
      if (alert.readAt == null) await ctx.db.patch(alertId, { readAt: now })
      return
    }
    const unread = await ctx.db
      .query('alerts')
      .withIndex('by_userId_and_readAt', (q) =>
        q.eq('userId', userId).eq('readAt', undefined),
      )
      .take(200)
    for (const alert of unread) await ctx.db.patch(alert._id, { readAt: now })
  },
})

/** Channel settings, and which channels this deployment can send at all. */
export const settings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    const saved = identity
      ? await settingsFor(ctx, identity.tokenIdentifier)
      : null
    return {
      email: saved?.email ?? false,
      emailAddress: saved?.emailAddress ?? identity?.email ?? null,
      emailReady: Boolean(env.RESEND_API_KEY && env.ALERT_FROM_EMAIL),
      // Public by design: the browser needs it to subscribe.
      vapidPublicKey: env.VAPID_PUBLIC_KEY ?? null,
    }
  },
})

/** Turns email alerts on or off. Turning on saves the sign-in email address. */
export const setEmail = mutation({
  args: { enabled: v.boolean() },
  handler: async (ctx, { enabled }) => {
    const identity = await identityOf(ctx)
    const userId = identity.tokenIdentifier
    if (enabled && !identity.email) {
      throw new Error('Your sign-in has no email address')
    }
    const existing = await settingsFor(ctx, userId)
    const patch = {
      email: enabled,
      emailAddress: enabled ? identity.email : existing?.emailAddress,
    }
    if (existing) await ctx.db.patch(existing._id, patch)
    else await ctx.db.insert('alertSettings', { userId, ...patch })
  },
})

/** Saves this browser's push subscription for the signed-in user. */
export const subscribePush = mutation({
  args: { endpoint: v.string(), p256dh: v.string(), auth: v.string() },
  handler: async (ctx, subscription) => {
    const userId = (await identityOf(ctx)).tokenIdentifier
    if (!isPushEndpoint(subscription.endpoint)) {
      throw new Error('This browser uses an unknown push service')
    }
    const existing = await ctx.db
      .query('pushSubscriptions')
      .withIndex('by_endpoint', (q) => q.eq('endpoint', subscription.endpoint))
      .unique()
    // A browser belongs to whoever signed in on it last.
    if (existing) await ctx.db.patch(existing._id, { userId, ...subscription })
    else await ctx.db.insert('pushSubscriptions', { userId, ...subscription })
  },
})

/** Whether pushes to this browser's endpoint reach the signed-in user. */
export const pushStatus = query({
  args: { endpoint: v.string() },
  handler: async (ctx, { endpoint }) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return false
    const existing = await ctx.db
      .query('pushSubscriptions')
      .withIndex('by_endpoint', (q) => q.eq('endpoint', endpoint))
      .unique()
    return existing?.userId === identity.tokenIdentifier
  },
})

export const unsubscribePush = mutation({
  args: { endpoint: v.string() },
  handler: async (ctx, { endpoint }) => {
    const userId = (await identityOf(ctx)).tokenIdentifier
    const existing = await ctx.db
      .query('pushSubscriptions')
      .withIndex('by_endpoint', (q) => q.eq('endpoint', endpoint))
      .unique()
    if (existing?.userId === userId) await ctx.db.delete(existing._id)
  },
})

// ---------------------------------------------------------------------------
// Hourly check

/** Open trades with at least one level that can still alert, across all users. */
export const armedTrades = internalQuery({
  args: {},
  handler: async (ctx) =>
    (
      await ctx.db
        .query('trades')
        .withIndex('by_status', (q) => q.eq('status', 'open'))
        .collect()
    ).filter((trade) => armedLevels(trade).length > 0),
})

const chunk = <T>(items: T[], size: number) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  )

export const checkLevels = internalAction({
  args: {},
  // Explicit types: this action calls functions in its own module.
  handler: async (ctx): Promise<{ checked: number; hits: number }> => {
    const trades: Doc<'trades'>[] = await ctx.runQuery(
      internal.alerts.armedTrades,
      {},
    )
    // No armed levels: no price calls.
    if (trades.length === 0) return { checked: 0, hits: 0 }
    const symbols = (type: Doc<'trades'>['assetType']) => [
      ...new Set(
        trades
          .filter((trade) => trade.assetType === type)
          .map((trade) => trade.assetName.toUpperCase()),
      ),
    ]
    const keys = {
      coinMarketCap: env.COINMARKETCAP_API_KEY,
      alpacaKeyId: env.ALPACA_API_KEY_ID,
      alpacaSecret: env.ALPACA_SECRET_KEY,
    }
    const prices: PricesByType = {
      traditional: await fetchMarketPrices(
        { crypto: [], traditional: symbols('traditional') },
        keys,
      ),
      crypto: {},
    }
    for (const crypto of chunk(symbols('crypto'), MAX_CRYPTO_SYMBOLS)) {
      Object.assign(
        prices.crypto,
        await fetchMarketPrices({ crypto, traditional: [] }, keys),
      )
    }
    const hits = findHits(trades, prices)
    if (hits.length > 0)
      await ctx.runMutation(internal.alerts.recordHits, { hits })
    return { checked: trades.length, hits: hits.length }
  },
})

/**
 * Records each hit once. The trade is read again, so a level that was moved,
 * already hit, or closed since the prices came back records nothing.
 */
export const recordHits = internalMutation({
  args: {
    hits: v.array(
      v.object({
        tradeId: v.id('trades'),
        kind: v.union(v.literal('stop'), v.literal('target')),
        level: v.number(),
        price: v.number(),
      }),
    ),
  },
  handler: async (ctx, { hits }) => {
    const now = Date.now()
    const recorded: Id<'alerts'>[] = []
    for (const hit of hits) {
      const trade = await ctx.db.get(hit.tradeId)
      if (!trade) continue
      const stillArmed = armedLevels(trade).some(
        ({ kind, level }) => kind === hit.kind && level === hit.level,
      )
      if (!stillArmed) continue
      await ctx.db.patch(
        trade._id,
        hit.kind === 'stop' ? { stopHitAt: now } : { targetHitAt: now },
      )
      const alertId = await ctx.db.insert('alerts', {
        userId: trade.userId,
        tradeId: trade._id,
        kind: hit.kind,
        assetName: trade.assetName,
        tradeType: trade.tradeType,
        level: hit.level,
        price: hit.price,
      })
      await ctx.scheduler.runAfter(0, internal.push.sendAlert, { alertId })
      await ctx.scheduler.runAfter(0, internal.alerts.sendEmail, { alertId })
      recorded.push(alertId)
    }
    return recorded
  },
})

// ---------------------------------------------------------------------------
// Delivery

/** What the browser notification and the email need, or null for a missing alert. */
export const deliveryInfo = internalQuery({
  args: { alertId: v.id('alerts') },
  handler: async (ctx, { alertId }) => {
    const alert = await ctx.db.get(alertId)
    if (!alert) return null
    const trade = await ctx.db.get(alert.tradeId)
    const facts = {
      ...alert,
      quantity: trade?.quantity ?? 0,
      entryPrice: trade?.price ?? 0,
    }
    const subscriptions = await ctx.db
      .query('pushSubscriptions')
      .withIndex('by_userId', (q) => q.eq('userId', alert.userId))
      .collect()
    return {
      alert,
      title: alertTitle(facts),
      body: alertSummary(facts),
      email: alertEmail(facts, journalUrl()),
      url: journalUrl() ?? '/journal',
      settings: await settingsFor(ctx, alert.userId),
      subscriptions: subscriptions.map(({ endpoint, p256dh, auth }) => ({
        endpoint,
        keys: { p256dh, auth },
      })),
    }
  },
})

export const markDelivered = internalMutation({
  args: {
    alertId: v.id('alerts'),
    channel: v.union(v.literal('push'), v.literal('email')),
  },
  handler: async (ctx, { alertId, channel }) => {
    const now = Date.now()
    await ctx.db.patch(
      alertId,
      channel === 'push' ? { pushedAt: now } : { emailedAt: now },
    )
  },
})

/** Drops a subscription the push service says no longer exists. */
export const removeSubscription = internalMutation({
  args: { endpoint: v.string() },
  handler: async (ctx, { endpoint }) => {
    const existing = await ctx.db
      .query('pushSubscriptions')
      .withIndex('by_endpoint', (q) => q.eq('endpoint', endpoint))
      .unique()
    if (existing) await ctx.db.delete(existing._id)
  },
})

/** Emails one alert when the user turned email on and Resend is configured. */
export const sendEmail = internalAction({
  args: { alertId: v.id('alerts') },
  handler: async (ctx, { alertId }) => {
    const info = await ctx.runQuery(internal.alerts.deliveryInfo, { alertId })
    if (!info?.settings?.email || !info.settings.emailAddress) return
    if (info.alert.emailedAt != null) return
    if (!env.RESEND_API_KEY || !env.ALERT_FROM_EMAIL) {
      console.warn(
        'Email alert skipped: RESEND_API_KEY or ALERT_FROM_EMAIL is not set',
      )
      return
    }
    try {
      await sendResendEmail({
        apiKey: env.RESEND_API_KEY,
        from: env.ALERT_FROM_EMAIL,
        to: info.settings.emailAddress,
        email: info.email,
      })
      await ctx.runMutation(internal.alerts.markDelivered, {
        alertId,
        channel: 'email',
      })
    } catch (error) {
      // The in-app alert is already saved, so a failed email loses nothing else.
      console.error('Email alert failed', error)
    }
  },
})
