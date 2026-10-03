/** @vitest-environment jsdom */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import Papa from 'papaparse'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as XLSX from 'xlsx'

import FileUpload from './FileUpload'
import {
  currentHeaderConfigStore,
  defaultHeaderConfig,
  tradingViewExportHeaderConfig,
} from '@/lib/headerMappings'
import {
  calculateSummaryStats,
  originalTradeDataStore,
  processTradeMetrics,
  processTradingViewData,
  selectedTradeFileStore,
  setOriginalTradeData,
  setSelectedTradeFile,
  setTradeTrim,
  tradeDataStore,
  tradeMetricsStore,
  tradeTrimStore,
} from '@/lib/stats'
import type { HeaderConfig } from '@/lib/headerMappings'
import type { TradingViewRecord } from '@/lib/stats'

vi.mock('@/lib/gamification', () => ({ award: vi.fn() }))

const row = (id: number, type: string, date: string): TradingViewRecord => ({
  'Trade #': id,
  Type: type,
  Signal: type,
  'Date/Time': date,
  Price: 100,
  Contracts: 1,
  Profit: id === 2 ? -5 : 10,
  'Profit %': id === 2 ? -5 : 10,
  'Cumulative profit': id === 2 ? 5 : 10,
  'Cumulative profit %': id === 2 ? 5 : 10,
  'Run-up': 12,
  'Run-up %': 12,
  Drawdown: -6,
  'Drawdown %': -6,
})

const closedRows = [
  row(1, 'Entry long', '2026-01-01 09:30:15.250'),
  row(1, 'Exit long', '2026-01-01 10:45:30.500'),
  row(2, 'Entry short', '2026-01-02 11:00:00.000'),
  row(2, 'Exit short', '2026-01-02 12:15:00.000'),
]
const mixedRows = [...closedRows, row(3, 'Entry long', '2026-01-03 09:00:00')]

function exportRows(
  rows: TradingViewRecord[],
  config: HeaderConfig,
  excel = false,
  date1904 = false,
) {
  return rows.map((record) =>
    Object.fromEntries(
      config.mappings.map((mapping) => {
        let value = record[mapping.targetHeader]
        if (excel && mapping.targetHeader === 'Date/Time') {
          value =
            Date.parse(`${value}Z`) / 86400000 + (date1904 ? 24107 : 25569)
        }
        return [mapping.sourceHeader, value]
      }),
    ),
  )
}

function csvFile(
  rows = mixedRows,
  name = 'trades.csv',
  config = tradingViewExportHeaderConfig,
) {
  return new File([Papa.unparse(exportRows(rows, config))], name, {
    type: 'text/csv',
  })
}

function xlsxFile(config: HeaderConfig, date1904 = false) {
  const workbook = XLSX.utils.book_new()
  workbook.Workbook = { WBProps: { date1904 } }
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(exportRows(mixedRows, config, true, date1904)),
    'List of trades',
  )
  const buffer = XLSX.write(workbook, {
    type: 'array',
    bookType: 'xlsx',
  }) as ArrayBuffer
  const file = new File([buffer], 'trades.xlsx')
  // jsdom's File lacks arrayBuffer; the workbook bytes still use the real XLSX reader.
  Object.defineProperty(file, 'arrayBuffer', { value: async () => buffer })
  return file
}

function upload(container: HTMLElement, files: File[]) {
  const input = container.querySelector('input')!
  fireEvent.change(input, { target: { files } })
}

beforeEach(() => {
  currentHeaderConfigStore.setState(() => tradingViewExportHeaderConfig)
  setOriginalTradeData(null)
  tradeMetricsStore.setState(() => null)
})
afterEach(cleanup)

describe('trade pairing', () => {
  it('imports two complete trades, reports the open trade, and ignores row order', () => {
    const result = processTradingViewData('trades.csv', mixedRows)
    expect(result.trades).toHaveLength(2)
    expect(result.excludedOpenTrades).toEqual([3])
    // Group order is not meaningful until the upload sorts by exit date.
    const reversed = processTradingViewData(
      'trades.csv',
      [...mixedRows].reverse(),
    )
    expect(
      reversed.trades.sort((a, b) => a.tradeNoOrig - b.tradeNoOrig),
    ).toEqual(result.trades)
    expect(reversed.excludedOpenTrades).toEqual([3])
  })

  it.each([
    ['missing entry', [closedRows[1]]],
    ['duplicate entry', [closedRows[0], closedRows[0], closedRows[1]]],
    ['duplicate exit', [closedRows[0], closedRows[1], closedRows[1]]],
    ['unknown type', [closedRows[0], { ...closedRows[1], Type: 'Other' }]],
    [
      'invalid date',
      [closedRows[0], { ...closedRows[1], 'Date/Time': 'invalid' }],
    ],
    ['numeric date', [closedRows[0], { ...closedRows[1], 'Date/Time': 46023 }]],
    [
      'exit before entry',
      [closedRows[0], { ...closedRows[1], 'Date/Time': '2025-01-01' }],
    ],
    [
      'invalid profit',
      [closedRows[0], { ...closedRows[1], Profit: 'invalid' }],
    ],
    ['blank profit', [closedRows[0], { ...closedRows[1], Profit: '' }]],
  ])('identifies the trade with %s', (_name, rows) => {
    expect(() => processTradingViewData('broken.csv', rows)).toThrow(
      /broken.csv - trade 1:/,
    )
  })
})

describe('file uploads', () => {
  it('imports complete CSV trades and reports the excluded open trade', async () => {
    const { container } = render(<FileUpload />)
    upload(container, [csvFile()])
    expect((await screen.findByRole('status')).textContent).toBe(
      'Excluded 1 open trade without an Exit row.',
    )
    expect(originalTradeDataStore.state).toHaveLength(2)
    expect(originalTradeDataStore.state?.map((trade) => trade.tradeNo)).toEqual(
      [1, 2],
    )
  })

  const customConfig: HeaderConfig = {
    name: 'Custom',
    mappings: tradingViewExportHeaderConfig.mappings.map((mapping) =>
      mapping.targetHeader === 'Date/Time'
        ? {
            ...mapping,
            sourceHeader: 'Executed at',
            alternatives: ['Timestamp'],
          }
        : mapping,
    ),
  }

  it.each([defaultHeaderConfig, tradingViewExportHeaderConfig, customConfig])(
    'matches CSV dates and performance for $name numeric XLSX dates',
    async (config) => {
      currentHeaderConfigStore.setState(() => config)
      const { container } = render(<FileUpload />)
      upload(container, [csvFile(mixedRows, 'trades.csv', config)])
      await screen.findByRole('status')
      const csvTrades = originalTradeDataStore.state!
      const csvMetrics = processTradeMetrics(csvTrades)
      upload(container, [xlsxFile(config)])
      await waitFor(() =>
        expect(originalTradeDataStore.state?.[0].filename).toBe('trades.xlsx'),
      )
      const excelTrades = originalTradeDataStore.state!
      expect(
        excelTrades.map(({ filename: _filename, ...trade }) => trade),
      ).toEqual(csvTrades.map(({ filename: _filename, ...trade }) => trade))
      expect(excelTrades[0].entryDate).toEqual(
        new Date(2026, 0, 1, 9, 30, 15, 250),
      )
      expect(excelTrades[0].exitDate).toEqual(
        new Date(2026, 0, 1, 10, 45, 30, 500),
      )
      expect(processTradeMetrics(excelTrades)).toEqual(csvMetrics)
      expect(calculateSummaryStats(processTradeMetrics(excelTrades))).toEqual(
        calculateSummaryStats(csvMetrics),
      )
    },
  )

  it('converts an alternative custom date header with the 1904 date system', async () => {
    currentHeaderConfigStore.setState(() => customConfig)
    const sourceConfig = {
      ...customConfig,
      mappings: customConfig.mappings.map((mapping) =>
        mapping.targetHeader === 'Date/Time'
          ? { ...mapping, sourceHeader: 'Timestamp' }
          : mapping,
      ),
    }
    const { container } = render(<FileUpload />)
    upload(container, [xlsxFile(sourceConfig, true)])
    await screen.findByRole('status')
    expect(originalTradeDataStore.state?.[0].entryDate).toEqual(
      new Date(2026, 0, 1, 9, 30, 15, 250),
    )
  })

  it.each(['malformed', 'open only', 'empty', 'wrong headers'] as const)(
    'preserves the previous dataset, view, and metrics after a %s replacement',
    async (failure) => {
      const { container } = render(<FileUpload />)
      upload(container, [csvFile()])
      await screen.findByRole('status')
      setSelectedTradeFile('trades.csv')
      setTradeTrim(1, 0)
      const original = originalTradeDataStore.state
      const view = tradeDataStore.state
      const metrics = processTradeMetrics(original!)
      tradeMetricsStore.setState(() => metrics)
      const failedFiles =
        failure === 'malformed'
          ? [
              csvFile(closedRows, 'valid.csv'),
              csvFile([closedRows[1]], 'broken.csv'),
            ]
          : failure === 'open only'
            ? [csvFile([mixedRows[4]])]
            : failure === 'empty'
              ? [csvFile([])]
              : [new File(['wrong,headers\n1,2'], 'wrong.csv')]
      upload(container, failedFiles)
      const alert = await screen.findByRole('alert')
      if (failure === 'malformed')
        expect(alert.textContent).toContain(
          'broken.csv - trade 1: Expected one Entry row and one Exit row.',
        )
      if (failure === 'open only')
        expect(alert.textContent).toContain(
          'No completed trades found. Excluded 1 open trade',
        )
      expect(originalTradeDataStore.state).toBe(original)
      expect(tradeDataStore.state).toBe(view)
      expect(tradeMetricsStore.state).toBe(metrics)
      expect(selectedTradeFileStore.state).toBe('trades.csv')
      expect(tradeTrimStore.state).toEqual({ topCount: 1, bottomCount: 0 })
      expect(container.querySelector('input')!.value).toBe('')
    },
  )
})
