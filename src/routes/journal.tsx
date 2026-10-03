import { useUser } from '@clerk/tanstack-react-start'
import { auth } from '@clerk/tanstack-react-start/server'
import { useQuery as useTanStackQuery } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useStore } from '@tanstack/react-store'
import { createServerFn } from '@tanstack/react-start'
import { useConvexAuth, useMutation, useQuery } from 'convex/react'
import { Download, Plus, RefreshCw, Trash2, Upload } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import JournalStats from '@/components/journal/JournalStats'
import {
  CloseTradeDialog,
  SplitTradeDialog,
  TradeFormDialog,
} from '@/components/journal/TradeDialogs'
import TradeTable, {
  TradeTableColumnPicker,
  useTradeTableColumnVisibility,
} from '@/components/journal/TradeTable'
import PerformanceOverview from '@/components/performance/PerformanceOverview'
import { Button } from '@/components/ui/button'
import { api } from '@/../convex/_generated/api'
import { award } from '@/lib/gamification'
import {
  markLegacyBrowserJournalMigrated,
  parseTradeFile,
  prepareMissingTradeImport,
  prepareTradeImport,
  readLegacyBrowserJournal,
  serializeTrades,
} from '@/lib/journal'
import { journalTradesToPerformanceTrades } from '@/lib/performance'
import { getMarketPrices } from '@/lib/prices'
import { seo } from '@/lib/seo'
import { startingEquityStore } from '@/lib/stats'

import type { Doc, Id } from '@/../convex/_generated/dataModel'
import type { RowSelectionState } from '@tanstack/react-table'
import type { JournalTrade, NewTrade } from '@/lib/journal'

const MAX_IMPORT_BYTES = 10 * 1024 * 1024
// Keep this aligned with MAX_IMPORT_BATCH in convex/trades.ts.
const MAX_IMPORT_BATCH = 50
const MAX_DELETE_BATCH = 100

interface ImportProgress {
  inserted: number
  skipped: number
}

class ImportCancelledError extends Error {
  constructor(readonly progress: ImportProgress) {
    super('Import cancelled because the account changed')
    this.name = 'ImportCancelledError'
  }
}

type PreparedTradeImport = ReturnType<typeof prepareTradeImport>

const authStateFn = createServerFn().handler(async () => {
  const { isAuthenticated } = await auth()
  if (!isAuthenticated) {
    throw redirect({ to: '/sign-in/$' })
  }
})

export const Route = createFileRoute('/journal')({
  beforeLoad: async () => await authStateFn(),
  head: () =>
    seo({
      title: 'Trading Journal · Quant Companion',
      description:
        'Log trades with your reasoning, track live unrealized P&L, and build discipline with streaks and achievements.',
      path: '/journal',
    }),
  component: JournalRoute,
})

function JournalRoute() {
  const { convexClient } = Route.useRouteContext()

  if (!convexClient) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl">Journal unavailable</h1>
        <p className="mt-3 text-muted-foreground">
          The journal database is not configured for this environment.
        </p>
      </div>
    )
  }

  return <JournalPage />
}

const toJournalTrade = (trade: Doc<'trades'>): JournalTrade => {
  const { _creationTime, _id, userId: _userId, ...journalData } = trade
  return { ...journalData, id: _id, createdAt: _creationTime }
}

function JournalPage() {
  const { user } = useUser()
  const { isAuthenticated, isLoading: authIsLoading } = useConvexAuth()
  const tradeDocuments = useQuery(
    api.trades.list,
    isAuthenticated ? {} : 'skip',
  )
  const addTrade = useMutation(api.trades.add)
  const editTrade = useMutation(api.trades.edit)
  const closeTrade = useMutation(api.trades.close)
  const splitTrade = useMutation(api.trades.split)
  const removeTrades = useMutation(api.trades.remove)
  const importTrades = useMutation(api.trades.importMany)
  const startingEquity = useStore(startingEquityStore)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [columnVisibility, setColumnVisibility] =
    useTradeTableColumnVisibility()
  const [formOpen, setFormOpen] = useState(false)
  const [editingTrade, setEditingTrade] = useState<JournalTrade | null>(null)
  const [closingTrade, setClosingTrade] = useState<JournalTrade | null>(null)
  const [splittingTrade, setSplittingTrade] = useState<JournalTrade | null>(
    null,
  )
  const [isImporting, setIsImporting] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)
  const migrationRunningForUserRef = useRef<string | null>(null)
  const accountSubjectRef = useRef<string | null>(null)

  const trades = useMemo(
    () => (tradeDocuments ?? []).map(toJournalTrade),
    [tradeDocuments],
  )
  const tradeIdsByString = useMemo(
    () =>
      new Map<string, Id<'trades'>>(
        (tradeDocuments ?? []).map((trade) => [trade._id, trade._id] as const),
      ),
    [tradeDocuments],
  )

  const importPreparedTrades = useCallback(
    async (
      preparedTrades: PreparedTradeImport,
      expectedSubject: string,
      onProgress: (progress: ImportProgress) => void,
      isActive: () => boolean,
    ) => {
      let progress: ImportProgress = { inserted: 0, skipped: 0 }
      for (
        let index = 0;
        index < preparedTrades.length;
        index += MAX_IMPORT_BATCH
      ) {
        if (!isActive()) {
          throw new ImportCancelledError(progress)
        }
        const result = await importTrades({
          expectedSubject,
          trades: preparedTrades.slice(index, index + MAX_IMPORT_BATCH),
        })
        progress = {
          inserted: progress.inserted + result.inserted,
          skipped: progress.skipped + result.skipped,
        }
        if (!isActive()) {
          throw new ImportCancelledError(progress)
        }
        onProgress(progress)
      }
      return progress
    },
    [importTrades],
  )

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      accountSubjectRef.current = null
      return
    }

    const userId = user.id
    accountSubjectRef.current = userId
    return () => {
      if (accountSubjectRef.current === userId) {
        accountSubjectRef.current = null
      }
    }
  }, [isAuthenticated, user?.id])

  useEffect(() => {
    const userId = user?.id
    if (
      !isAuthenticated ||
      !userId ||
      accountSubjectRef.current !== userId ||
      tradeDocuments === undefined
    ) {
      return
    }
    if (migrationRunningForUserRef.current === userId) return
    migrationRunningForUserRef.current = userId

    const isCurrentSession = () => accountSubjectRef.current === userId

    void (async () => {
      let progress: ImportProgress = { inserted: 0, skipped: 0 }
      try {
        const browserTrades = readLegacyBrowserJournal(userId)
        if (!browserTrades) return
        if (browserTrades.length > 5_000) {
          throw new Error('Browser journals are limited to 5,000 trades')
        }

        const missingTrades = prepareMissingTradeImport(
          browserTrades,
          tradeDocuments,
        )
        if (missingTrades.length > 0) {
          progress = await importPreparedTrades(
            missingTrades,
            userId,
            (nextProgress) => {
              progress = nextProgress
            },
            isCurrentSession,
          )
          if (progress.inserted > 0) {
            award('journal-imported')
            toast.success(
              `Recovered ${progress.inserted} browser trade${progress.inserted === 1 ? '' : 's'} to your private account`,
            )
          }
        }
        if (!isCurrentSession()) return
        markLegacyBrowserJournalMigrated(userId)
      } catch (error) {
        if (error instanceof ImportCancelledError) {
          progress = error.progress
        }
        if (!isCurrentSession()) return
        const message =
          error instanceof Error ? error.message : 'Migration failed'
        const saved = progress.inserted + progress.skipped
        toast.error(
          saved > 0
            ? `Browser journal migration stopped: ${message}. ${progress.inserted} trades were saved and ${progress.skipped} were already present. Your browser copy was kept; reload to continue safely.`
            : `Browser journal migration stopped: ${message}. Your browser copy was kept.`,
        )
      } finally {
        if (migrationRunningForUserRef.current === userId) {
          migrationRunningForUserRef.current = null
        }
      }
    })()
  }, [importPreparedTrades, isAuthenticated, tradeDocuments, user?.id])

  const openSymbols = useMemo(() => {
    const open = trades.filter((trade) => trade.status === 'open')
    return {
      crypto: [
        ...new Set(
          open
            .filter((trade) => trade.assetType === 'crypto')
            .map((trade) => trade.assetName),
        ),
      ],
      traditional: [
        ...new Set(
          open
            .filter((trade) => trade.assetType === 'traditional')
            .map((trade) => trade.assetName),
        ),
      ],
    }
  }, [trades])

  const pricesQuery = useTanStackQuery({
    queryKey: ['market-prices', openSymbols],
    queryFn: () => getMarketPrices({ data: openSymbols }),
    enabled:
      isAuthenticated &&
      (openSymbols.crypto.length > 0 || openSymbols.traditional.length > 0),
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
  const prices = pricesQuery.data ?? {}
  const performanceTrades = useMemo(
    () => journalTradesToPerformanceTrades(trades, prices),
    [prices, trades],
  )

  const selectedTradeIds = Object.keys(rowSelection).flatMap((id) => {
    if (!rowSelection[id]) return []
    const tradeId = tradeIdsByString.get(id)
    return tradeId ? [tradeId] : []
  })

  const requireTradeId = (id: string) => {
    const tradeId = tradeIdsByString.get(id)
    if (!tradeId) throw new Error('Trade not found')
    return tradeId
  }

  const handleExport = () => {
    const blob = new Blob([serializeTrades(trades)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `quant-companion-journal-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    let progress: ImportProgress = { inserted: 0, skipped: 0 }
    setIsImporting(true)
    try {
      if (file.size > MAX_IMPORT_BYTES) {
        throw new Error('Import files are limited to 10 MB')
      }
      const parsed = parseTradeFile(await file.text())
      if (parsed.length > 5_000) {
        throw new Error('Import files are limited to 5,000 trades')
      }
      const importableTrades = prepareTradeImport(parsed)
      const expectedSubject = accountSubjectRef.current
      if (!expectedSubject) {
        throw new Error('Sign in again before importing trades')
      }
      progress = await importPreparedTrades(
        importableTrades,
        expectedSubject,
        (nextProgress) => {
          progress = nextProgress
        },
        () => accountSubjectRef.current === expectedSubject,
      )
      if (progress.inserted > 0) award('journal-imported')
      toast.success(
        progress.skipped > 0
          ? `Imported ${progress.inserted} trades; skipped ${progress.skipped} already present`
          : `Imported ${progress.inserted} trades`,
      )
    } catch (error) {
      if (error instanceof ImportCancelledError) {
        progress = error.progress
      }
      const message = error instanceof Error ? error.message : 'Import failed'
      const saved = progress.inserted + progress.skipped
      toast.error(
        saved > 0
          ? `Import stopped: ${message}. ${progress.inserted} trades were saved and ${progress.skipped} were already present. Re-import the same file to continue safely.`
          : message,
      )
    } finally {
      setIsImporting(false)
      if (importInputRef.current) importInputRef.current.value = ''
    }
  }

  const handleBulkDelete = async () => {
    if (selectedTradeIds.length === 0) return
    const confirmed = window.confirm(
      `Permanently delete ${selectedTradeIds.length} selected trade${selectedTradeIds.length > 1 ? 's' : ''}? This cannot be undone.`,
    )
    if (!confirmed) return
    try {
      for (
        let index = 0;
        index < selectedTradeIds.length;
        index += MAX_DELETE_BATCH
      ) {
        await removeTrades({
          tradeIds: selectedTradeIds.slice(index, index + MAX_DELETE_BATCH),
        })
      }
      setRowSelection({})
      toast.success(
        `Deleted ${selectedTradeIds.length} trade${selectedTradeIds.length > 1 ? 's' : ''}`,
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Delete failed')
    }
  }

  const saveTrade = async (input: NewTrade) => {
    if (editingTrade) {
      await editTrade({
        tradeId: requireTradeId(editingTrade.id),
        ...input,
        initialRisk: input.initialRisk ?? null,
      })
      return
    }
    await addTrade(input)
    award('trade-logged')
    if (input.comments?.trim()) award('note-added')
  }

  if (!authIsLoading && !isAuthenticated) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl">Journal unavailable</h1>
        <p className="mt-3 text-muted-foreground">
          Your session is not connected to the journal database. Sign in again
          to continue.
        </p>
      </div>
    )
  }

  if (authIsLoading || tradeDocuments === undefined) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="kicker">Loading journal</p>
        <p className="mt-3 text-muted-foreground">
          Connecting your approved account to its private trade log.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-8 md:px-8">
      <div className="rise-in mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="kicker">Discipline compounds</p>
          <h1 className="font-display mt-2 text-3xl md:text-4xl">
            Trading Journal
          </h1>
          <p className="mt-2 text-muted-foreground">
            Log entries with your reasoning, close them with honesty, and let
            the streaks keep you accountable.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={importInputRef}
            type="file"
            hidden
            accept=".json,.jsonl"
            onChange={(event) => void handleImport(event)}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => importInputRef.current?.click()}
            disabled={isImporting}
          >
            <Upload className="mr-1.5 h-4 w-4" />
            {isImporting ? 'Importing…' : 'Import'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExport}
            disabled={trades.length === 0}
          >
            <Download className="mr-1.5 h-4 w-4" /> Export
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditingTrade(null)
              setFormOpen(true)
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Log trade
          </Button>
        </div>
      </div>

      <PerformanceOverview
        className="mb-6"
        trades={performanceTrades}
        startingEquity={startingEquity}
        sourceLabel="Journal"
      />

      <JournalStats trades={trades} prices={prices} />

      <div className="panel mt-6 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl">Trade Log</h2>
          <div className="flex items-center gap-2">
            {selectedTradeIds.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => void handleBulkDelete()}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                Delete {selectedTradeIds.length}
              </Button>
            )}
            <TradeTableColumnPicker
              columnVisibility={columnVisibility}
              onColumnVisibilityChange={setColumnVisibility}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void pricesQuery.refetch()}
              disabled={pricesQuery.isFetching}
              aria-label="Refresh market prices"
              title="Refresh market prices"
            >
              <RefreshCw
                className={`h-4 w-4 ${pricesQuery.isFetching ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>
        </div>
        <TradeTable
          trades={trades}
          prices={prices}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
          onClose={setClosingTrade}
          onSplit={setSplittingTrade}
          onEdit={(trade) => {
            setEditingTrade(trade)
            setFormOpen(true)
          }}
        />
        <p className="mt-3 text-xs text-muted-foreground">
          Journal entries sync to your private account. Live prices refresh when
          the market-data providers are available.
        </p>
      </div>

      <TradeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        trade={editingTrade}
        onSave={saveTrade}
      />
      <CloseTradeDialog
        open={closingTrade !== null}
        onOpenChange={(open) => !open && setClosingTrade(null)}
        trade={closingTrade}
        onCloseTrade={async (closingPrice, closingDate) => {
          if (!closingTrade) throw new Error('Trade not found')
          const { realizedPnl } = await closeTrade({
            tradeId: requireTradeId(closingTrade.id),
            closingPrice,
            closingDate,
          })
          award('trade-closed')
          if (realizedPnl > 0) award('trade-won')
          if (realizedPnl < 0) award('trade-lost')
          return realizedPnl
        }}
      />
      <SplitTradeDialog
        open={splittingTrade !== null}
        onOpenChange={(open) => !open && setSplittingTrade(null)}
        trade={splittingTrade}
        onSplitTrade={async (closingPrice, closingDate, closingQuantity) => {
          if (!splittingTrade) throw new Error('Trade not found')
          const { realizedPnl } = await splitTrade({
            tradeId: requireTradeId(splittingTrade.id),
            closingPrice,
            closingDate,
            closingQuantity,
          })
          award('trade-closed')
          if (realizedPnl > 0) award('trade-won')
          if (realizedPnl < 0) award('trade-lost')
          return realizedPnl
        }}
      />
    </div>
  )
}
