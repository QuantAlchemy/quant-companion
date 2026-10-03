/** @vitest-environment jsdom */

import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { JournalStats } from './JournalStats'
import TradeTable from './TradeTable'
import type { JournalTrade } from '@/lib/journal'
import type { PlotParams } from 'react-plotly.js'

vi.mock('@/components/Plot', () => ({
  default: ({ data }: PlotParams) => (
    <div data-testid="plot">{JSON.stringify(data)}</div>
  ),
}))

const trade: JournalTrade = {
  id: 'recorded-risk',
  createdAt: 1,
  assetName: 'TEST',
  assetType: 'traditional',
  quantity: 10,
  price: 100,
  tradeType: 'buy',
  tradeDate: '2026-10-01',
  status: 'closed',
  closingPrice: 120,
  closingDate: '2026-10-02',
  realizedPnl: 200,
  initialRisk: 100,
}

const rTrace = () => {
  const plots = screen.getAllByTestId('plot').map(
    (plot) =>
      JSON.parse(plot.textContent) as Array<{
        name: string
        y: Array<number | null>
      }>,
  )
  return plots.flat().find((trace) => trace.name === 'R-Multiple')
}

afterEach(cleanup)

describe('recorded R-multiples', () => {
  it('displays 2R for $200 profit on $100 risk and excludes missing risk', () => {
    render(
      <JournalStats
        trades={[
          trade,
          { ...trade, id: 'legacy', initialRisk: undefined, realizedPnl: 900 },
        ]}
        prices={{}}
      />,
    )
    expect(screen.getByText('2.00R')).toBeTruthy()
    expect(rTrace()?.y).toEqual([2, null])
    expect(screen.getByText(/R unavailable without recorded risk/)).toBeTruthy()
  })

  it.each([undefined, 0, -1, Infinity])(
    'shows unavailable instead of zero for missing or invalid risk %s',
    (initialRisk) => {
      render(<JournalStats trades={[{ ...trade, initialRisk }]} prices={{}} />)
      expect(screen.getByText('Unavailable')).toBeTruthy()
      expect(rTrace()?.y).toEqual([null])
    },
  )

  it('averages wins, losses and breakeven trades with recorded risk', () => {
    render(
      <JournalStats
        trades={[
          trade,
          { ...trade, id: 'loss', realizedPnl: -50 },
          { ...trade, id: 'flat', realizedPnl: 0 },
        ]}
        prices={{}}
      />,
    )
    expect(screen.getByText('0.50R')).toBeTruthy()
    expect(rTrace()?.y).toEqual([2, -0.5, 0])
  })
})

const closedTrade: JournalTrade = {
  id: 'closed',
  createdAt: 1,
  assetName: 'TEST',
  assetType: 'traditional',
  quantity: 10,
  price: 100,
  tradeType: 'buy',
  tradeDate: '2026-09-01',
  status: 'closed',
  closingPrice: 101,
  closingDate: '2026-09-02',
  realizedPnl: 10,
  commission: 20,
}

function Journal({ trade }: { trade: JournalTrade }) {
  return (
    <>
      <TradeTable
        trades={[trade]}
        prices={{}}
        rowSelection={{}}
        onRowSelectionChange={vi.fn()}
        columnVisibility={{}}
        onColumnVisibilityChange={vi.fn()}
        onClose={vi.fn()}
        onSplit={vi.fn()}
        onEdit={vi.fn()}
      />
      <JournalStats trades={[trade]} prices={{}} />
    </>
  )
}

it('shows net losses in the row, expectancy, win rate, and charts after corrections', () => {
  const { rerender } = render(<Journal trade={closedTrade} />)
  const checkResult = (netPnl: number) => {
    expect(screen.getByRole('columnheader', { name: /Net P&L/ })).toBeTruthy()
    const rowPnl = screen.getByTitle(/Gross P&L:/)
    expect(rowPnl.textContent).toBe(`-$${Math.abs(netPnl).toFixed(2)}`)
    expect(rowPnl.className).toContain('text-loss')
    expect(rowPnl.closest('tr')?.className).toContain('border-l-loss')
    expect(screen.getByText('0W / 1L')).toBeTruthy()
    const expectancy = screen.getByText('Expectancy').parentElement!
    expect(
      within(expectancy).getByText(`-$${Math.abs(netPnl).toFixed(2)}`),
    ).toBeTruthy()
    const plots = screen
      .getAllByTestId('plot')
      .map(
        (plot) =>
          JSON.parse(plot.textContent) as Array<{
            name: string
            y?: number[]
            values?: number[]
          }>,
      )
    expect(plots.flat()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Realized net P&L', y: [netPnl] }),
        expect.objectContaining({ name: 'Monthly net P&L', y: [netPnl] }),
        expect.objectContaining({ values: [0, 1] }),
      ]),
    )
  }
  checkResult(-10)
  rerender(<Journal trade={{ ...closedTrade, price: 102, realizedPnl: -10 }} />)
  checkResult(-30)
  rerender(<Journal trade={{ ...closedTrade, quantity: 4, realizedPnl: 4 }} />)
  checkResult(-16)
  rerender(
    <Journal trade={{ ...closedTrade, tradeType: 'sell', realizedPnl: -10 }} />,
  )
  checkResult(-30)
})
