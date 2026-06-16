import { For, createMemo, createSignal } from 'solid-js'
import { ChevronDown } from 'lucide-solid'
import { NumberInput } from '@/components/ui/NumberInput'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { calculateInvalidationReport } from '@/libs/invalidation'
import { tradeData, tradeMetrics } from '@/libs/stats'
import { cn } from '@/libs/utils'

import type { Component } from 'solid-js'
import type { InvalidationStatus } from '@/libs/invalidation'

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
  cn('inline-flex rounded-full border px-2 py-1 text-xs font-semibold', statusClasses[status])

const StatusBadge: Component<{ status: InvalidationStatus }> = (props) => (
  <span class={badgeClasses(props.status)}>{statusLabel[props.status]}</span>
)

const SummaryStat: Component<{
  label: string
  value: number
  class?: string
}> = (props) => (
  <div class={cn('rounded-lg border px-3 py-2 text-center', props.class)}>
    <div class="text-xl font-bold tabular-nums">{props.value}</div>
    <div class="text-xs text-muted-foreground">{props.label}</div>
  </div>
)

export const StrategyInvalidationLab: Component = () => {
  const [isExpanded, setIsExpanded] = createSignal(false)
  const [trials, setTrials] = createSignal(500)
  const [feePerTrade, setFeePerTrade] = createSignal(2.5)
  const [rollingWindow, setRollingWindow] = createSignal(20)

  const report = createMemo(() =>
    calculateInvalidationReport(tradeData(), tradeMetrics(), {
      feePerTrade: feePerTrade(),
      rollingWindow: rollingWindow(),
      trials: trials(),
    })
  )

  return (
    <Card
      id="strategy-invalidation-lab"
      class="overflow-hidden border-primary/35 bg-card/95 2xl:col-span-2"
    >
      <Collapsible
        open={isExpanded()}
        onOpenChange={setIsExpanded}
      >
        <CardHeader class="space-y-4">
          <div class="max-w-3xl space-y-2">
            <div class="inline-flex rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-primary-foreground">
              Strategy Invalidation v1
            </div>
            <CardTitle class="text-2xl">Invalidation Lab</CardTitle>
            <CardDescription>
              TradingView-export-first tests that attack the trade list you already uploaded. These
              do not prove a strategy is good; they try to prove it is not obviously fake, fragile,
              overfit, or outlier-driven.
            </CardDescription>
            <div class="flex flex-wrap gap-2 text-sm">
              <a
                class="rounded-full border border-border px-3 py-1 text-foreground underline-offset-4 hover:underline"
                href="/strategy-invalidation-playbook.html"
                target="_blank"
                rel="noreferrer"
              >
                Open Strategy Invalidation Playbook
              </a>
              <a
                class="rounded-full border border-border px-3 py-1 text-foreground underline-offset-4 hover:underline"
                href="/strategy-invalidation-playbook.md"
                target="_blank"
                rel="noreferrer"
              >
                Full test documentation
              </a>
            </div>
          </div>

          <CollapsibleTrigger
            aria-controls="strategy-invalidation-lab-content"
            class={cn(
              'flex w-full flex-col gap-4 rounded-xl border border-border/80 bg-background/35 p-4 text-left transition-colors',
              'hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
          >
            <div class="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
              <SummaryStat
                label="tests"
                value={report().summary.totalTests}
              />
              <SummaryStat
                label="pass"
                value={report().summary.passCount}
                class="border-emerald-400/30 bg-emerald-400/10"
              />
              <SummaryStat
                label="watch"
                value={report().summary.watchCount}
                class="border-amber-300/30 bg-amber-300/10"
              />
              <SummaryStat
                label="invalidate"
                value={report().summary.invalidateCount}
                class="border-red-400/30 bg-red-400/10"
              />
            </div>

            <div class="flex w-full items-center justify-between gap-3 border-t border-border/60 pt-3 text-sm">
              <span class="text-muted-foreground">
                {isExpanded()
                  ? 'Hide detailed invalidation results'
                  : 'Show detailed invalidation results'}
              </span>
              <span class="inline-flex items-center gap-2 font-medium text-foreground">
                {isExpanded() ? 'Hide lab' : 'Show lab'}
                <ChevronDown
                  class={cn(
                    'h-4 w-4 shrink-0 transition-transform duration-200',
                    isExpanded() ? 'rotate-180' : ''
                  )}
                />
              </span>
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent id="strategy-invalidation-lab-content">
          <div class="space-y-4 border-t border-border/50 px-6 pb-6">
            <div class="grid gap-3 rounded-xl border border-border/80 bg-background/35 p-4 md:grid-cols-3">
              <NumberInput
                id="invalidationTrials"
                label="Random trials"
                class="w-28"
                min={50}
                max={5000}
                value={trials}
                onInput={setTrials}
              />
              <NumberInput
                id="invalidationFeePerTrade"
                label="Fee / trade"
                class="w-28"
                min={0}
                value={feePerTrade}
                onInput={setFeePerTrade}
              />
              <NumberInput
                id="invalidationRollingWindow"
                label="Rolling window"
                class="w-28"
                min={5}
                value={rollingWindow}
                onInput={setRollingWindow}
              />
            </div>

            <CardContent class="space-y-4 p-0">
              <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <For each={report().results}>
                  {(result) => (
                    <article class="rounded-xl border border-border/80 bg-background/40 p-4">
                      <div class="flex items-start justify-between gap-3">
                        <div>
                          <h3 class="text-lg font-semibold leading-tight">{result.name}</h3>
                          <p class="mt-1 text-sm text-muted-foreground">{result.whatItChecks}</p>
                        </div>
                        <StatusBadge status={result.status} />
                      </div>

                      <div class="mt-4 grid gap-2 sm:grid-cols-3">
                        <For each={result.metrics}>
                          {(metric) => (
                            <div class="rounded-lg border border-border/70 bg-card/60 p-3">
                              <div class="text-xs text-muted-foreground">{metric.label}</div>
                              <div
                                class={cn(
                                  'mt-1 text-sm font-semibold',
                                  metric.tone ? statusClasses[metric.tone].split(' ').at(-1) : ''
                                )}
                              >
                                {metric.value}
                              </div>
                            </div>
                          )}
                        </For>
                      </div>

                      <div class="mt-4 rounded-lg border border-border/70 bg-card/50 p-3 text-sm">
                        <div class="font-semibold">Conclusion</div>
                        <p class="mt-1 text-muted-foreground">{result.conclusion}</p>
                      </div>
                    </article>
                  )}
                </For>
              </div>

              <div class="rounded-xl border border-border/80 bg-background/35 p-4">
                <h3 class="text-lg font-semibold">Roadmap for deeper invalidations</h3>
                <p class="mt-1 text-sm text-muted-foreground">
                  v1 stays intentionally trade-export-first. These are the next data unlocks without
                  pretending a TradingView trade list contains signals it does not contain.
                </p>
                <Table class="mt-4">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Version</TableHead>
                      <TableHead>Feature</TableHead>
                      <TableHead>Why it matters</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell class="font-medium">v1.1 / v2</TableCell>
                      <TableCell>OHLC price data import</TableCell>
                      <TableCell>
                        Enables random entry timing, random price paths, benchmark overlays, and
                        true path-dependent slippage tests.
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell class="font-medium">v1.1</TableCell>
                      <TableCell>Multiple TradingView result files</TableCell>
                      <TableCell>
                        Already supported by upload. The lab now summarizes whether multiple
                        uploaded files agree or expose cherry-picking.
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell class="font-medium">v3 option</TableCell>
                      <TableCell>TradingView Optimizer / browser automation</TableCell>
                      <TableCell>
                        Could drive parameter reruns and randomized settings later, but it is
                        heavier and should stay out of v1.
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell class="font-medium">v3 option</TableCell>
                      <TableCell>Strategy signal export / Pine randomization</TableCell>
                      <TableCell>
                        Useful for true signal-shift tests, but unrealistic as a first dependency
                        for broad users.
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
