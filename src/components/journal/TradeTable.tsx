import { Popover } from '@base-ui/react/popover'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Columns3,
  MessageSquareText,
  X,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { currencyFormatter } from '@/lib/format'
import { netJournalPnl } from '@/lib/journal'
import { unrealizedPnl } from '@/lib/performance'
import { cn } from '@/lib/utils'

import type {
  Column,
  ColumnDef,
  OnChangeFn,
  PaginationState,
  RowSelectionState,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table'
import type { JournalTrade } from '@/lib/journal'

export interface TradeRowActions {
  onClose: (trade: JournalTrade) => void
  onSplit: (trade: JournalTrade) => void
  onEdit: (trade: JournalTrade) => void
}

interface TradeTableProps extends TradeRowActions {
  trades: JournalTrade[]
  /** live market prices keyed by upper-cased symbol */
  prices: Record<string, number>
  rowSelection: RowSelectionState
  onRowSelectionChange: (
    updater:
      RowSelectionState | ((old: RowSelectionState) => RowSelectionState),
  ) => void
  columnVisibility: VisibilityState
  onColumnVisibilityChange: OnChangeFn<VisibilityState>
}

const TRADE_COLUMN_VISIBILITY_KEY = 'quant-companion:trade-log-columns:v1'

const tradeColumnOptions = [
  { id: 'assetName', label: 'Asset', group: 'core', locked: true },
  { id: 'tradeType', label: 'Side', group: 'core' },
  { id: 'quantity', label: 'Quantity', group: 'core' },
  { id: 'price', label: 'Entry price', group: 'core' },
  { id: 'tradeDate', label: 'Date', group: 'core' },
  { id: 'status', label: 'Status', group: 'core' },
  { id: 'marketPrice', label: 'Market price', group: 'core' },
  { id: 'pnl', label: 'Net P&L', group: 'core' },
  { id: 'exchange', label: 'Exchange', group: 'optional' },
  { id: 'commission', label: 'Commission', group: 'optional' },
  { id: 'closingDate', label: 'Close date', group: 'optional' },
  { id: 'comments', label: 'Notes', group: 'optional' },
] as const

const defaultColumnVisibility: VisibilityState = {
  assetName: true,
  tradeType: true,
  quantity: true,
  price: true,
  tradeDate: true,
  status: true,
  marketPrice: true,
  pnl: true,
  exchange: true,
  commission: false,
  closingDate: false,
  comments: false,
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const readSavedColumnVisibility = (): VisibilityState => {
  try {
    const stored = window.localStorage.getItem(TRADE_COLUMN_VISIBILITY_KEY)
    if (!stored) return defaultColumnVisibility

    const parsed: unknown = JSON.parse(stored)
    if (!isRecord(parsed)) return defaultColumnVisibility

    const visibility = { ...defaultColumnVisibility }
    for (const option of tradeColumnOptions) {
      const savedValue = parsed[option.id]
      if (!('locked' in option) && typeof savedValue === 'boolean') {
        visibility[option.id] = savedValue
      }
    }
    return visibility
  } catch {
    return defaultColumnVisibility
  }
}

/** Keep each browser's Trade Log layout stable across visits. */
export function useTradeTableColumnVisibility() {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    defaultColumnVisibility,
  )
  const [preferencesLoaded, setPreferencesLoaded] = useState(false)

  useEffect(() => {
    setColumnVisibility(readSavedColumnVisibility())
    setPreferencesLoaded(true)
  }, [])

  useEffect(() => {
    if (!preferencesLoaded) return

    const savedVisibility = Object.fromEntries(
      tradeColumnOptions
        .filter((option) => !('locked' in option))
        .map((option) => [option.id, columnVisibility[option.id] !== false]),
    )

    try {
      window.localStorage.setItem(
        TRADE_COLUMN_VISIBILITY_KEY,
        JSON.stringify(savedVisibility),
      )
    } catch {
      // The grid still works when storage is unavailable.
    }
  }, [columnVisibility, preferencesLoaded])

  return [columnVisibility, setColumnVisibility] as const
}

interface TradeTableColumnPickerProps {
  columnVisibility: VisibilityState
  onColumnVisibilityChange: OnChangeFn<VisibilityState>
}

export function TradeTableColumnPicker({
  columnVisibility,
  onColumnVisibilityChange,
}: TradeTableColumnPickerProps) {
  const visibleCount = tradeColumnOptions.filter(
    (option) => columnVisibility[option.id] !== false,
  ).length

  const renderOptions = (group: 'core' | 'optional') =>
    tradeColumnOptions
      .filter((option) => option.group === group)
      .map((option) => {
        const locked = 'locked' in option && option.locked
        const checked = columnVisibility[option.id] !== false
        const checkboxId = `trade-column-${option.id}`

        return (
          <label
            key={option.id}
            htmlFor={checkboxId}
            className={cn(
              'flex min-h-8 items-center gap-2 rounded-md px-1.5 py-1 text-sm',
              locked
                ? 'cursor-default'
                : 'cursor-pointer hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <Checkbox
              id={checkboxId}
              checked={checked}
              disabled={locked}
              onCheckedChange={(nextChecked) =>
                onColumnVisibilityChange((current) => ({
                  ...current,
                  [option.id]: nextChecked === true,
                }))
              }
            />
            <span>{option.label}</span>
            {locked && (
              <span className="ml-auto text-[10px] text-muted-foreground">
                Always on
              </span>
            )}
          </label>
        )
      })

  return (
    <Popover.Root>
      <Popover.Trigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="border-primary/40 bg-primary/10 hover:bg-primary/15"
          />
        }
      >
        <Columns3 />
        Columns
        <span className="ml-0.5 font-mono text-[10px] text-muted-foreground">
          {visibleCount}/{tradeColumnOptions.length}
        </span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          sideOffset={6}
          align="end"
          className="isolate z-50"
        >
          <Popover.Popup className="max-h-(--available-height) w-64 origin-(--transform-origin) overflow-y-auto rounded-lg bg-popover p-2 text-popover-foreground shadow-lg ring-1 ring-foreground/10 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <Popover.Title className="px-1.5 pt-0.5 text-sm font-semibold">
              Visible columns
            </Popover.Title>
            <Popover.Description className="px-1.5 pt-1 pb-2 text-[11px] text-muted-foreground">
              Your selection is remembered on this device.
            </Popover.Description>
            <div className="border-t border-border/70 pt-1">
              <p className="px-1.5 py-1 font-mono text-[9px] tracking-[0.14em] text-muted-foreground uppercase">
                Core
              </p>
              {renderOptions('core')}
            </div>
            <div className="mt-1 border-t border-border/70 pt-1">
              <p className="px-1.5 py-1 font-mono text-[9px] tracking-[0.14em] text-muted-foreground uppercase">
                Optional
              </p>
              {renderOptions('optional')}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

const pnlClass = (value: number | null | undefined) =>
  value == null ? '' : value >= 0 ? 'text-profit' : 'text-loss'

function TradeCommentPopover({
  assetName,
  comments,
  compact = false,
}: {
  assetName: string
  comments: string
  compact?: boolean
}) {
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={`View note for ${assetName}`}
        className={cn(
          'border-0 bg-transparent p-0 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
          compact
            ? 'inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground'
            : 'block max-w-72 truncate rounded-sm text-xs underline decoration-border underline-offset-2 hover:text-foreground',
        )}
      >
        {compact ? (
          <MessageSquareText aria-hidden="true" className="h-3.5 w-3.5" />
        ) : (
          comments
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          sideOffset={6}
          align="start"
          className="isolate z-50"
        >
          <Popover.Popup className="w-80 max-w-(--available-width) origin-(--transform-origin) rounded-lg bg-popover p-3 text-popover-foreground shadow-lg ring-1 ring-foreground/10 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <div className="flex items-start justify-between gap-3">
              <Popover.Title className="text-sm font-semibold">
                Note for <span className="font-mono">{assetName}</span>
              </Popover.Title>
              <Popover.Close
                aria-label={`Close note for ${assetName}`}
                className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <X aria-hidden="true" className="size-3.5" />
              </Popover.Close>
            </div>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">
              {comments}
            </p>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

function SortHeader({
  column,
  children,
}: {
  column: Column<JournalTrade, unknown>
  children: React.ReactNode
}) {
  const sorted = column.getIsSorted()
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-1 transition-colors hover:text-foreground',
        sorted ? 'text-foreground' : 'text-muted-foreground',
      )}
      onClick={column.getToggleSortingHandler()}
    >
      {children}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  )
}

const rowToneClass = (trade: JournalTrade) => {
  if (trade.status === 'open') {
    return '[&>td:first-child]:border-l-2 [&>td:first-child]:border-l-sky/70'
  }
  const pnl = netJournalPnl(trade.realizedPnl, trade.commission) ?? 0
  return pnl >= 0
    ? '[&>td:first-child]:border-l-2 [&>td:first-child]:border-l-profit/70'
    : '[&>td:first-child]:border-l-2 [&>td:first-child]:border-l-loss/70'
}

const compareNullableNumbers = (
  a: number | null | undefined,
  b: number | null | undefined,
) => {
  if (a == null && b == null) return 0
  if (a == null) return -1
  if (b == null) return 1
  return a - b
}

export function TradeTable({
  trades,
  prices,
  rowSelection,
  onRowSelectionChange,
  columnVisibility,
  onColumnVisibilityChange,
  onClose,
  onSplit,
  onEdit,
}: TradeTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'status', desc: true },
    { id: 'tradeDate', desc: true },
  ])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  })

  const columns = useMemo<ColumnDef<JournalTrade>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={
              table.getIsSomePageRowsSelected() &&
              !table.getIsAllPageRowsSelected()
            }
            onCheckedChange={(checked) =>
              table.toggleAllPageRowsSelected(checked === true)
            }
            aria-label="Select all trades"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(checked) => row.toggleSelected(checked === true)}
            aria-label={`Select ${row.original.assetName}`}
          />
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'assetName',
        enableHiding: false,
        header: ({ column }) => <SortHeader column={column}>Asset</SortHeader>,
        cell: ({ row, table }) => (
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-semibold">
              {row.original.assetName}
            </span>
            <Badge variant="outline" className="text-[10px] uppercase">
              {row.original.assetType === 'crypto' ? 'crypto' : 'trad'}
            </Badge>
            {row.original.comments &&
              !table.getColumn('comments')?.getIsVisible() && (
                <TradeCommentPopover
                  assetName={row.original.assetName}
                  comments={row.original.comments}
                  compact
                />
              )}
          </div>
        ),
      },
      {
        accessorKey: 'exchange',
        header: ({ column }) => (
          <SortHeader column={column}>Exchange</SortHeader>
        ),
        cell: ({ getValue }) => {
          const exchange = getValue<string | undefined>()
          return (
            <span
              className={cn('text-xs', !exchange && 'text-muted-foreground')}
            >
              {exchange || '—'}
            </span>
          )
        },
      },
      {
        accessorKey: 'tradeType',
        header: ({ column }) => <SortHeader column={column}>Side</SortHeader>,
        cell: ({ getValue }) => {
          const side = getValue<string>()
          return (
            <span
              className={cn(
                'font-mono text-xs uppercase',
                side === 'buy' ? 'text-profit' : 'text-loss',
              )}
            >
              {side === 'buy' ? 'long' : 'short'}
            </span>
          )
        },
      },
      {
        accessorKey: 'quantity',
        header: ({ column }) => <SortHeader column={column}>Qty</SortHeader>,
        cell: ({ getValue }) => (
          <span className="tabular">{getValue<number>()}</span>
        ),
      },
      {
        accessorKey: 'price',
        header: ({ column }) => <SortHeader column={column}>Entry</SortHeader>,
        cell: ({ getValue }) => (
          <span className="tabular">
            {currencyFormatter.format(getValue<number>())}
          </span>
        ),
      },
      {
        accessorKey: 'commission',
        header: ({ column }) => (
          <SortHeader column={column}>Commission</SortHeader>
        ),
        sortingFn: (rowA, rowB) =>
          compareNullableNumbers(
            rowA.original.commission,
            rowB.original.commission,
          ),
        cell: ({ getValue }) => {
          const commission = getValue<number | undefined>()
          return (
            <span
              className={cn(
                'tabular',
                commission == null && 'text-muted-foreground',
              )}
            >
              {commission == null ? '—' : currencyFormatter.format(commission)}
            </span>
          )
        },
      },
      {
        accessorKey: 'tradeDate',
        header: ({ column }) => <SortHeader column={column}>Date</SortHeader>,
        cell: ({ row, table }) => (
          <span className="tabular text-xs">
            {row.original.tradeDate.slice(0, 10)}
            {row.original.closingDate &&
              !table.getColumn('closingDate')?.getIsVisible() && (
                <span className="text-muted-foreground">
                  {' '}
                  → {row.original.closingDate.slice(0, 10)}
                </span>
              )}
          </span>
        ),
      },
      {
        accessorKey: 'closingDate',
        header: ({ column }) => (
          <SortHeader column={column}>Close date</SortHeader>
        ),
        cell: ({ getValue }) => {
          const closingDate = getValue<string | undefined>()
          return (
            <span
              className={cn(
                'tabular text-xs',
                !closingDate && 'text-muted-foreground',
              )}
            >
              {closingDate?.slice(0, 10) ?? '—'}
            </span>
          )
        },
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <SortHeader column={column}>Status</SortHeader>,
        cell: ({ getValue }) => {
          const status = getValue<string>()
          return (
            <Badge
              variant="outline"
              className={cn(
                'uppercase',
                status === 'open'
                  ? 'border-sky/50 bg-sky/10 text-sky'
                  : 'border-border bg-muted/30 text-muted-foreground',
              )}
            >
              {status}
            </Badge>
          )
        },
      },
      {
        id: 'marketPrice',
        header: ({ column }) => <SortHeader column={column}>Market</SortHeader>,
        sortingFn: (rowA, rowB) => {
          const marketValue = (trade: JournalTrade) =>
            trade.status === 'closed'
              ? trade.closingPrice
              : prices[trade.assetName]
          return compareNullableNumbers(
            marketValue(rowA.original),
            marketValue(rowB.original),
          )
        },
        cell: ({ row }) => {
          const trade = row.original
          if (trade.status === 'closed') {
            return (
              <span className="tabular text-muted-foreground">
                {trade.closingPrice != null
                  ? currencyFormatter.format(trade.closingPrice)
                  : '—'}
              </span>
            )
          }
          const price = prices[trade.assetName]
          return (
            <span className="tabular">
              {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- index access may be undefined */}
              {price != null ? currencyFormatter.format(price) : '—'}
            </span>
          )
        },
      },
      {
        id: 'pnl',
        header: ({ column }) => <SortHeader column={column}>Net P&L</SortHeader>,
        sortingFn: (rowA, rowB) => {
          const pnlValue = (trade: JournalTrade) =>
            trade.status === 'closed'
              ? netJournalPnl(trade.realizedPnl, trade.commission)
              : unrealizedPnl(trade, prices)
          return compareNullableNumbers(
            pnlValue(rowA.original),
            pnlValue(rowB.original),
          )
        },
        cell: ({ row }) => {
          const trade = row.original
          if (trade.status === 'closed') {
            const pnl = netJournalPnl(trade.realizedPnl, trade.commission)
            return (
              <span
                title={trade.realizedPnl != null ? `Gross P&L: ${currencyFormatter.format(trade.realizedPnl)}` : undefined}
                className={cn(
                  'tabular font-semibold',
                  pnlClass(pnl),
                )}
              >
                {pnl != null
                  ? currencyFormatter.format(pnl)
                  : '—'}
              </span>
            )
          }
          const uPnl = unrealizedPnl(trade, prices)
          if (uPnl == null)
            return <span className="text-muted-foreground">—</span>
          const entryValue = trade.price * trade.quantity
          const pct = entryValue !== 0 ? (uPnl / entryValue) * 100 : 0
          return (
            <span className={cn('tabular font-semibold', pnlClass(uPnl))}>
              {currencyFormatter.format(uPnl)}
              <span className="ml-1 text-xs opacity-70">
                ({pct.toFixed(1)}%)
              </span>
            </span>
          )
        },
      },
      {
        accessorKey: 'comments',
        header: ({ column }) => <SortHeader column={column}>Notes</SortHeader>,
        cell: ({ getValue, row }) => {
          const comments = getValue<string | undefined>()
          if (!comments) return <span className="text-muted-foreground">—</span>

          return (
            <TradeCommentPopover
              assetName={row.original.assetName}
              comments={comments}
            />
          )
        },
      },
      {
        id: 'actions',
        enableHiding: false,
        header: '',
        cell: ({ row }) => {
          const trade = row.original
          return (
            <div className="flex justify-end gap-1">
              {trade.status === 'open' && (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onClose(trade)}
                  >
                    Close
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onSplit(trade)}
                  >
                    Split
                  </Button>
                </>
              )}
              <Button size="sm" variant="ghost" onClick={() => onEdit(trade)}>
                Edit
              </Button>
            </div>
          )
        },
        enableSorting: false,
      },
    ],
    [prices, onClose, onSplit, onEdit],
  )

  const table = useReactTable({
    data: trades,
    columns,
    state: { sorting, rowSelection, pagination, columnVisibility },
    onSortingChange: setSorting,
    onRowSelectionChange,
    onPaginationChange: setPagination,
    onColumnVisibilityChange,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const totalRows = table.getFilteredRowModel().rows.length
  const firstRow =
    totalRows === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1
  const lastRow = Math.min(
    totalRows,
    (pagination.pageIndex + 1) * pagination.pageSize,
  )

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-border/70">
        <Table>
          <TableHeader className="bg-muted/70">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="py-10 text-center text-muted-foreground"
                >
                  No trades yet - log your first transmutation.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className={rowToneClass(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="tabular">
          Showing {firstRow}-{lastRow} of {totalRows} trades
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2">
            Rows
            <Select
              value={String(pagination.pageSize)}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger size="sm" className="w-18">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map((pageSize) => (
                  <SelectItem key={pageSize} value={String(pageSize)}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <span className="tabular">
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount() || 1}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              aria-label="First page"
            >
              <ChevronsLeft />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Previous page"
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Next page"
            >
              <ChevronRight />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              aria-label="Last page"
            >
              <ChevronsRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TradeTable
