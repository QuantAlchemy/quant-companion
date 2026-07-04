import { useStore } from '@tanstack/react-store'
import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'

import NumberField from '@/components/NumberField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { alphaBetaRegression, benchmarkComparison } from '@/lib/benchmark'
import { calculateInvalidationReport } from '@/lib/invalidation'
import { getDailyBars } from '@/lib/prices'
import { tradeDataStore, tradeMetricsStore } from '@/lib/stats'
import { cn } from '@/lib/utils'

import type { InvalidationResult, InvalidationStatus } from '@/lib/invalidation'

const statusLabel: Record<InvalidationStatus, string> = {
  pass: 'Pass',
  watch: 'Watch',
  invalidate: 'Invalidate',
  info: 'Info',
}

const statusClasses: Record<InvalidationStatus, string> = {
  pass: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
  watch: 'border-amber-300/40 bg-amber-300/10 text-amber-100',
  invalidate: 'border-red-400/40 bg-red-400/10 text-red-100',
  info: 'border-sky-300/40 bg-sky-300/10 text-sky-100',
}

const badgeClasses = (status: InvalidationStatus) =>
  cn(
    'inline-flex rounded-full border px-2 py-1 text-xs font-semibold',
    statusClasses[status]
  )

const StatusBadge = ({ status }: { status: InvalidationStatus }) => (
  <span className={badgeClasses(status)}>{statusLabel[status]}</span>
)

const SummaryStat = ({
  label,
  value,
  className,
}: {
  label: string
  value: number
  className?: string
}) => (
  <div className={cn('rounded-lg border px-3 py-2 text-center', className)}>
    <div className="text-xl font-bold tabular-nums">{value}</div>
    <div className="text-xs text-muted-foreground">{label}</div>
  </div>
)

export function StrategyInvalidationLab() {
  const tradeData = useStore(tradeDataStore)
  const tradeMetrics = useStore(tradeMetricsStore)
  const [isExpanded, setIsExpanded] = useState(false)
  const [trials, setTrials] = useState(500)
  const [benchmarkSymbol, setBenchmarkSymbol] = useState('SPY')
  const [benchmarkResults, setBenchmarkResults] = useState<InvalidationResult[] | null>(null)
  const [benchmarkRunning, setBenchmarkRunning] = useState(false)
  const [feePerTrade, setFeePerTrade] = useState(2.5)
  const [rollingWindow, setRollingWindow] = useState(20)

  const report = useMemo(
    () =>
      calculateInvalidationReport(tradeData, tradeMetrics, {
        feePerTrade,
        rollingWindow,
        trials,
      }),
    [tradeData, tradeMetrics, feePerTrade, rollingWindow, trials]
  )

  const runBenchmarkTests = async () => {
    if (!tradeMetrics || tradeMetrics.dates.length < 2) return
    setBenchmarkRunning(true)
    try {
      const start = tradeMetrics.dates[0].toISOString().slice(0, 10)
      const end = tradeMetrics.dates[tradeMetrics.dates.length - 1]
        .toISOString()
        .slice(0, 10)
      const bars = await getDailyBars({
        data: { symbol: benchmarkSymbol.trim(), start, end },
      })
      setBenchmarkResults([
        benchmarkComparison(tradeMetrics, bars, benchmarkSymbol.trim().toUpperCase()),
        alphaBetaRegression(tradeMetrics, bars, benchmarkSymbol.trim().toUpperCase()),
      ])
    } finally {
      setBenchmarkRunning(false)
    }
  }

  return (
    <Card
      id="strategy-invalidation-lab"
      className="overflow-hidden border-primary/35 bg-card/95 2xl:col-span-2"
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="space-y-4">
          <div className="max-w-3xl space-y-2">
            <div className="kicker inline-flex rounded-full border border-primary/40 bg-primary/10 px-3 py-1">
              Strategy Invalidation v1
            </div>
            <CardTitle className="font-display text-2xl">Invalidation Lab</CardTitle>
            <CardDescription>
              TradingView-export-first tests that attack the trade list you already
              uploaded. These do not prove a strategy is good; they try to prove it is
              not obviously fake, fragile, overfit, or outlier-driven.
            </CardDescription>
            <div className="flex flex-wrap gap-2 text-sm">
              <a
                className="rounded-full border border-border px-3 py-1 text-foreground underline-offset-4 hover:underline"
                href="/strategy-invalidation-playbook.html"
                target="_blank"
                rel="noreferrer"
              >
                Open Strategy Invalidation Playbook
              </a>
              <a
                className="rounded-full border border-border px-3 py-1 text-foreground underline-offset-4 hover:underline"
                href="/strategy-invalidation-playbook-specs.html"
                target="_blank"
                rel="noreferrer"
              >
                Full test documentation
              </a>
            </div>
          </div>

          <CollapsibleTrigger
            aria-controls="strategy-invalidation-lab-content"
            className={cn(
              'flex w-full flex-col gap-4 rounded-xl border border-border/80 bg-background/35 p-4 text-left transition-colors',
              'hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
          >
            <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
              <SummaryStat label="tests" value={report.summary.totalTests} />
              <SummaryStat
                label="pass"
                value={report.summary.passCount}
                className="border-emerald-400/30 bg-emerald-400/10"
              />
              <SummaryStat
                label="watch"
                value={report.summary.watchCount}
                className="border-amber-300/30 bg-amber-300/10"
              />
              <SummaryStat
                label="invalidate"
                value={report.summary.invalidateCount}
                className="border-red-400/30 bg-red-400/10"
              />
            </div>

            <div className="flex w-full items-center justify-between gap-3 border-t border-border/60 pt-3 text-sm">
              <span className="text-muted-foreground">
                {isExpanded
                  ? 'Hide detailed invalidation results'
                  : 'Show detailed invalidation results'}
              </span>
              <span className="inline-flex items-center gap-2 font-medium text-foreground">
                {isExpanded ? 'Hide lab' : 'Show lab'}
                <ChevronDown
                  className={cn(
                    'h-4 w-4 shrink-0 transition-transform duration-200',
                    isExpanded ? 'rotate-180' : ''
                  )}
                />
              </span>
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent id="strategy-invalidation-lab-content">
          <div className="space-y-4 border-t border-border/50 px-6 pb-6">
            <div className="grid gap-3 rounded-xl border border-border/80 bg-background/35 p-4 md:grid-cols-3">
              <NumberField
                label="Random trials"
                className="w-28"
                min={50}
                max={5000}
                value={trials}
                onValueChange={setTrials}
              />
              <NumberField
                label="Fee / trade"
                className="w-28"
                min={0}
                value={feePerTrade}
                onValueChange={setFeePerTrade}
              />
              <NumberField
                label="Rolling window"
                className="w-28"
                min={5}
                value={rollingWindow}
                onValueChange={setRollingWindow}
              />
            </div>

            <CardContent className="space-y-4 p-0">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {report.results.map((result) => (
                  <article
                    key={result.id}
                    className="rounded-xl border border-border/80 bg-background/40 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold leading-tight">
                          {result.name}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {result.whatItChecks}
                        </p>
                      </div>
                      <StatusBadge status={result.status} />
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      {result.metrics.map((metric) => (
                        <div
                          key={metric.label}
                          className="rounded-lg border border-border/70 bg-card/60 p-3"
                        >
                          <div className="text-xs text-muted-foreground">
                            {metric.label}
                          </div>
                          <div
                            className={cn(
                              'tabular mt-1 text-sm font-semibold',
                              metric.tone
                                ? statusClasses[metric.tone].split(' ').at(-1)
                                : ''
                            )}
                          >
                            {metric.value}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 rounded-lg border border-border/70 bg-card/50 p-3 text-sm">
                      <div className="font-semibold">Conclusion</div>
                      <p className="mt-1 text-muted-foreground">{result.conclusion}</p>
                    </div>
                  </article>
                ))}
              </div>


              <div className="rounded-xl border border-border/80 bg-background/35 p-4">
                <h3 className="text-lg font-semibold">Benchmark tests (live market data)</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Buy-and-hold comparison and alpha/beta regression against a benchmark,
                  using Alpaca daily bars over your trade date range. Use a stock/ETF
                  symbol like SPY or QQQ, or a crypto pair like BTC/USD.
                </p>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <div className="flex w-40 flex-col gap-1.5">
                    <Label htmlFor="benchmark-symbol" className="text-xs text-muted-foreground">
                      Benchmark symbol
                    </Label>
                    <Input
                      id="benchmark-symbol"
                      value={benchmarkSymbol}
                      onChange={(e) => setBenchmarkSymbol(e.target.value)}
                      placeholder="SPY"
                    />
                  </div>
                  <Button
                    onClick={() => void runBenchmarkTests()}
                    disabled={!tradeMetrics || benchmarkRunning}
                  >
                    {benchmarkRunning ? 'Fetching bars…' : 'Run benchmark tests'}
                  </Button>
                  {!tradeMetrics && (
                    <span className="text-sm text-muted-foreground">
                      Upload trade data first.
                    </span>
                  )}
                </div>

                {benchmarkResults && (
                  <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
                    {benchmarkResults.map((result) => (
                      <article
                        key={result.id}
                        className="rounded-xl border border-border/80 bg-background/40 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-semibold leading-tight">
                              {result.name}
                            </h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {result.whatItChecks}
                            </p>
                          </div>
                          <StatusBadge status={result.status} />
                        </div>
                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                          {result.metrics.map((metric) => (
                            <div
                              key={metric.label}
                              className="rounded-lg border border-border/70 bg-card/60 p-3"
                            >
                              <div className="text-xs text-muted-foreground">
                                {metric.label}
                              </div>
                              <div
                                className={cn(
                                  'tabular mt-1 text-sm font-semibold',
                                  metric.tone
                                    ? statusClasses[metric.tone].split(' ').at(-1)
                                    : ''
                                )}
                              >
                                {metric.value}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 rounded-lg border border-border/70 bg-card/50 p-3 text-sm">
                          <div className="font-semibold">Conclusion</div>
                          <p className="mt-1 text-muted-foreground">{result.conclusion}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-border/80 bg-background/35 p-4">
                <h3 className="text-lg font-semibold">Roadmap for deeper invalidations</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  v1 stays intentionally trade-export-first. These are the next data
                  unlocks without pretending a TradingView trade list contains signals it
                  does not contain.
                </p>
                <Table className="mt-4">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Version</TableHead>
                      <TableHead>Feature</TableHead>
                      <TableHead>Why it matters</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">v1.1 / v2</TableCell>
                      <TableCell>OHLC price data import</TableCell>
                      <TableCell>
                        Enables random entry timing, random price paths, benchmark
                        overlays, and true path-dependent slippage tests.
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">v1.1</TableCell>
                      <TableCell>Multiple TradingView result files</TableCell>
                      <TableCell>
                        Already supported by upload. The lab now summarizes whether
                        multiple uploaded files agree or expose cherry-picking.
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">v3 option</TableCell>
                      <TableCell>TradingView Optimizer / browser automation</TableCell>
                      <TableCell>
                        Could drive parameter reruns and randomized settings later, but it
                        is heavier and should stay out of v1.
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">v3 option</TableCell>
                      <TableCell>Strategy signal export / Pine randomization</TableCell>
                      <TableCell>
                        Useful for true signal-shift tests, but unrealistic as a first
                        dependency for broad users.
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

export default StrategyInvalidationLab
