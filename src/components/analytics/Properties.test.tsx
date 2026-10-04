/** @vitest-environment jsdom */

import { useStore } from '@tanstack/react-store'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Properties from '@/components/analytics/Properties'
import TradeDataStats from '@/components/analytics/TradeDataStats'
import {
  setOriginalTradeData,
  simulateTradeData,
  tradeDataStore,
  tradeMetricsStore,
} from '@/lib/stats'

// File parsing and header configuration are outside the trim and summary flow.
vi.mock('@/components/analytics/FileUpload', () => ({ default: () => null }))
vi.mock('@/components/analytics/HeaderConfigManager', () => ({
  default: () => null,
}))

function AnalyticsHarness() {
  const metrics = useStore(tradeMetricsStore)
  return (
    <>
      <Properties />
      <TradeDataStats data={metrics} />
    </>
  )
}

function loadTrades(profits: number[], sameTime = false) {
  const records = simulateTradeData()
    .slice(0, profits.length)
    .map((trade, i) => ({
      ...trade,
      filename: i < 2 ? 'a.csv' : 'b.csv',
      exitProfit: profits[i],
      exitDate: new Date(Date.UTC(2026, 0, sameTime ? 1 : i + 1)),
    }))
  setOriginalTradeData(records)
}

afterEach(() => {
  cleanup()
  setOriginalTradeData(null)
  tradeMetricsStore.setState(() => null)
})

describe('analytics trim and summary', () => {
  it('trims two trades to zero and restores the original results through the controls', () => {
    loadTrades([100, -40])
    render(<AnalyticsHarness />)
    const originalSummary = screen.getByRole('table').textContent
    const best = screen.getByRole('spinbutton', { name: 'Remove Best Trades' })
    const worst = screen.getByRole('spinbutton', {
      name: 'Remove Worst Trades',
    })
    expect(best.getAttribute('max')).toBe('2')
    fireEvent.change(best, { target: { value: '1' } })
    fireEvent.change(worst, { target: { value: '1' } })
    expect(tradeDataStore.state).toEqual([])
    expect(tradeMetricsStore.state).toBeNull()
    expect(screen.getByText(/No trades to analyze/)).toBeTruthy()
    expect(screen.getByRole('spinbutton', { name: 'Remove Best Trades' })).toBe(
      best,
    )
    fireEvent.change(best, { target: { value: '0' } })
    fireEvent.change(worst, { target: { value: '0' } })
    expect(tradeDataStore.state).toHaveLength(2)
    expect(screen.getByRole('table').textContent).toBe(originalSummary)
    fireEvent.change(best, { target: { value: '999' } })
    expect((best as HTMLInputElement).value).toBe('2')
    fireEvent.change(best, { target: { value: '0' } })
    expect(screen.getByRole('table').textContent).toBe(originalSummary)
  })

  it('preserves requested trimming when switching to a smaller file and back', async () => {
    loadTrades([100, 90, 80, -40])
    render(<AnalyticsHarness />)
    const best = screen.getByRole('spinbutton', { name: 'Remove Best Trades' })
    fireEvent.change(best, { target: { value: '3' } })
    const originalSummary = screen.getByRole('table').textContent
    fireEvent.click(screen.getByRole('combobox'))
    const smallerFile = await screen.findByRole('option', { name: 'a.csv' })
    fireEvent.pointerDown(smallerFile)
    fireEvent.click(smallerFile)
    expect(screen.getByText(/No trades to analyze/)).toBeTruthy()
    expect((best as HTMLInputElement).value).toBe('3')
    fireEvent.click(screen.getByRole('combobox'))
    const allFiles = await screen.findByRole('option', { name: 'All Files' })
    fireEvent.pointerDown(allFiles)
    fireEvent.click(allFiles)
    expect((best as HTMLInputElement).value).toBe('3')
    expect(screen.getByRole('table').textContent).toBe(originalSummary)
  })

  it.each([[100], [-40], [0], [100, -40, 20]])(
    'renders finite labels and unavailable ratios for %j',
    (...profits) => {
      loadTrades(profits, true)
      render(<AnalyticsHarness />)
      const table = screen.getByRole('table')
      expect(table.textContent).not.toMatch(/NaN|Infinity|Invalid Date/)
      const sharpeRow = screen
        .getByText('Sharpe Ratio (realized equity)')
        .closest('tr')!
      expect(within(sharpeRow).getByText('Unavailable')).toBeTruthy()
      expect(
        tradeMetricsStore.state!.dates.every((date) =>
          Number.isFinite(date.getTime()),
        ),
      ).toBe(true)
    },
  )
})
