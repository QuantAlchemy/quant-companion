import { useUser } from '@clerk/tanstack-react-start'
import { auth } from '@clerk/tanstack-react-start/server'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useStore } from '@tanstack/react-store'
import { createServerFn } from '@tanstack/react-start'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, FlaskConical, Plus, RefreshCw, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'

import JournalStats from '@/components/journal/JournalStats'
import {
  CloseTradeDialog,
  SplitTradeDialog,
  TradeFormDialog,
} from '@/components/journal/TradeDialogs'
import TradeTable from '@/components/journal/TradeTable'
import PerformanceOverview from '@/components/performance/PerformanceOverview'
import { Button } from '@/components/ui/button'
import { isLocalhostHostname } from '@/lib/environment'
import {
  deleteTrades,
  exportTrades,
  importTrades,
  journalStore,
  loadDemoTrades,
  setJournalUser,
} from '@/lib/journal'
import { journalTradesToPerformanceTrades } from '@/lib/performance'
import { getMarketPrices } from '@/lib/prices'
import { startingEquityStore } from '@/lib/stats'

import type { RowSelectionState } from '@tanstack/react-table'
import type { JournalTrade } from '@/lib/journal'
import { seo } from '@/lib/seo'

const authStateFn = createServerFn().handler(async () => {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated) {
    throw redirect({ to: '/sign-in/$' })
  }
  return { userId }
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
  component: JournalPage,
})

function JournalPage() {
  const { user } = useUser()
  const trades = useStore(journalStore)
  const startingEquity = useStore(startingEquityStore)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [formOpen, setFormOpen] = useState(false)
  const [editingTrade, setEditingTrade] = useState<JournalTrade | null>(null)
  const [closingTrade, setClosingTrade] = useState<JournalTrade | null>(null)
  const [splittingTrade, setSplittingTrade] = useState<JournalTrade | null>(null)
  const [isLocalhost, setIsLocalhost] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)

  // bind the journal to the signed-in user
  useEffect(() => {
    setJournalUser(user?.id)
  }, [user?.id])

  useEffect(() => {
    setIsLocalhost(isLocalhostHostname(window.location.hostname))
  }, [])

  const openSymbols = useMemo(() => {
    const open = trades.filter((t) => t.status === 'open')
    return {
      crypto: [...new Set(open.filter((t) => t.assetType === 'crypto').map((t) => t.assetName))],
      traditional: [
        ...new Set(open.filter((t) => t.assetType === 'traditional').map((t) => t.assetName)),
      ],
    }
  }, [trades])

  const pricesQuery = useQuery({
    queryKey: ['market-prices', openSymbols],
    queryFn: () => getMarketPrices({ data: openSymbols }),
    enabled: openSymbols.crypto.length > 0 || openSymbols.traditional.length > 0,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
  const prices = pricesQuery.data ?? {}
  const performanceTrades = useMemo(
    () => journalTradesToPerformanceTrades(trades, prices),
    [prices, trades]
  )

  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id])

  const handleExport = () => {
    const blob = new Blob([exportTrades()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `quant-companion-journal-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const count = importTrades(await file.text())
      toast.success(`Imported ${count} trades`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import failed')
    } finally {
      if (importInputRef.current) importInputRef.current.value = ''
    }
  }

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return
    deleteTrades(selectedIds)
    setRowSelection({})
    toast.success(`Deleted ${selectedIds.length} trade${selectedIds.length > 1 ? 's' : ''}`)
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-8 md:px-8">
      <div className="rise-in mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="kicker">Discipline compounds</p>
          <h1 className="font-display mt-2 text-3xl md:text-4xl">Trading Journal</h1>
          <p className="mt-2 text-muted-foreground">
            Log entries with your reasoning, close them with honesty, and let the
            streaks keep you accountable.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={importInputRef}
            type="file"
            hidden
            accept=".json,.jsonl"
            onChange={handleImport}
          />
          <Button variant="ghost" size="sm" onClick={() => importInputRef.current?.click()}>
            <Upload className="mr-1.5 h-4 w-4" /> Import
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExport}
            disabled={trades.length === 0}
          >
            <Download className="mr-1.5 h-4 w-4" /> Export
          </Button>
          {isLocalhost && trades.length === 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                loadDemoTrades()
                toast.success('Demo trades loaded')
              }}
            >
              <FlaskConical className="mr-1.5 h-4 w-4" /> Demo data
            </Button>
          )}
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
            {selectedIds.length > 0 && (
              <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="mr-1.5 h-4 w-4" />
                Delete {selectedIds.length}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => pricesQuery.refetch()}
              disabled={pricesQuery.isFetching}
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
          onClose={setClosingTrade}
          onSplit={setSplittingTrade}
          onEdit={(trade) => {
            setEditingTrade(trade)
            setFormOpen(true)
          }}
        />
        <p className="mt-3 text-xs text-muted-foreground">
          Live prices require COINMARKETCAP_API_KEY (crypto) and ALPACA keys
          (stocks) on the server — without them the journal still works, minus
          unrealized P&L.
        </p>
      </div>

      <TradeFormDialog open={formOpen} onOpenChange={setFormOpen} trade={editingTrade} />
      <CloseTradeDialog
        open={closingTrade !== null}
        onOpenChange={(open) => !open && setClosingTrade(null)}
        trade={closingTrade}
      />
      <SplitTradeDialog
        open={splittingTrade !== null}
        onOpenChange={(open) => !open && setSplittingTrade(null)}
        trade={splittingTrade}
      />
    </div>
  )
}
