import { ConvexError, v } from 'convex/values'

import type { ObjectType, PropertyValidators } from 'convex/values'

import { internalMutation, internalQuery } from '../_generated/server'
import {
  addTrade,
  assertIsoDate,
  assertPositiveNumber,
  closeTrade,
  editTrade,
  getOwnedTrade,
  importTrades,
  importedTrade,
  listTrades,
  normalizeAssetName,
  realizedPnlFor,
  removeTrades,
  splitTrade,
  tradeInput,
} from '../model/trades'
import { netJournalPnl } from '../../src/lib/journal'
import {
  journalTradesToPerformanceTrades,
  summarizePerformance,
} from '../../src/lib/performance'

import type { Doc } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'

/**
 * Journal functions for the MCP server. They are internal: only the MCP HTTP
 * action calls them, after Clerk verifies the agent's token. `userId` is the
 * same Clerk tokenIdentifier the browser journal uses.
 */

/**
 * Production Convex hides plain Error text outside the function. Agents need
 * the reason ("Did you mean ...", "Ask the user ..."), so these builders
 * rethrow it as a ConvexError, whose data always passes through.
 */
const asAgentError = (error: unknown) =>
  error instanceof Error && !(error instanceof ConvexError)
    ? new ConvexError(error.message)
    : error

const agentQuery = <TArgs extends PropertyValidators, TResult>(definition: {
  args: TArgs
  handler: (ctx: QueryCtx, args: ObjectType<TArgs>) => Promise<TResult>
}) =>
  internalQuery({
    args: definition.args,
    handler: (ctx, args: ObjectType<TArgs>) =>
      definition.handler(ctx, args).catch((error: unknown) => {
        throw asAgentError(error)
      }),
  })

const agentMutation = <TArgs extends PropertyValidators, TResult>(definition: {
  args: TArgs
  handler: (ctx: MutationCtx, args: ObjectType<TArgs>) => Promise<TResult>
}) =>
  internalMutation({
    args: definition.args,
    handler: (ctx, args: ObjectType<TArgs>) =>
      definition.handler(ctx, args).catch((error: unknown) => {
        throw asAgentError(error)
      }),
  })

const owner = { userId: v.string() }
const side = v.union(v.literal('buy'), v.literal('sell'))
const assetType = v.union(v.literal('crypto'), v.literal('traditional'))

const accountName = (trade: Doc<'trades'>) => trade.exchange?.trim() || null

/** Agent-facing trade shape. "account" is the app's Exchange field. */
const tradeView = (trade: Doc<'trades'>) => ({
  id: trade._id,
  account: accountName(trade),
  symbol: trade.assetName,
  assetType: trade.assetType,
  tradeType: trade.tradeType,
  side: trade.tradeType === 'buy' ? 'long' : 'short',
  status: trade.status,
  quantity: trade.quantity,
  entryPrice: trade.price,
  tradeDate: trade.tradeDate,
  closingPrice: trade.closingPrice ?? null,
  closingDate: trade.closingDate ?? null,
  grossPnl: trade.realizedPnl ?? null,
  commission: trade.commission ?? null,
  netPnl: netJournalPnl(trade.realizedPnl, trade.commission),
  initialRisk: trade.initialRisk ?? null,
  comments: trade.comments ?? null,
})

const resolveTradeId = (ctx: QueryCtx, id: string) => {
  const tradeId = ctx.db.normalizeId('trades', id)
  if (!tradeId) throw new Error(`Trade ${id} not found`)
  return tradeId
}

/**
 * Agents must reuse the user's account names, such as "Vanguard - Ralph".
 * A new name needs explicit confirmation, which catches typos and guesses.
 */
const assertKnownAccount = (
  trades: Doc<'trades'>[],
  account: string | undefined,
  newAccount: boolean,
) => {
  const name = account?.trim()
  if (!name || newAccount) return
  const names = [...new Set(trades.flatMap((t) => accountName(t) ?? []))]
  if (names.includes(name)) return
  const similar = names.find((n) => n.toLowerCase() === name.toLowerCase())
  throw new Error(
    similar
      ? `Account "${name}" does not exist. Did you mean "${similar}"?`
      : `Account "${name}" does not exist. Known accounts: ${names.map((n) => `"${n}"`).join(', ') || 'none'}. Ask the user, then set newAccount to true only if they confirm a new account.`,
  )
}

// Treat float dust from crypto quantities as a whole lot.
const EPSILON = 1e-9

const byOldestFirst = (a: Doc<'trades'>, b: Doc<'trades'>) =>
  a.tradeDate.localeCompare(b.tradeDate) || a._creationTime - b._creationTime

/** Accounts with their open positions, so an agent can map a broker email to an account. */
export const overview = agentQuery({
  args: owner,
  handler: async (ctx, { userId }) => {
    const trades = await listTrades(ctx, userId)
    const accounts = new Map<
      string | null,
      { trades: number; open: Doc<'trades'>[]; lastTradeDate: string }
    >()
    for (const trade of trades) {
      const name = accountName(trade)
      const entry = accounts.get(name) ?? {
        trades: 0,
        open: [],
        lastTradeDate: trade.tradeDate,
      }
      entry.trades += 1
      if (trade.status === 'open') entry.open.push(trade)
      const activity = trade.closingDate ?? trade.tradeDate
      if (activity > entry.lastTradeDate) entry.lastTradeDate = activity
      accounts.set(name, entry)
    }
    return [...accounts.entries()]
      .map(([name, entry]) => {
        const positions = new Map<string, Doc<'trades'>[]>()
        for (const trade of entry.open) {
          const key = `${trade.assetName}:${trade.tradeType}`
          positions.set(key, [...(positions.get(key) ?? []), trade])
        }
        return {
          account: name,
          trades: entry.trades,
          lastActivityDate: entry.lastTradeDate,
          openPositions: [...positions.values()].map((lots) => {
            const quantity = lots.reduce((sum, lot) => sum + lot.quantity, 0)
            const cost = lots.reduce(
              (sum, lot) => sum + lot.quantity * lot.price,
              0,
            )
            return {
              symbol: lots[0].assetName,
              assetType: lots[0].assetType,
              side: lots[0].tradeType === 'buy' ? 'long' : 'short',
              quantity,
              averageEntryPrice: cost / quantity,
              lots: lots.sort(byOldestFirst).map((lot) => ({
                id: lot._id,
                quantity: lot.quantity,
                entryPrice: lot.price,
                tradeDate: lot.tradeDate,
              })),
            }
          }),
        }
      })
      .sort((a, b) => b.lastActivityDate.localeCompare(a.lastActivityDate))
  },
})

const tradeFilter = {
  account: v.optional(v.string()),
  symbol: v.optional(v.string()),
  status: v.optional(v.union(v.literal('open'), v.literal('closed'))),
  from: v.optional(v.string()),
  to: v.optional(v.string()),
}

type TradeFilter = {
  account?: string
  symbol?: string
  status?: 'open' | 'closed'
  from?: string
  to?: string
}

/** Dates match the closing date of closed trades and the entry date of open ones. */
const filterTrades = (trades: Doc<'trades'>[], filter: TradeFilter) => {
  if (filter.from) assertIsoDate(filter.from, 'From')
  if (filter.to) assertIsoDate(filter.to, 'To')
  const symbol = filter.symbol && normalizeAssetName(filter.symbol)
  return trades.filter((trade) => {
    const date = trade.closingDate ?? trade.tradeDate
    return (
      (filter.account == null ||
        accountName(trade) === filter.account.trim()) &&
      (!symbol || trade.assetName === symbol) &&
      (!filter.status || trade.status === filter.status) &&
      (!filter.from || date >= filter.from) &&
      (!filter.to || date <= filter.to)
    )
  })
}

export const list = agentQuery({
  args: { ...owner, ...tradeFilter, limit: v.number(), offset: v.number() },
  handler: async (ctx, { userId, limit, offset, ...filter }) => {
    const matches = filterTrades(await listTrades(ctx, userId), filter)
    const page = matches.slice(offset, offset + limit)
    return {
      total: matches.length,
      trades: page.map(tradeView),
      nextOffset:
        offset + page.length < matches.length ? offset + page.length : null,
    }
  },
})

export const get = agentQuery({
  args: { ...owner, tradeId: v.string() },
  handler: async (ctx, { userId, tradeId }) =>
    tradeView(await getOwnedTrade(ctx, userId, resolveTradeId(ctx, tradeId))),
})

/** The journal summary the app shows, net of commission. Open trades have no live price here. */
export const performance = agentQuery({
  args: { ...owner, ...tradeFilter },
  handler: async (ctx, { userId, ...filter }) => {
    const matches = filterTrades(await listTrades(ctx, userId), filter)
    const summary = summarizePerformance(
      journalTradesToPerformanceTrades(
        matches.map((trade) => ({
          ...trade,
          id: trade._id,
          createdAt: trade._creationTime,
        })),
      ),
    )
    const {
      unrealizedPnl: _unrealized,
      totalPnl: _total,
      ...closedSummary
    } = summary
    return {
      ...closedSummary,
      // JSON has no Infinity. Null means no losing trades.
      profitFactor: Number.isFinite(summary.profitFactor)
        ? summary.profitFactor
        : null,
    }
  },
})

/** Return the stored result of a repeated request, or reject a reused ID with new input. */
const replay = async (
  ctx: MutationCtx,
  userId: string,
  requestId: string,
  input: unknown,
) => {
  const previous = await ctx.db
    .query('agentRequests')
    .withIndex('by_userId_and_requestId', (q) =>
      q.eq('userId', userId).eq('requestId', requestId),
    )
    .unique()
  if (!previous) return null
  if (previous.input !== JSON.stringify(input)) {
    // Say that the first request was applied, so an agent does not repeat it with a new ID.
    throw new Error(
      `This requestId was already applied to a different request, with this result: ${previous.result}. Do not record it again with a new requestId. Check the trades and ask the user.`,
    )
  }
  return { ...(JSON.parse(previous.result) as object), replayed: true }
}

const remember = async (
  ctx: MutationCtx,
  userId: string,
  requestId: string,
  input: unknown,
  result: object,
) => {
  await ctx.db.insert('agentRequests', {
    userId,
    requestId,
    input: JSON.stringify(input),
    result: JSON.stringify(result),
  })
  return result
}

export const add = agentMutation({
  args: {
    ...owner,
    ...tradeInput,
    requestId: v.string(),
    newAccount: v.boolean(),
  },
  handler: async (ctx, { userId, requestId, newAccount, ...input }) => {
    const previous = await replay(ctx, userId, requestId, input)
    if (previous) return previous
    assertKnownAccount(
      await listTrades(ctx, userId),
      input.exchange,
      newAccount,
    )
    const tradeId = await addTrade(ctx, userId, input)
    const created = await ctx.db.get(tradeId)
    return remember(ctx, userId, requestId, input, {
      trade: created && tradeView(created),
    })
  },
})

/** Apply only the supplied fields. Null clears an optional field. */
export const update = agentMutation({
  args: {
    ...owner,
    tradeId: v.string(),
    newAccount: v.boolean(),
    changes: v.object({
      assetName: v.optional(v.string()),
      assetType: v.optional(assetType),
      quantity: v.optional(v.number()),
      price: v.optional(v.number()),
      tradeType: v.optional(side),
      tradeDate: v.optional(v.string()),
      commission: v.optional(v.union(v.number(), v.null())),
      initialRisk: v.optional(v.union(v.number(), v.null())),
      exchange: v.optional(v.union(v.string(), v.null())),
      comments: v.optional(v.union(v.string(), v.null())),
    }),
  },
  handler: async (ctx, { userId, tradeId, newAccount, changes }) => {
    const id = resolveTradeId(ctx, tradeId)
    const current = await getOwnedTrade(ctx, userId, id)
    if (changes.exchange != null) {
      assertKnownAccount(
        await listTrades(ctx, userId),
        changes.exchange,
        newAccount,
      )
    }
    const keep = <T>(next: T | null | undefined, previous: T | undefined) =>
      next === null ? undefined : (next ?? previous)
    await editTrade(ctx, userId, id, {
      assetName: changes.assetName ?? current.assetName,
      assetType: changes.assetType ?? current.assetType,
      quantity: changes.quantity ?? current.quantity,
      price: changes.price ?? current.price,
      tradeType: changes.tradeType ?? current.tradeType,
      tradeDate: changes.tradeDate ?? current.tradeDate,
      commission: keep(changes.commission, current.commission),
      initialRisk: changes.initialRisk,
      exchange: keep(changes.exchange, current.exchange),
      comments: keep(changes.comments, current.comments),
    })
    return tradeView(await getOwnedTrade(ctx, userId, id))
  },
})

const appendComment = (
  existing: string | undefined,
  note: string | undefined,
) => (note ? (existing ? `${existing}\n${note}` : note) : existing)

/** Close a whole trade, or part of it as a new closed row. Adds the exit fee to the closed row. */
const closeLot = async (
  ctx: MutationCtx,
  userId: string,
  lot: Doc<'trades'>,
  close: {
    price: number
    date: string
    quantity: number
    commission?: number
    comments?: string
  },
) => {
  const partial = close.quantity < lot.quantity
  const target = {
    tradeId: lot._id,
    closingPrice: close.price,
    closingDate: close.date,
  }
  let closedId = lot._id
  if (partial) {
    const split = await splitTrade(ctx, userId, {
      ...target,
      closingQuantity: close.quantity,
    })
    closedId = split.closedTradeId
  } else {
    await closeTrade(ctx, userId, target)
  }
  const closed = await getOwnedTrade(ctx, userId, closedId)
  if (close.commission || close.comments) {
    await ctx.db.patch(closedId, {
      commission:
        close.commission == null
          ? closed.commission
          : (closed.commission ?? 0) + close.commission,
      comments: appendComment(closed.comments, close.comments),
    })
  }
  return {
    closed: tradeView(await getOwnedTrade(ctx, userId, closedId)),
    remaining: partial
      ? tradeView(await getOwnedTrade(ctx, userId, lot._id))
      : null,
  }
}

export const close = agentMutation({
  args: {
    ...owner,
    tradeId: v.string(),
    closingPrice: v.number(),
    closingDate: v.string(),
    quantity: v.optional(v.number()),
    commission: v.optional(v.number()),
    requestId: v.string(),
  },
  handler: async (ctx, { userId, requestId, ...input }) => {
    // A retried partial close would otherwise split the lot a second time.
    const previous = await replay(ctx, userId, requestId, input)
    if (previous) return previous
    const { tradeId, closingPrice, closingDate, quantity, commission } = input
    const lot = await getOwnedTrade(ctx, userId, resolveTradeId(ctx, tradeId))
    if (quantity != null) assertPositiveNumber(quantity, 'Quantity')
    if (quantity != null && quantity > lot.quantity * (1 + EPSILON)) {
      throw new Error(
        `Quantity ${quantity} exceeds the open quantity ${lot.quantity}`,
      )
    }
    if (
      commission != null &&
      (!Number.isFinite(commission) || commission < 0)
    ) {
      throw new Error('Commission must be a finite non-negative number')
    }
    const whole = quantity == null || quantity >= lot.quantity * (1 - EPSILON)
    const result = await closeLot(ctx, userId, lot, {
      price: closingPrice,
      date: closingDate,
      quantity: whole ? lot.quantity : quantity,
      commission,
    })
    return remember(ctx, userId, requestId, input, result)
  },
})

export const remove = agentMutation({
  args: { ...owner, tradeIds: v.array(v.string()) },
  handler: async (ctx, { userId, tradeIds }) => {
    const ids = [...new Set(tradeIds)].map((id) => resolveTradeId(ctx, id))
    const found = await Promise.all(ids.map((id) => ctx.db.get(id)))
    // Check every ID first, so one foreign ID deletes nothing.
    if (found.some((trade) => trade && trade.userId !== userId)) {
      throw new Error('Not authorized')
    }
    const deleted = found.filter((trade) => trade !== null)
    await removeTrades(
      ctx,
      userId,
      deleted.map((trade) => trade._id),
    )
    // A retry finds its trades already gone and reports them, not an error.
    return {
      deleted: deleted.map(tradeView),
      alreadyDeleted: ids.length - deleted.length,
    }
  },
})

/**
 * One batch of an import the MCP server already validated with the app's
 * file parser and gave source IDs across the whole file. `accounts` lists
 * every account in the file, so an unknown name stops the first batch.
 */
export const importMany = agentMutation({
  args: {
    ...owner,
    trades: v.array(importedTrade),
    accounts: v.array(v.string()),
    newAccount: v.boolean(),
  },
  handler: async (ctx, { userId, trades, accounts, newAccount }) => {
    const existing = await listTrades(ctx, userId)
    for (const name of accounts) {
      assertKnownAccount(existing, name, newAccount)
    }
    return importTrades(ctx, userId, trades)
  },
})

const executionInput = {
  account: v.string(),
  newAccount: v.boolean(),
  symbol: v.string(),
  assetType: v.optional(assetType),
  side,
  quantity: v.number(),
  price: v.number(),
  date: v.string(),
  commission: v.optional(v.number()),
  comments: v.optional(v.string()),
  allowShort: v.boolean(),
}

/**
 * Record one broker fill, such as "Sell 53 STRC at $97.95". A fill against
 * open lots in the opposite direction closes them oldest first, splitting the
 * last lot when needed. Otherwise it opens a new lot. dryRun returns the plan
 * without writing.
 */
export const recordExecution = agentMutation({
  args: {
    ...owner,
    ...executionInput,
    requestId: v.string(),
    dryRun: v.boolean(),
    planId: v.optional(v.string()),
  },
  handler: async (ctx, { userId, requestId, dryRun, planId, ...input }) => {
    if (!dryRun) {
      const previous = await replay(ctx, userId, requestId, input)
      if (previous) return previous
    }
    const account = input.account.trim()
    const symbol = normalizeAssetName(input.symbol)
    assertPositiveNumber(input.quantity, 'Quantity')
    assertPositiveNumber(input.price, 'Price')
    assertIsoDate(input.date, 'Date')
    if (
      input.commission != null &&
      (!Number.isFinite(input.commission) || input.commission < 0)
    ) {
      throw new Error('Commission must be a finite non-negative number')
    }
    const all = await listTrades(ctx, userId)
    assertKnownAccount(all, account, input.newAccount)

    const opposite = all.filter(
      (t) =>
        t.status === 'open' &&
        accountName(t) === account &&
        t.assetName === symbol &&
        t.tradeType !== input.side,
    )
    const lots = opposite
      .filter((t) => t.tradeDate <= input.date)
      .sort(byOldestFirst)
    const openQuantity = lots.reduce((sum, lot) => sum + lot.quantity, 0)
    // The whole position after this fill, including lots dated after it.
    const remainingOpenQuantity =
      opposite.reduce((sum, lot) => sum + lot.quantity, 0) - input.quantity
    const later = opposite.length - lots.length
    const laterNote =
      later > 0
        ? ` ${later} open lot(s) are dated after ${input.date} and cannot close yet.`
        : ''
    const direction = input.side === 'sell' ? 'long' : 'short'

    if (lots.length > 0 && input.quantity > openQuantity * (1 + EPSILON)) {
      throw new Error(
        `This ${input.side} of ${input.quantity} ${symbol} exceeds the open ${direction} position of ${openQuantity} in "${account}".${laterNote} Check for a missing trade, or record the close and the rest separately.`,
      )
    }
    if (lots.length === 0 && later > 0) {
      throw new Error(
        `"${account}" has ${later} open ${direction} ${symbol} lot(s), all dated after ${input.date}. Check the trade date with the user.`,
      )
    }
    if (lots.length === 0 && input.side === 'sell' && !input.allowShort) {
      throw new Error(
        `"${account}" has no open long ${symbol} position to sell.${laterNote} Ask the user whether a buy is missing. Set allowShort to true only if they confirm this opens a short position.`,
      )
    }

    let remaining = input.quantity
    const plan = lots.flatMap((lot) => {
      if (remaining <= EPSILON * input.quantity) return []
      const whole = remaining >= lot.quantity * (1 - EPSILON)
      const quantity = whole ? lot.quantity : remaining
      remaining -= quantity
      return [{ lot, quantity }]
    })
    // Identifies the lots a dry run showed, so the apply can refuse a changed plan.
    const currentPlanId =
      plan.length === 0
        ? 'open'
        : JSON.stringify(
            plan.map(({ lot, quantity }) => [
              lot._id,
              quantity,
              lot.quantity,
              lot.price,
              lot.tradeType,
              lot.commission ?? null,
            ]),
          )
    if (!dryRun && planId != null && planId !== currentPlanId) {
      throw new Error(
        'The open lots changed since the dry run. Run the dry run again and show the user the new plan.',
      )
    }
    const commissionFor = (quantity: number) =>
      input.commission == null
        ? undefined
        : (input.commission * quantity) / input.quantity

    if (plan.length === 0) {
      if (!input.assetType) {
        throw new Error('assetType is required to open a new position')
      }
      const opened = {
        assetName: symbol,
        assetType: input.assetType,
        quantity: input.quantity,
        price: input.price,
        tradeType: input.side,
        tradeDate: input.date,
        commission: input.commission,
        exchange: account,
        comments: input.comments,
      }
      if (dryRun)
        return {
          applied: false,
          planId: currentPlanId,
          opened: { ...opened, account },
          closed: [],
        }
      const tradeId = await addTrade(ctx, userId, opened)
      return remember(ctx, userId, requestId, input, {
        applied: true,
        opened: tradeView(await getOwnedTrade(ctx, userId, tradeId)),
        closed: [],
      })
    }

    if (dryRun) {
      const closed = plan.map(({ lot, quantity }) => {
        const grossPnl = realizedPnlFor(
          lot.tradeType,
          lot.price,
          input.price,
          quantity,
        )
        const entryFee =
          lot.commission == null
            ? 0
            : (lot.commission * quantity) / lot.quantity
        const commission = entryFee + (commissionFor(quantity) ?? 0)
        return {
          tradeId: lot._id,
          tradeDate: lot.tradeDate,
          entryPrice: lot.price,
          quantity,
          partial: quantity < lot.quantity,
          grossPnl,
          commission,
          netPnl: grossPnl - commission,
        }
      })
      return {
        applied: false,
        planId: currentPlanId,
        opened: null,
        closed,
        netPnl: closed.reduce((sum, row) => sum + row.netPnl, 0),
        remainingOpenQuantity,
      }
    }

    const results = []
    for (const { lot, quantity } of plan) {
      results.push(
        await closeLot(ctx, userId, lot, {
          price: input.price,
          date: input.date,
          quantity,
          commission: commissionFor(quantity),
          comments: input.comments,
        }),
      )
    }
    return remember(ctx, userId, requestId, input, {
      applied: true,
      opened: null,
      closed: results.map((r) => r.closed),
      remaining: results.flatMap((r) => r.remaining ?? []),
      netPnl: results.reduce((sum, r) => sum + (r.closed.netPnl ?? 0), 0),
      remainingOpenQuantity,
    })
  },
})
