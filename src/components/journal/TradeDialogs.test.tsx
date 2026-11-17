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

it('fills risk from the stop on a new trade and keeps it in step', () => {
  render(<TradeFormDialog open onSave={vi.fn()} onOpenChange={vi.fn()} />)
  const field = (label: string) =>
    screen.getByLabelText<HTMLInputElement>(label)
  fireEvent.change(field('Quantity'), { target: { value: '10' } })
  fireEvent.change(field('Entry price'), { target: { value: '100' } })
  fireEvent.change(field('Stop loss (optional)'), { target: { value: '95' } })
  const risk = field('Initial risk in dollars (optional)')
  expect(risk.value).toBe('50')
  fireEvent.change(field('Quantity'), { target: { value: '100' } })
  expect(risk.value).toBe('500')
  fireEvent.change(field('Stop loss (optional)'), { target: { value: '100' } })
  expect(risk.value).toBe('')
})

it('leaves a saved trade without risk alone when its stop moves', () => {
  render(
    <TradeFormDialog
      open
      trade={{ ...trade, initialRisk: undefined }}
      onSave={vi.fn()}
      onOpenChange={vi.fn()}
    />,
  )
  fireEvent.change(screen.getByLabelText('Stop loss (optional)'), {
    target: { value: '110' },
  })
  expect(
    screen.getByLabelText<HTMLInputElement>(
      'Initial risk in dollars (optional)',
    ).value,
  ).toBe('')
})
