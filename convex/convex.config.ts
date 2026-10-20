import { defineApp } from 'convex/server'
import { v } from 'convex/values'

const app = defineApp({
  env: {
    CLERK_JWT_ISSUER_DOMAIN: v.string(),
    // MCP server (docs/mcp.md). Without both, /mcp reports that it is not configured.
    MCP_RESOURCE_URL: v.optional(v.string()),
    CLERK_SECRET_KEY: v.optional(v.string()),
  },
})

export default app
