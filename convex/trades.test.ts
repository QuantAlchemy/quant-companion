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
      conflicts: 0,
    })
    expect((await other.query(api.trades.list))[0]).toMatchObject({
      initialRisk: 100,
      realizedPnl: 200,
    })
    expect(await other.mutation(api.trades.importMany, args)).toEqual({
      inserted: 0,
      skipped: 1,
      conflicts: 0,
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

  it('does not duplicate imported trades after risk edits and a backup round trip', async () => {
    const t = convexTest(schema, modules).withIdentity(identity)
    await t.mutation(api.trades.importMany, {
      expectedSubject: identity.subject,
      trades: prepareTradeImport(parseTradeFile(JSON.stringify([input]))),
    })
    const [original] = await t.query(api.trades.list)
    for (const initialRisk of [100, 150, null]) {
      await t.mutation(api.trades.edit, {
        ...input,
        tradeId: original._id,
        initialRisk,
      })
      const [trade] = await t.query(api.trades.list)
      const { _id, _creationTime, userId: _userId, ...data } = trade
      const backup = serializeTrades([
        { ...data, id: _id, createdAt: _creationTime },
      ])
      expect(
        await t.mutation(api.trades.importMany, {
          expectedSubject: identity.subject,
          trades: prepareTradeImport(parseTradeFile(backup)),
        }),
      ).toEqual({ inserted: 0, skipped: 1, conflicts: 0 })
      const saved = await t.query(api.trades.list)
      expect(saved).toHaveLength(1)
      expect(saved[0].initialRisk).toBe(initialRisk ?? undefined)
    }
  })

  it('keeps distinct risks when an ID-free backup gains a trade in a different order', async () => {
    const t = convexTest(schema, modules).withIdentity(identity)
    const first = { ...input, status: 'open' as const, initialRisk: 100 }
    const second = { ...first, initialRisk: 200 }
    await t.mutation(api.trades.importMany, {
      expectedSubject: identity.subject,
      trades: prepareTradeImport([first]),
    })
    expect(
      await t.mutation(api.trades.importMany, {
        expectedSubject: identity.subject,
        trades: prepareTradeImport([second, first]),
      }),
    ).toEqual({ inserted: 1, skipped: 1, conflicts: 0 })
    expect(
      (await t.query(api.trades.list)).map((trade) => trade.initialRisk).sort(),
    ).toEqual([100, 200])
  })

  it('reports conflicting risk while importing the rest of an older backup', async () => {
    const t = convexTest(schema, modules).withIdentity(identity)
    const [first] = prepareTradeImport([
      { ...input, status: 'open', initialRisk: 100 },
    ])
    await t.mutation(api.trades.importMany, {
      expectedSubject: identity.subject,
      trades: [first],
    })
    const [stored] = await t.query(api.trades.list)
    await t.mutation(api.trades.edit, {
      ...input,
      tradeId: stored._id,
      initialRisk: 200,
    })
    const [unrelated] = prepareTradeImport([
      { ...input, assetName: 'OTHER', status: 'open' },
    ])
    const backup = {
      expectedSubject: identity.subject,
      trades: [first, unrelated],
    }
    expect(await t.mutation(api.trades.importMany, backup)).toEqual({
      inserted: 1,
      skipped: 0,
      conflicts: 1,
    })
    const saved = await t.query(api.trades.list)
    expect(saved).toHaveLength(2)
    expect(saved.find((trade) => trade._id === stored._id)?.initialRisk).toBe(
      200,
    )
    expect(await t.mutation(api.trades.importMany, backup)).toEqual({
      inserted: 0,
      skipped: 1,
      conflicts: 1,
    })
    expect(
      await t.mutation(api.trades.importMany, {
        expectedSubject: identity.subject,
        trades: [{ ...first, sourceId: 'separate-trade' }],
      }),
    ).toEqual({ inserted: 1, skipped: 0, conflicts: 0 })
    expect(
      (await t.query(api.trades.list)).map((trade) => trade.initialRisk),
    ).toEqual(expect.arrayContaining([100, 200, undefined]))
  })

  it.each([false, true])(
    'restores every row in a mixed backup, reversed: %s',
    async (reverse) => {
      const t = convexTest(schema, modules).withIdentity(identity)
      await t.mutation(api.trades.importMany, {
        expectedSubject: identity.subject,
        trades: prepareTradeImport([
          { ...input, status: 'open', initialRisk: 100 },
        ]),
      })
      await t.mutation(api.trades.add, { ...input, initialRisk: 100 })
      const rows = (await t.query(api.trades.list)).map(
        ({ _id, _creationTime, userId: _userId, ...data }) => ({
          ...data,
          id: _id,
          createdAt: _creationTime,
        }),
      )
      const backup = serializeTrades(reverse ? rows.reverse() : rows)
      const other = convexTest(schema, modules).withIdentity(identity)
      const args = {
        expectedSubject: identity.subject,
        trades: prepareTradeImport(parseTradeFile(backup)),
      }
      expect(await other.mutation(api.trades.importMany, args)).toEqual({
        inserted: 2,
        skipped: 0,
        conflicts: 0,
      })
      expect(
        (await other.query(api.trades.list)).map((trade) => trade.initialRisk),
      ).toEqual([100, 100])
      expect(await other.mutation(api.trades.importMany, args)).toEqual({
        inserted: 0,
        skipped: 2,
        conflicts: 0,
      })
    },
  )

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
