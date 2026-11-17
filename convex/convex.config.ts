import { defineApp } from 'convex/server'
import { v } from 'convex/values'

const app = defineApp({
  env: {
    CLERK_JWT_ISSUER_DOMAIN: v.string(),
    // MCP server (docs/mcp.md). Without both, /mcp reports that it is not configured.
    MCP_RESOURCE_URL: v.optional(v.string()),
    CLERK_SECRET_KEY: v.optional(v.string()),
    // Hourly stop and target check (convex/alerts.ts). Without price keys, no
    // level can alert. Each channel is skipped while its keys are missing.
    COINMARKETCAP_API_KEY: v.optional(v.string()),
    ALPACA_API_KEY_ID: v.optional(v.string()),
    ALPACA_SECRET_KEY: v.optional(v.string()),
    APP_URL: v.optional(v.string()), // link in alert emails and notifications
    RESEND_API_KEY: v.optional(v.string()),
    ALERT_FROM_EMAIL: v.optional(v.string()),
    VAPID_PUBLIC_KEY: v.optional(v.string()),
    VAPID_PRIVATE_KEY: v.optional(v.string()),
    VAPID_SUBJECT: v.optional(v.string()), // mailto: or https: contact for push services
  },
})

export default app
