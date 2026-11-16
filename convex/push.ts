'use node'

import { v } from 'convex/values'
import webpush from 'web-push'

import { internal } from './_generated/api'
import { env, internalAction } from './_generated/server'

/**
 * Sends one stop or target alert to every browser the user subscribed
 * (alerts.subscribePush). public/sw.js shows it. Needs VAPID_PUBLIC_KEY,
 * VAPID_PRIVATE_KEY, and VAPID_SUBJECT; without them push is skipped.
 */

/** Push services answer 404 or 410 for a subscription that no longer exists. */
const GONE = new Set([404, 410])
const SIX_HOURS = 6 * 60 * 60

export const sendAlert = internalAction({
  args: { alertId: v.id('alerts') },
  handler: async (ctx, { alertId }) => {
    const info = await ctx.runQuery(internal.alerts.deliveryInfo, { alertId })
    if (!info || info.subscriptions.length === 0) return
    if (info.alert.pushedAt != null) return
    if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) {
      console.warn('Browser alert skipped: VAPID keys are not set')
      return
    }
    webpush.setVapidDetails(
      env.VAPID_SUBJECT,
      env.VAPID_PUBLIC_KEY,
      env.VAPID_PRIVATE_KEY,
    )
    const payload = JSON.stringify({
      title: info.title,
      body: info.body,
      url: info.url,
      tag: alertId,
    })
    let delivered = 0
    for (const subscription of info.subscriptions) {
      try {
        await webpush.sendNotification(subscription, payload, {
          TTL: SIX_HOURS,
        })
        delivered += 1
      } catch (error) {
        const status =
          error instanceof webpush.WebPushError ? error.statusCode : undefined
        if (status != null && GONE.has(status)) {
          await ctx.runMutation(internal.alerts.removeSubscription, {
            endpoint: subscription.endpoint,
          })
        } else {
          console.error('Browser alert failed', status ?? error)
        }
      }
    }
    if (delivered > 0) {
      await ctx.runMutation(internal.alerts.markDelivered, {
        alertId,
        channel: 'push',
      })
    }
  },
})
