/** @vitest-environment jsdom */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

import { TradeFormDialog } from './TradeDialogs'
import type { JournalTrade } from '@/lib/journal'

const trade: JournalTrade = {
  id: 'risk',
  createdAt: 1,
  assetName: 'TEST',
  assetType: 'traditional',
  quantity: 10,
  price: 100,
  tradeType: 'buy',
  tradeDate: '2026-10-01',
  status: 'open',
  initialRisk: 100,
}

afterEach(cleanup)

it('loads recorded risk and lets users change or clear it', async () => {
  const onSave = vi.fn().mockResolvedValue(undefined)
  render(
    <TradeFormDialog
      open
      trade={trade}
      onSave={onSave}
      onOpenChange={vi.fn()}
    />,
  )
  const risk = screen.getByLabelText<HTMLInputElement>(
    'Initial risk in dollars (optional)',
  )
  expect(risk.value).toBe('100')
  fireEvent.change(risk, { target: { value: '150' } })
  fireEvent.click(
    screen.getByRole<HTMLButtonElement>('button', { name: 'Save changes' }),
  )
  await waitFor(() =>
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ initialRisk: 150 }),
    ),
  )
  await waitFor(() =>
    expect(
      screen.getByRole<HTMLButtonElement>('button', {
        name: 'Save changes',
      }).disabled,
    ).toBe(false),
  )
  fireEvent.change(risk, { target: { value: '' } })
  fireEvent.click(
    screen.getByRole<HTMLButtonElement>('button', { name: 'Save changes' }),
  )
  await waitFor(() =>
    expect(onSave).toHaveBeenLastCalledWith(
      expect.objectContaining({ initialRisk: undefined }),
    ),
  )
})
