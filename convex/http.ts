import { httpRouter } from 'convex/server'

import { httpAction } from './_generated/server'
import { handleMcp } from './mcp/server'

const http = httpRouter()

// Remote MCP server for agents. See docs/mcp.md.
for (const method of ['GET', 'POST', 'DELETE', 'OPTIONS'] as const) {
  http.route({ path: '/mcp', method, handler: httpAction(handleMcp) })
}
for (const path of [
  '/mcp-setup',
  '/.well-known/oauth-protected-resource',
  '/.well-known/oauth-protected-resource/mcp',
  '/.well-known/oauth-authorization-server',
]) {
  http.route({ path, method: 'GET', handler: httpAction(handleMcp) })
  http.route({ path, method: 'OPTIONS', handler: httpAction(handleMcp) })
}

export default http
