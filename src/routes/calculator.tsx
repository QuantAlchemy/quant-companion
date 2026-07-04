import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Calculator, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react'

import NumberField from '@/components/NumberField'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { currencyFormatter } from '@/lib/format'
import { award } from '@/lib/gamification'
import { calculatePosition } from '@/lib/positionSize'
import { cn } from '@/lib/utils'

import type { PositionSizeInput, PositionSizeResult } from '@/lib/positionSize'
import { seo } from '@/lib/seo'

export const Route = createFileRoute('/calculator')({
  head: () =>
    seo({
      title: 'Position Size Calculator · Quant Companion',
      description:
        'Size positions from the risk you accept — margin, leverage, and liquidation-buffer analysis for any asset.',
      path: '/calculator',
      keywords:
        'position size calculator, liquidation price calculator, risk management, leverage margin calculator',
    }),
  component: CalculatorPage,
})

const bufferStyles = {
  safe: 'border-profit/40 bg-profit/10 text-profit',
  moderate: 'border-amber-300/40 bg-amber-300/10 text-amber-100',
  risky: 'border-loss/40 bg-loss/10 text-loss',
} as const

const bufferIcons = {
  safe: ShieldCheck,
  moderate: ShieldQuestion,
  risky: ShieldAlert,
} as const

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-border/40 py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="tabular font-semibold">{value}</span>
    </div>
  )
}

function CalculatorPage() {
  const [form, setForm] = useState<PositionSizeInput>({
    accountSize: 10000,
    exchangeBalance: 5000,
    entryPrice: 0,
    stopLoss: 0,
    leverage: 1,
    maintenanceMarginPercent: 0.5,
    riskMode: 'percent',
    riskPercent: 1,
    riskDollar: 100,
  })
  const [result, setResult] = useState<PositionSizeResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const set = <TKey extends keyof PositionSizeInput>(key: TKey, value: PositionSizeInput[TKey]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleCalculate = () => {
    try {
      setError(null)
      setResult(calculatePosition(form))
      award('position-sized')
    } catch (e) {
      setResult(null)
      setError(e instanceof Error ? e.message : 'Calculation failed')
    }
  }

  const BufferIcon = result ? bufferIcons[result.bufferLevel] : ShieldQuestion

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8">
      <div className="rise-in mb-8 max-w-2xl">
        <p className="kicker">Risk before reward</p>
        <h1 className="font-display mt-2 text-3xl md:text-4xl">
          Position Size Calculator
        </h1>
        <p className="mt-2 text-muted-foreground">
          Size positions from the risk you accept — with margin, leverage, and
          liquidation analysis for any asset.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="panel">
          <CardHeader>
            <CardTitle>Setup</CardTitle>
          </CardHeader>
          <CardContent
            className="space-y-4"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCalculate()
            }}
          >
            <div className="grid grid-cols-2 gap-4">
              <NumberField
                label="Total account size ($)"
                min={0}
                value={form.accountSize}
                onValueChange={(v) => set('accountSize', v)}
              />
              <NumberField
                label="Exchange balance ($)"
                min={0}
                value={form.exchangeBalance}
                onValueChange={(v) => set('exchangeBalance', v)}
              />
            </div>

            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">Risk</span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={form.riskMode === 'percent' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => set('riskMode', 'percent')}
                >
                  % of account
                </Button>
                <Button
                  type="button"
                  variant={form.riskMode === 'dollar' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => set('riskMode', 'dollar')}
                >
                  Fixed $
                </Button>
              </div>
              {form.riskMode === 'percent' ? (
                <NumberField
                  label="Risk per trade (%)"
                  min={0}
                  step={0.1}
                  value={form.riskPercent}
                  onValueChange={(v) => set('riskPercent', v)}
                />
              ) : (
                <NumberField
                  label="Risk per trade ($)"
                  min={0}
                  value={form.riskDollar}
                  onValueChange={(v) => set('riskDollar', v)}
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <NumberField
                label="Entry price ($)"
                min={0}
                step={0.0001}
                value={form.entryPrice}
                onValueChange={(v) => set('entryPrice', v)}
              />
              <NumberField
                label="Stop loss ($)"
                min={0}
                step={0.0001}
                value={form.stopLoss}
                onValueChange={(v) => set('stopLoss', v)}
              />
              <NumberField
                label="Leverage (×)"
                min={1}
                value={form.leverage}
                onValueChange={(v) => set('leverage', v)}
              />
              <NumberField
                label="Maintenance margin (%)"
                min={0}
                step={0.1}
                value={form.maintenanceMarginPercent}
                onValueChange={(v) => set('maintenanceMarginPercent', v)}
              />
            </div>

            <Button className="w-full" size="lg" onClick={handleCalculate}>
              <Calculator className="mr-2 h-4 w-4" />
              Calculate position
            </Button>
            {error && <p className="text-sm text-destructive-foreground">{error}</p>}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {result ? (
            <>
              <Card className="panel rise-in">
                <CardHeader>
                  <CardTitle>
                    Position —{' '}
                    <span className={result.isLong ? 'text-profit' : 'text-loss'}>
                      {result.isLong ? 'Long' : 'Short'}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResultRow
                    label="Position size"
                    value={`${result.positionSize.toFixed(6)} units`}
                  />
                  <ResultRow
                    label="Risk per unit (R)"
                    value={currencyFormatter.format(result.rMultiple)}
                  />
                  <ResultRow
                    label="Total risk"
                    value={currencyFormatter.format(result.riskAmount)}
                  />
                  <ResultRow
                    label="Notional value"
                    value={currencyFormatter.format(result.notionalValue)}
                  />
                  <ResultRow
                    label="Initial margin"
                    value={currencyFormatter.format(result.initialMargin)}
                  />
                  <ResultRow
                    label="Maintenance margin"
                    value={currencyFormatter.format(result.maintenanceMarginAmount)}
                  />
                  <ResultRow
                    label="Liquidation price"
                    value={currencyFormatter.format(result.liquidationPrice)}
                  />
                  <ResultRow
                    label="Distance to liquidation"
                    value={`${currencyFormatter.format(result.liquidationDistance)} (${result.liquidationDistancePercent.toFixed(2)}%)`}
                  />
                </CardContent>
              </Card>

              <Card
                className={cn('panel rise-in border', bufferStyles[result.bufferLevel])}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BufferIcon className="h-5 w-5" />
                    {result.bufferStatus}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResultRow
                    label="Available buffer"
                    value={currencyFormatter.format(result.availableBuffer)}
                  />
                  <ResultRow
                    label="Buffer ratio"
                    value={`${result.bufferRatio.toFixed(2)}× (${result.bufferRatio >= 1 ? 'Buffer > Risk' : 'Buffer < Risk'})`}
                  />
                  <ResultRow
                    label="Max loss before liquidation"
                    value={currencyFormatter.format(result.maxLossBeforeLiquidation)}
                  />
                  <ul className="mt-3 space-y-1 text-sm">
                    {result.riskTips.map((tip) => (
                      <li key={tip}>• {tip}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="panel flex h-full min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
              <Calculator className="h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground">
                Enter your setup and calculate to see position size, margin, and
                liquidation analysis.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
