import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MessageSquareText,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { currencyFormatter } from '@/lib/format'
import { cn } from '@/lib/utils'

import type {
  Column,
  ColumnDef,
  PaginationState,
  RowSelectionState,
  SortingState,
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
    updater: RowSelectionState | ((old: RowSelectionState) => RowSelectionState)
  ) => void
}

const pnlClass = (value: number | null | undefined) =>
  value == null ? '' : value >= 0 ? 'text-profit' : 'text-loss'

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
      className={cn(
        'inline-flex items-center gap-1 transition-colors hover:text-foreground',
        sorted ? 'text-foreground' : 'text-muted-foreground'
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
  const pnl = trade.realizedPnl ?? 0
  return pnl >= 0
    ? '[&>td:first-child]:border-l-2 [&>td:first-child]:border-l-profit/70'
    : '[&>td:first-child]:border-l-2 [&>td:first-child]:border-l-loss/70'
}

export function unrealizedPnl(
  trade: JournalTrade,
  prices: Record<string, number>
): number | null {
  if (trade.status !== 'open') return null
  const marketPrice = prices[trade.assetName]
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- index access may be undefined
  if (marketPrice == null) return null
  const entryValue = trade.price * trade.quantity
  const currentValue = marketPrice * trade.quantity
  return trade.tradeType === 'buy' ? currentValue - entryValue : entryValue - currentValue
}

const compareNullableNumbers = (
  a: number | null | undefined,
  b: number | null | undefined
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
              table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()
            }
            onCheckedChange={(checked) => table.toggleAllPageRowsSelected(checked === true)}
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
        header: ({ column }) => <SortHeader column={column}>Asset</SortHeader>,
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-semibold">{row.original.assetName}</span>
            <Badge variant="outline" className="text-[10px] uppercase">
              {row.original.assetType === 'crypto' ? 'crypto' : 'trad'}
            </Badge>
            {row.original.comments && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <MessageSquareText className="h-3.5 w-3.5 text-muted-foreground" />
                  }
                />
                <TooltipContent className="max-w-72">
                  {row.original.comments}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        ),
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
                side === 'buy' ? 'text-profit' : 'text-loss'
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
          <span className="tabular">{currencyFormatter.format(getValue<number>())}</span>
        ),
      },
      {
        accessorKey: 'tradeDate',
        header: ({ column }) => (
          <SortHeader column={column}>Date</SortHeader>
        ),
        cell: ({ row }) => (
          <span className="tabular text-xs">
            {row.original.tradeDate.slice(0, 10)}
            {row.original.closingDate && (
              <span className="text-muted-foreground">
                {' '}
                → {row.original.closingDate.slice(0, 10)}
              </span>
            )}
          </span>
        ),
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
                  : 'border-border bg-muted/30 text-muted-foreground'
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
            trade.status === 'closed' ? trade.closingPrice : prices[trade.assetName]
          return compareNullableNumbers(
            marketValue(rowA.original),
            marketValue(rowB.original)
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
        header: ({ column }) => <SortHeader column={column}>P&L</SortHeader>,
        sortingFn: (rowA, rowB) => {
          const pnlValue = (trade: JournalTrade) =>
            trade.status === 'closed' ? trade.realizedPnl : unrealizedPnl(trade, prices)
          return compareNullableNumbers(
            pnlValue(rowA.original),
            pnlValue(rowB.original)
          )
        },
        cell: ({ row }) => {
          const trade = row.original
          if (trade.status === 'closed') {
            return (
              <span className={cn('tabular font-semibold', pnlClass(trade.realizedPnl))}>
                {trade.realizedPnl != null
                  ? currencyFormatter.format(trade.realizedPnl)
                  : '—'}
              </span>
            )
          }
          const uPnl = unrealizedPnl(trade, prices)
          if (uPnl == null) return <span className="text-muted-foreground">—</span>
          const entryValue = trade.price * trade.quantity
          const pct = entryValue !== 0 ? (uPnl / entryValue) * 100 : 0
          return (
            <span className={cn('tabular font-semibold', pnlClass(uPnl))}>
              {currencyFormatter.format(uPnl)}
              <span className="ml-1 text-xs opacity-70">({pct.toFixed(1)}%)</span>
            </span>
          )
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const trade = row.original
          return (
            <div className="flex justify-end gap-1">
              {trade.status === 'open' && (
                <>
                  <Button size="sm" variant="secondary" onClick={() => onClose(trade)}>
                    Close
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onSplit(trade)}>
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
    [prices, onClose, onSplit, onEdit]
  )

  const table = useReactTable({
    data: trades,
    columns,
    state: { sorting, rowSelection, pagination },
    onSortingChange: setSorting,
    onRowSelectionChange,
    onPaginationChange: setPagination,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const totalRows = table.getFilteredRowModel().rows.length
  const firstRow =
    totalRows === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1
  const lastRow = Math.min(totalRows, (pagination.pageIndex + 1) * pagination.pageSize)

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
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
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
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
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
