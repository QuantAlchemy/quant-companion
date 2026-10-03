/** @vitest-environment edge-runtime */
/// <reference types="vite/client" />

import { convexTest } from 'convex-test'
import { describe, expect, it } from 'vitest'

import { api } from './_generated/api'
import schema from './schema'
import {
  parseTradeFile,
  prepareTradeImport,
  serializeTrades,
} from '../src/lib/journal'

const modules = import.meta.glob('./**/*.ts')
const identity = { subject: 'risk-test', issuer: 'https://test.invalid' }
const input = {
  assetName: 'TEST',
  assetType: 'traditional',
  quantity: 10,
  price: 100,
  tradeType: 'buy',
  tradeDate: '2026-10-01',
} as const
const closing = { closingPrice: 120, closingDate: '2026-10-02' }

describe('recorded trade risk', () => {
  it('preserves risk through edits, closing, export and re-import', async () => {
    const t = convexTest(schema, modules).withIdentity(identity)
    const tradeId = await t.mutation(api.trades.add, {
      ...input,
      initialRisk: 100,
    })
    await t.mutation(api.trades.edit, { ...input, tradeId, initialRisk: 150 })
    expect((await t.query(api.trades.list))[0].initialRisk).toBe(150)
    await t.mutation(api.trades.edit, { ...input, tradeId, initialRisk: 100 })
    // Old clients omit risk, which must not erase the recorded value.
    await t.mutation(api.trades.edit, { ...input, tradeId, comments: 'Edited' })
    await t.mutation(api.trades.close, { tradeId, ...closing })
    const [trade] = await t.query(api.trades.list)
    expect(trade).toMatchObject({ initialRisk: 100, realizedPnl: 200 })
    const { _id, _creationTime, userId: _userId, ...data } = trade
    const exported = serializeTrades([
      { ...data, id: _id, createdAt: _creationTime },
    ])
    const imported = prepareTradeImport(parseTradeFile(exported))
    const other = convexTest(schema, modules).withIdentity(identity)
    const args = { expectedSubject: identity.subject, trades: imported }
    expect(await other.mutation(api.trades.importMany, args)).toEqual({
      inserted: 1,
      skipped: 0,
    })
    expect((await other.query(api.trades.list))[0]).toMatchObject({
      initialRisk: 100,
      realizedPnl: 200,
    })
    expect(await other.mutation(api.trades.importMany, args)).toEqual({
      inserted: 0,
      skipped: 1,
    })
    await t.mutation(api.trades.edit, { ...input, tradeId, initialRisk: null })
    expect((await t.query(api.trades.list))[0].initialRisk).toBeUndefined()
  })

  it('allocates risk by quantity across repeated partial closes', async () => {
    const t = convexTest(schema, modules).withIdentity(identity)
    const tradeId = await t.mutation(api.trades.add, {
      ...input,
      initialRisk: 100,
    })
    await t.mutation(api.trades.split, {
      tradeId,
      ...closing,
      closingQuantity: 3,
    })
    await t.mutation(api.trades.split, {
      tradeId,
      ...closing,
      closingQuantity: 2,
    })
    const trades = await t.query(api.trades.list)
    expect(trades.find((trade) => trade._id === tradeId)).toMatchObject({
      quantity: 5,
      initialRisk: 50,
      status: 'open',
    })
    expect(trades.filter((trade) => trade.status === 'closed')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          quantity: 3,
          initialRisk: 30,
          realizedPnl: 60,
        }),
        expect.objectContaining({
          quantity: 2,
          initialRisk: 20,
          realizedPnl: 40,
        }),
      ]),
    )
    expect(
      trades.reduce((sum, trade) => sum + (trade.initialRisk ?? 0), 0),
    ).toBe(100)
    await t.mutation(api.trades.close, { tradeId, ...closing })
    expect(
      (await t.query(api.trades.list)).reduce(
        (sum, trade) => sum + (trade.initialRisk ?? 0),
        0,
      ),
    ).toBe(100)
  })

  it('imports and splits older trades without inventing risk', async () => {
    const t = convexTest(schema, modules).withIdentity(identity)
    await t.mutation(api.trades.importMany, {
      expectedSubject: identity.subject,
      trades: prepareTradeImport(parseTradeFile(JSON.stringify([input]))),
    })
    const [trade] = await t.query(api.trades.list)
    await t.mutation(api.trades.split, {
      tradeId: trade._id,
      ...closing,
      closingQuantity: 4,
    })
    expect(
      (await t.query(api.trades.list)).every(
        (row) => row.initialRisk === undefined,
      ),
    ).toBe(true)
  })

  it.each([0, -1, NaN, Infinity])(
    'rejects invalid risk %s on every write path',
    async (initialRisk) => {
      const t = convexTest(schema, modules).withIdentity(identity)
      await expect(
        t.mutation(api.trades.add, { ...input, initialRisk }),
      ).rejects.toThrow('Initial risk')
      const tradeId = await t.mutation(api.trades.add, input)
      await expect(
        t.mutation(api.trades.edit, { ...input, tradeId, initialRisk }),
      ).rejects.toThrow('Initial risk')
      await expect(
        t.mutation(api.trades.importMany, {
          expectedSubject: identity.subject,
          trades: [
            { ...input, initialRisk, status: 'open', sourceId: 'invalid' },
          ],
        }),
      ).rejects.toThrow('Initial risk')
    },
  )
})
