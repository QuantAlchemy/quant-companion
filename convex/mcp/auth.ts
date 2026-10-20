import { z } from 'zod'

import { env } from '../_generated/server'

export const READ_SCOPE = 'quantcompanion:read'
export const WRITE_SCOPE = 'quantcompanion:write'
export const MCP_SCOPES = [READ_SCOPE, WRITE_SCOPE]

/** Null when this deployment has no MCP settings. The endpoint then reports 503. */
export function mcpConfig() {
  const resource = env.MCP_RESOURCE_URL
  const issuer = env.CLERK_JWT_ISSUER_DOMAIN.replace(/\/+$/, '')
  const secretKey = env.CLERK_SECRET_KEY
  if (!resource || !issuer || !secretKey) return null
  return { resource, issuer, secretKey }
}

export type McpConfig = NonNullable<ReturnType<typeof mcpConfig>>

export function resourceMetadata(config: McpConfig) {
  return {
    resource: config.resource,
    authorization_servers: [config.issuer],
    scopes_supported: MCP_SCOPES,
    bearer_methods_supported: ['header'],
    resource_name: 'Quant Companion',
  }
}

export function authChallenge(
  config: McpConfig,
  scope = MCP_SCOPES.join(' '),
  status = 401,
) {
  const metadata = new URL(
    '/.well-known/oauth-protected-resource/mcp',
    config.resource,
  )
  const error = status === 403 ? ', error="insufficient_scope"' : ''
  return new Response(
    status === 403
      ? 'Additional permission required'
      : 'Sign in to Quant Companion',
    {
      status,
      headers: {
        'WWW-Authenticate': `Bearer resource_metadata="${metadata}", scope="${scope}"${error}`,
        'Cache-Control': 'no-store',
      },
    },
  )
}

const audience = z
  .union([z.string(), z.array(z.string())])
  .transform((aud) => (typeof aud === 'string' ? [aud] : aud))

const verifiedToken = z.object({
  subject: z.string().startsWith('user_'),
  client_id: z.string().min(1),
  scopes: z.array(z.string()),
  aud: audience,
  revoked: z.literal(false),
  expired: z.literal(false),
  expiration: z.number().nullable(),
})

const liveToken = z.object({
  revoked: z.literal(false),
  expired: z.literal(false),
})

/**
 * Verify an agent's OAuth access token with Clerk on every request, so a
 * revoked grant fails on the next call. Returns the journal owner key: the
 * same `issuer|subject` tokenIdentifier Convex gives the browser session.
 * Never accepts cookies, browser sessions, or tokens for other resources.
 */
export async function authenticateMcp(request: Request, config: McpConfig) {
  const match = /^Bearer (\S+)$/i.exec(
    request.headers.get('Authorization') ?? '',
  )
  // Clerk JWT access tokens cannot be revoked. Require opaque OAuth tokens.
  if (!match || !match[1].startsWith('oat_')) return null
  const response = await fetch(
    'https://api.clerk.com/v1/oauth_applications/access_tokens/verify',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ access_token: match[1] }),
      signal: AbortSignal.timeout(10_000),
    },
  )
  // An outage or a bad server credential must not send the user through sign-in again.
  if (
    response.status >= 500 ||
    response.status === 429 ||
    response.status === 401 ||
    response.status === 403
  ) {
    throw new Error('Authentication service unavailable')
  }
  if (!response.ok) return null
  const body: unknown = await response.json()
  const parsed = verifiedToken.safeParse(body)
  if (!parsed.success || !parsed.data.aud.includes(config.resource)) {
    // A live token without this server's audience points to a Clerk setting
    // (docs/mcp.md), and the agent would loop through sign-in. Log the category only.
    if (liveToken.safeParse(body).success) {
      console.warn('MCP token rejected', { reason: 'audience or shape' })
    }
    return null
  }
  const token = parsed.data
  if (token.expiration !== null && token.expiration <= Date.now() / 1000) {
    return null
  }
  return {
    userId: `${config.issuer}|${token.subject}`,
    scopes: token.scopes,
  }
}
