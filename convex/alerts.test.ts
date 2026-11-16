/** @vitest-environment edge-runtime */
/// <reference types="vite/client" />

import { convexTest } from 'convex-test'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { api, internal } from './_generated/api'
import { levelHit } from './model/levels'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')
const identity = {
  subject: 'alerts-test',
  issuer: 'https://test.invalid',
  email: 'trader@example.com',
}
const long = {
  assetName: 'NVDA',
  assetType: 'traditional',
  quantity: 40,
  price: 188.5,
  tradeType: 'buy',
  tradeDate: '2026-11-02',
} as const
const nvda = {
  assetName: 'NVDA',
  assetType: 'traditional',
  tradeType: 'buy',
} as const

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('levelHit', () => {
  it.each([
    ['buy', 'stop', 182, 182, true],
    ['buy', 'stop', 182, 182.01, false],
    ['buy', 'target', 200, 200, true],
    ['buy', 'target', 200, 199.99, false],
    ['sell', 'stop', 200, 200, true],
    ['sell', 'stop', 200, 199, false],
    ['sell', 'target', 180, 180, true],
    ['sell', 'target', 180, 181, false],
  ] as const)('%s %s at %d, price %d: %s', (side, kind, level, price, hit) => {
    expect(levelHit(side, kind, level, price)).toBe(hit)
  })
})

describe('stop and target alerts', () => {
  it('accepts only known browser push services', async () => {
    const t = convexTest(schema, modules).withIdentity(identity)
    const keys = { p256dh: 'key', auth: 'secret' }
    await t.mutation(api.alerts.subscribePush, {
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
      ...keys,
    })
    await expect(
      t.mutation(api.alerts.subscribePush, {
        endpoint: 'https://fcm.googleapis.com.example.com/send',
        ...keys,
      }),
    ).rejects.toThrow('unknown push service')
  })

  it('rejects a target on the losing side of the stop', async () => {
    const t = convexTest(schema, modules).withIdentity(identity)
    await expect(
      t.mutation(api.trades.add, { ...long, stopPrice: 182, targetPrice: 180 }),
    ).rejects.toThrow('target must be above the stop')
    await expect(
      t.mutation(api.trades.add, {
        ...long,
        tradeType: 'sell',
        stopPrice: 182,
        targetPrice: 190,
      }),
    ).rejects.toThrow('target must be below the stop')
  })

  it('alerts once for each level, and again after the level moves', async () => {
    const t = convexTest(schema, modules).withIdentity(identity)
    const tradeId = await t.mutation(api.trades.add, {
      ...long,
      stopPrice: 182,
      targetPrice: 205,
    })
    const hit = {
      ...nvda,
      tradeId,
      kind: 'stop',
      level: 182,
      price: 181.62,
    } as const
    await t.mutation(internal.alerts.recordHits, { hits: [hit] })
    await t.mutation(internal.alerts.recordHits, { hits: [hit] })
    expect(await t.query(api.alerts.list)).toMatchObject({
      alerts: [{ level: 182, tradeStatus: 'open' }],
      unread: 1,
    })

    // A hit read before the stop moved records nothing.
    await t.mutation(api.trades.edit, { tradeId, ...long, stopPrice: 180 })
    await t.mutation(internal.alerts.recordHits, { hits: [hit] })
    await t.mutation(internal.alerts.recordHits, {
      hits: [{ ...hit, level: 180, price: 179.5 }],
    })
    const inbox = await t.query(api.alerts.list)
    expect(inbox.alerts.map((alert) => alert.level)).toEqual([180, 182])

    // The edit left the target alone, so it is still armed.
    const [trade] = await t.query(api.trades.list)
    expect(trade.targetPrice).toBe(205)
    expect(trade.targetHitAt).toBeUndefined()

    await t.mutation(api.alerts.markRead, {})
    expect((await t.query(api.alerts.list)).unread).toBe(0)
  })

  it('ties a hit to the instrument its price was for', async () => {
    const t = convexTest(schema, modules).withIdentity(identity)
    const tradeId = await t.mutation(api.trades.add, {
      ...long,
      stopPrice: 182,
    })
    const hit = {
      ...nvda,
      tradeId,
      kind: 'stop',
      level: 182,
      price: 181,
    } as const

    // A price for the stock does not count once the trade says crypto.
    await t.mutation(api.trades.edit, { tradeId, ...long, assetType: 'crypto' })
    await t.mutation(internal.alerts.recordHits, { hits: [hit] })
    expect((await t.query(api.alerts.list)).alerts).toHaveLength(0)

    // A hit is cleared when the instrument changes, so the level alerts again.
    await t.mutation(internal.alerts.recordHits, {
      hits: [{ ...hit, assetType: 'crypto' }],
    })
    await t.mutation(api.trades.edit, { tradeId, ...long })
    const [trade] = await t.query(api.trades.list)
    expect(trade.stopHitAt).toBeUndefined()
  })

  it('fetches each symbol once and checks only armed levels', async () => {
    vi.stubEnv('ALPACA_API_KEY_ID', 'test-key')
    vi.stubEnv('ALPACA_SECRET_KEY', 'test-secret')
    const fetchMock = vi.fn(async () => Response.json({ trade: { p: 181 } }))
    vi.stubGlobal('fetch', fetchMock)
    const t = convexTest(schema, modules).withIdentity(identity)

    expect(await t.action(internal.alerts.checkLevels, {})).toEqual({
      checked: 0,
      hits: 0,
    })
    expect(fetchMock).not.toHaveBeenCalled()

    await t.mutation(api.trades.add, { ...long, stopPrice: 182 })
    await t.mutation(api.trades.add, { ...long, quantity: 10, stopPrice: 175 })
    await t.mutation(api.trades.add, { ...long, assetName: 'AAPL' })
    await t.mutation(api.trades.add, {
      ...long,
      assetName: 'MSFT',
      stopPrice: 400,
      priceAlerts: false,
    })
    expect(await t.action(internal.alerts.checkLevels, {})).toEqual({
      checked: 2,
      hits: 1,
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('keeps stock and crypto prices apart and skips names that are not tickers', async () => {
    vi.stubEnv('ALPACA_API_KEY_ID', 'test-key')
    vi.stubEnv('ALPACA_SECRET_KEY', 'test-secret')
    vi.stubEnv('COINMARKETCAP_API_KEY', 'test-cmc')
    const fetchMock = vi.fn(async (url: string) =>
      url.includes('coinmarketcap')
        ? Response.json({
            data: { AMP: { symbol: 'AMP', quote: { USD: { price: 0.004 } } } },
            status: { error_code: 0, error_message: null },
          })
        : Response.json({ trade: { p: 510 } }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const t = convexTest(schema, modules).withIdentity(identity)
    const coin = { ...long, assetType: 'crypto', assetName: 'AMP' } as const

    // Ameriprise at 510 is far above its 450 stop; the Amp coin is below its stop.
    await t.mutation(api.trades.add, {
      ...long,
      assetName: 'AMP',
      stopPrice: 450,
      price: 500,
    })
    await t.mutation(api.trades.add, {
      ...coin,
      price: 0.006,
      stopPrice: 0.005,
    })
    await t.mutation(api.trades.add, {
      ...coin,
      assetName: 'BTC&convert=EUR',
      price: 1,
      stopPrice: 0.5,
    })

    expect(await t.action(internal.alerts.checkLevels, {})).toEqual({
      checked: 3,
      hits: 1,
    })
    const [alert] = (await t.query(api.alerts.list)).alerts
    expect(alert).toMatchObject({ assetName: 'AMP', price: 0.004 })
    const urls = fetchMock.mock.calls.map(([url]) => url)
    expect(urls.some((url) => url.includes('convert'))).toBe(false)
  })

  it('emails a hit when email alerts are on', async () => {
    vi.useFakeTimers()
    vi.stubEnv('RESEND_API_KEY', 'test-resend-key')
    vi.stubEnv('ALERT_FROM_EMAIL', 'Alerts <alerts@example.com>')
    vi.stubEnv('APP_URL', 'https://journal.example.com')
    const fetchMock = vi.fn(async () => Response.json({ id: 'email-1' }))
    vi.stubGlobal('fetch', fetchMock)
    const t = convexTest(schema, modules).withIdentity(identity)
    await t.mutation(api.alerts.setEmail, { enabled: true })
    const tradeId = await t.mutation(api.trades.add, {
      ...long,
      stopPrice: 182,
    })

    await t.mutation(internal.alerts.recordHits, {
      hits: [{ ...nvda, tradeId, kind: 'stop', level: 182, price: 181.62 }],
    })
    await t.finishAllScheduledFunctions(vi.runAllTimers)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ]
    expect(url).toBe('https://api.resend.com/emails')
    expect(JSON.parse(String(init.body))).toMatchObject({
      to: 'trader@example.com',
      subject: 'Stop hit: NVDA long at 182.00',
    })
    const [alert] = (await t.query(api.alerts.list)).alerts
    expect(alert.emailedAt).toBeTypeOf('number')
  })
})
