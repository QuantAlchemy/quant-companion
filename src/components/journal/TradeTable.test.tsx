/** @vitest-environment jsdom */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import TradeTable, {
  TradeTableColumnPicker,
  useTradeTableColumnVisibility,
} from '@/components/journal/TradeTable'

import type { JournalTrade } from '@/lib/journal'

const storageKey = 'quant-companion:trade-log-columns:v1'

const trade: JournalTrade = {
  id: 'trade-1',
  assetName: 'STRC',
  assetType: 'traditional',
  quantity: 202,
  price: 100.01,
  tradeType: 'buy',
  tradeDate: '2025-11-10',
  status: 'open',
  commission: 1,
  exchange: 'Fidelity',
  comments: 'Long-term allocation',
  createdAt: 1,
}

function TradeTableHarness() {
  const [columnVisibility, setColumnVisibility] =
    useTradeTableColumnVisibility()

  return (
    <>
      <TradeTableColumnPicker
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
      />
      <button
        type="button"
        onClick={() =>
          setColumnVisibility((current) => ({
            ...current,
            exchange: false,
            commission: true,
            closingDate: true,
            comments: true,
          }))
        }
      >
        Change columns
      </button>
      <TradeTable
        trades={[trade]}
        prices={{ STRC: 96.16 }}
        rowSelection={{}}
        onRowSelectionChange={vi.fn()}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
        onClose={vi.fn()}
        onSplit={vi.fn()}
        onEdit={vi.fn()}
      />
    </>
  )
}

describe('TradeTable column visibility', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(cleanup)

  it('shows Exchange and hides less-used optional fields by default', () => {
    render(<TradeTableHarness />)

    expect(screen.getByRole('columnheader', { name: /Exchange/ })).toBeTruthy()
    expect(screen.getByText('Fidelity')).toBeTruthy()
    expect(
      screen.queryByRole('columnheader', { name: /Commission/ }),
    ).toBeNull()
    expect(screen.queryByRole('columnheader', { name: /Notes/ })).toBeNull()
  })

  it('restores a saved column selection', async () => {
    const firstRender = render(<TradeTableHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'Change columns' }))

    await waitFor(() => {
      expect(
        screen.getByRole('columnheader', { name: /Commission/ }),
      ).toBeTruthy()
      expect(
        screen.queryByRole('columnheader', { name: /Exchange/ }),
      ).toBeNull()
      expect(
        screen.getByRole('columnheader', { name: /Close date/ }),
      ).toBeTruthy()
      expect(screen.getByRole('columnheader', { name: /Notes/ })).toBeTruthy()
      expect(
        JSON.parse(window.localStorage.getItem(storageKey) ?? '{}'),
      ).toEqual(
        expect.objectContaining({
          exchange: false,
          commission: true,
          closingDate: true,
          comments: true,
        }),
      )
    })

    firstRender.unmount()
    render(<TradeTableHarness />)

    await waitFor(() => {
      expect(
        screen.getByRole('columnheader', { name: /Commission/ }),
      ).toBeTruthy()
      expect(
        screen.queryByRole('columnheader', { name: /Exchange/ }),
      ).toBeNull()
      expect(
        screen.getByRole('columnheader', { name: /Close date/ }),
      ).toBeTruthy()
      expect(screen.getByRole('columnheader', { name: /Notes/ })).toBeTruthy()
    })
  })

  it('changes columns from the picker', async () => {
    render(<TradeTableHarness />)
    fireEvent.click(screen.getByRole('button', { name: /Columns/ }))

    expect(await screen.findByText('Visible columns')).toBeTruthy()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Commission' }))

    expect(
      screen.getByRole('columnheader', { name: /Commission/ }),
    ).toBeTruthy()
  })
})
