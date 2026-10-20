/** @vitest-environment edge-runtime */
/// <reference types="vite/client" />

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { api } from './_generated/api'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')
const resource = 'https://mcp.example.com/mcp'
const issuer = 'https://clerk.example.com'
const token = {
  subject: 'user_ralph',
  client_id: 'client_agent',
  scopes: ['quantcompanion:read', 'quantcompanion:write'],
  aud: [resource],
  revoked: false,
  expired: false,
  expiration: null,
}
let verified: Record<string, unknown>

beforeEach(() => {
  verified = { ...token }
  vi.stubEnv('MCP_RESOURCE_URL', resource)
  // A trailing slash must not change the journal owner key.
  vi.stubEnv('CLERK_JWT_ISSUER_DOMAIN', `${issuer}/`)
  vi.stubEnv('CLERK_SECRET_KEY', 'test-server-credential')
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json(verified)),
  )
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

const lot = {
  assetName: 'STRC',
  assetType: 'traditional',
  tradeType: 'buy',
} as const

/** Ralph and Laura signed in to the app, plus an agent connected as Ralph. */
async function fixture() {
  const t = convexTest(schema, modules)
  // The browser identity the app uses. The agent must see the same journal.
  const ralph = t.withIdentity({ subject: 'user_ralph', issuer })
  const laura = t.withIdentity({ subject: 'user_laura', issuer })
  const first = await ralph.mutation(api.trades.add, {
    ...lot,
    quantity: 30,
    price: 95,
    tradeDate: '2025-11-10',
    commission: 3,
    exchange: 'Vanguard - Ralph',
  })
  const second = await ralph.mutation(api.trades.add, {
    ...lot,
    quantity: 40,
    price: 96,
    tradeDate: '2025-11-11',
    exchange: 'Vanguard - Ralph',
  })
  await ralph.mutation(api.trades.add, {
    ...lot,
    quantity: 10,
    price: 94,
    tradeDate: '2025-11-10',
    exchange: 'Vanguard - Laura',
  })
  await laura.mutation(api.trades.add, {
    ...lot,
    quantity: 99,
    price: 90,
    tradeDate: '2025-11-10',
    exchange: 'Private account',
  })
  const client = new Client({ name: 'integration-test', version: '1.0.0' })
  const transport = new StreamableHTTPClientTransport(new URL(resource), {
    requestInit: { headers: { Authorization: 'Bearer oat_test_access_token' } },
    fetch: async (url, init) => t.fetch(new URL(String(url)).pathname, init),
  })
  await client.connect(transport)
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const result = await client.callTool({ name, arguments: args })
    const [content] = result.content as Array<{ text: string }>
    if (result.isError) return { error: content.text }
    return JSON.parse(content.text) as Record<string, unknown>
  }
  return { t, ralph, client, call, lots: { first, second } }
}

// The Vanguard email from the user: "Sell 53 STRC at $97.95, account 0961".
const strcSale = {
  account: 'Vanguard - Ralph',
  symbol: 'strc',
  side: 'sell',
  quantity: 53,
  price: 97.95,
  date: '2026-10-20',
  requestId: '6f1d3a52-6c1e-4f0b-9a57-0b1f6a0c8d11',
}

describe('MCP server', () => {
  it('asks for both permissions before any connection', async () => {
    const t = convexTest(schema, modules)
    const response = await t.fetch('/mcp', { method: 'POST' })
    expect(response.status).toBe(401)
    expect(response.headers.get('WWW-Authenticate')).toBe(
      'Bearer resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource/mcp", scope="quantcompanion:read quantcompanion:write"',
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it('shows the signed-in journal and no other user', async () => {
    const { client, call } = await fixture()
    try {
      const accounts = (await call('list_accounts')) as unknown as Array<{
        account: string
        openPositions: Array<{ symbol: string; quantity: number }>
      }>
      expect(accounts.map((a) => a.account).sort()).toEqual([
        'Vanguard - Laura',
        'Vanguard - Ralph',
      ])
      expect(
        accounts.find((a) => a.account === 'Vanguard - Ralph')?.openPositions,
      ).toMatchObject([{ symbol: 'STRC', quantity: 70 }])
      expect(JSON.stringify(accounts)).not.toContain('Private account')
    } finally {
      await client.close()
    }
  })

  it('records a broker sale against the oldest lots in the named account', async () => {
    const { client, call, ralph, lots } = await fixture()
    try {
      const plan = await call('record_execution', strcSale)
      expect(plan).toMatchObject({
        applied: false,
        closed: [
          { tradeId: lots.first, quantity: 30, partial: false },
          { tradeId: lots.second, quantity: 23, partial: true },
        ],
        remainingOpenQuantity: 17,
      })
      // A dry run writes nothing.
      expect(
        (await ralph.query(api.trades.list)).filter(
          (t) => t.status === 'closed',
        ),
      ).toHaveLength(0)

      const result = await call('record_execution', {
        ...strcSale,
        dryRun: false,
        planId: plan.planId,
      })
      expect(result).toMatchObject({ applied: true, remainingOpenQuantity: 17 })
      expect(result.netPnl).toBeCloseTo(plan.netPnl as number)

      const ralphLots = (await ralph.query(api.trades.list)).filter(
        (t) => t.exchange === 'Vanguard - Ralph',
      )
      expect(
        ralphLots
          .map((t) => [t.status, t.quantity, t.closingPrice, t.realizedPnl])
          .sort(),
      ).toEqual([
        ['closed', 23, 97.95, expect.closeTo(23 * 1.95)],
        ['closed', 30, 97.95, expect.closeTo(30 * 2.95)],
        ['open', 17, undefined, undefined],
      ])
      // Laura's lot in the same symbol is untouched.
      expect(
        (await ralph.query(api.trades.list)).find(
          (t) => t.exchange === 'Vanguard - Laura',
        ),
      ).toMatchObject({ status: 'open', quantity: 10 })

      // A retry after a lost response returns the first result and writes nothing.
      expect(
        await call('record_execution', {
          ...strcSale,
          dryRun: false,
          planId: plan.planId,
        }),
      ).toMatchObject({ applied: true, replayed: true })
      expect(await ralph.query(api.trades.list)).toHaveLength(4)
      expect(
        await call('record_execution', {
          ...strcSale,
          quantity: 17,
          dryRun: false,
        }),
      ).toMatchObject({
        error: expect.stringContaining('was already applied'),
      })
    } finally {
      await client.close()
    }
  })

  it('refuses guessed accounts, oversized sales, and accidental shorts', async () => {
    const { client, call } = await fixture()
    try {
      expect(
        await call('record_execution', {
          ...strcSale,
          account: 'vanguard - ralph',
        }),
      ).toEqual({
        error:
          'Account "vanguard - ralph" does not exist. Did you mean "Vanguard - Ralph"?',
      })
      expect(
        (await call('record_execution', { ...strcSale, quantity: 71 })).error,
      ).toContain('exceeds the open long position of 70')
      expect(
        (await call('record_execution', { ...strcSale, symbol: 'VOO' })).error,
      ).toContain('has no open long VOO position')
      expect(
        await call('record_execution', {
          ...strcSale,
          symbol: 'VOO',
          allowShort: true,
        }),
      ).toEqual({ error: 'assetType is required to open a new position' })
      // A wrong date must not open a long beside shorts it should cover.
      await call('record_execution', {
        ...strcSale,
        symbol: 'TSLA',
        assetType: 'traditional',
        allowShort: true,
        dryRun: false,
      })
      expect(
        (
          await call('record_execution', {
            ...strcSale,
            symbol: 'TSLA',
            side: 'buy',
            date: '2026-10-19',
            assetType: 'traditional',
            requestId: '0b8e7a52-6c1e-4f0b-9a57-0b1f6a0c8d12',
          })
        ).error,
      ).toContain('all dated after 2026-10-19')
    } finally {
      await client.close()
    }
  })

  it.each([
    ['closed', { closingPrice: 99, closingDate: '2026-10-19' }],
    ['repriced', { price: 90 }],
  ])(
    'refuses to apply a plan after a lot was %s in the app',
    async (_change, patch) => {
      const { client, call, ralph, lots } = await fixture()
      try {
        const sale = { ...strcSale, quantity: 20 }
        const plan = await call('record_execution', sale)
        if ('closingPrice' in patch) {
          await ralph.mutation(api.trades.close, {
            tradeId: lots.first,
            ...patch,
          })
        } else {
          await ralph.mutation(api.trades.edit, {
            tradeId: lots.first,
            ...lot,
            quantity: 30,
            tradeDate: '2025-11-10',
            commission: 3,
            exchange: 'Vanguard - Ralph',
            ...patch,
          })
        }
        expect(
          (
            await call('record_execution', {
              ...sale,
              dryRun: false,
              planId: plan.planId,
            })
          ).error,
        ).toContain('changed since the dry run')
      } finally {
        await client.close()
      }
    },
  )

  it('applies a plan that closes many lots', async () => {
    const { client, call, ralph } = await fixture()
    try {
      for (let day = 1; day <= 120; day += 1) {
        await ralph.mutation(api.trades.add, {
          ...lot,
          assetName: 'VOO',
          quantity: 1,
          price: 500 + day,
          tradeDate: `2026-0${1 + Math.floor((day - 1) / 28)}-${String(((day - 1) % 28) + 1).padStart(2, '0')}`,
          exchange: 'Vanguard - Ralph',
        })
      }
      const sale = { ...strcSale, symbol: 'VOO', quantity: 120, price: 600 }
      const plan = await call('record_execution', sale)
      expect((plan.planId as string).length).toBeLessThanOrEqual(100)
      expect(
        await call('record_execution', {
          ...sale,
          dryRun: false,
          planId: plan.planId,
        }),
      ).toMatchObject({ applied: true, remainingOpenQuantity: 0 })
    } finally {
      await client.close()
    }
  })

  it('reports the whole remaining position, including later lots', async () => {
    const { client, call, ralph } = await fixture()
    try {
      await ralph.mutation(api.trades.add, {
        ...lot,
        quantity: 5,
        price: 98,
        tradeDate: '2026-10-25',
        exchange: 'Vanguard - Ralph',
      })
      expect(await call('record_execution', strcSale)).toMatchObject({
        remainingOpenQuantity: 22,
      })
    } finally {
      await client.close()
    }
  })

  it('imports a file larger than one batch without dropping repeated trades', async () => {
    const { client, call, ralph } = await fixture()
    try {
      const row = {
        assetName: 'BTC',
        assetType: 'crypto',
        quantity: 0.1,
        price: 60_000,
        tradeType: 'buy',
        tradeDate: '2026-01-02',
        status: 'open',
        exchange: 'Vanguard - Ralph',
      }
      const trades = Array.from({ length: 51 }, () => row)
      expect(await call('import_trades', { trades })).toEqual({
        inserted: 51,
        skipped: 0,
        conflicts: 0,
      })
      expect(await call('import_trades', { trades })).toEqual({
        inserted: 0,
        skipped: 51,
        conflicts: 0,
      })
      expect(
        (
          await call('import_trades', {
            trades: [{ ...row, exchange: 'Kraken - Ralph' }],
          })
        ).error,
      ).toContain('Account "Kraken - Ralph" does not exist')
      const ids = (await ralph.query(api.trades.list))
        .filter((t) => t.assetName === 'BTC')
        .map((t) => t._id)
      // Repeated IDs delete and report each trade once.
      expect(
        await call('delete_trades', { tradeIds: [ids[0], ids[0]] }),
      ).toMatchObject({ deleted: [{ id: ids[0] }], alreadyDeleted: 0 })
    } finally {
      await client.close()
    }
  })

  it('edits, partly closes, and summarizes trades as the app does', async () => {
    const { client, call, ralph, lots } = await fixture()
    try {
      expect(
        await call('update_trade', { tradeId: lots.first, commission: null }),
      ).toMatchObject({
        commission: null,
        quantity: 30,
        account: 'Vanguard - Ralph',
      })
      const partialClose = {
        tradeId: lots.second,
        closingPrice: 100,
        closingDate: '2026-01-02',
        quantity: 10,
        commission: 1,
        requestId: '3c2d1e52-6c1e-4f0b-9a57-0b1f6a0c8d13',
      }
      const closed = await call('close_trade', partialClose)
      expect(closed).toMatchObject({
        closed: { quantity: 10, grossPnl: 40, commission: 1, netPnl: 39 },
        remaining: { quantity: 30, status: 'open' },
      })
      // A retried partial close must not split the lot again.
      expect(await call('close_trade', partialClose)).toMatchObject({
        replayed: true,
      })
      expect(
        (await ralph.query(api.trades.list)).find((t) => t._id === lots.second),
      ).toMatchObject({ quantity: 30 })
      expect(
        await call('get_performance_summary', { account: 'Vanguard - Ralph' }),
      ).toMatchObject({ closedTrades: 1, realizedPnl: 39, profitFactor: null })
      expect(
        await call('calculate_position_size', {
          accountSize: 10_000,
          exchangeBalance: 2_000,
          entryPrice: 100,
          stopLoss: 95,
        }),
      ).toMatchObject({ isLong: true, riskAmount: 100, positionSize: 20 })
    } finally {
      await client.close()
    }
  })

  it('asks a read-only connection for write permission before writing', async () => {
    verified = { ...token, scopes: ['quantcompanion:read'] }
    const { t } = await fixture()
    const response = await t.fetch('/mcp', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer oat_test_access_token',
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'record_execution', arguments: strcSale },
      }),
    })
    expect(response.status).toBe(403)
    expect(response.headers.get('WWW-Authenticate')).toContain(
      'error="insufficient_scope"',
    )
  })

  it.each([
    { revoked: true },
    { aud: ['https://another.example/mcp'] },
    { subject: 'client_machine' },
  ])(
    'rejects tokens that are not a live grant for this server: %j',
    async (patch) => {
      verified = { ...token, ...patch }
      const t = convexTest(schema, modules)
      const response = await t.fetch('/mcp', {
        method: 'POST',
        headers: { Authorization: 'Bearer oat_test_access_token' },
      })
      expect(response.status).toBe(401)
    },
  )

  it('rejects unrevocable JWTs without calling Clerk', async () => {
    const t = convexTest(schema, modules)
    const response = await t.fetch('/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer header.payload.signature' },
    })
    expect(response.status).toBe(401)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('reports a Clerk outage as unavailable, not as signed out', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('down', { status: 503 })),
    )
    const t = convexTest(schema, modules)
    const response = await t.fetch('/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer oat_test_access_token' },
    })
    expect(response.status).toBe(503)
    expect(response.headers.get('WWW-Authenticate')).toBeNull()
  })
})
