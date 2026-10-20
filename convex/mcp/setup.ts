import { query } from '../_generated/server'
import { mcpConfig } from './auth'

/** Plain-text setup steps, served at /mcp-setup, so any capable agent can configure its own MCP client. */
export function setupPrompt(resource: string) {
  return `Connect this agent to the Quant Companion MCP server at ${resource} using Streamable HTTP and OAuth browser sign-in. Name the connection quant-companion. Use your MCP client's supported settings or CLI, start authentication, and show me the sign-in link if the browser does not open. Request quantcompanion:read and quantcompanion:write access so I can read my trade journal and record trades. Do not ask me for an API key or paste access tokens into chat. After I approve access, call list_accounts to verify the connection. If this client does not support remote MCP with OAuth, explain the limitation instead of configuring an unauthenticated connection.\n`
}

/**
 * Server URL and setup prompt for the Agents page. Null when this deployment
 * has no MCP settings. Intentional: no sign-in check, because both values are
 * already public at /mcp-setup.
 */
export const get = query({
  args: {},
  handler: () => {
    const config = mcpConfig()
    return config
      ? { url: config.resource, prompt: setupPrompt(config.resource) }
      : null
  },
})
