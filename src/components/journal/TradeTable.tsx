import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { ArrowUpDown, MessageSquareText } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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

import type { ColumnDef, RowSelectionState, SortingState } from '@tanstack/react-table'
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
    { id: 'tradeDate', desc: true },
  ])

  const columns = useMemo<ColumnDef<JournalTrade>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllRowsSelected()}
            indeterminate={table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected()}
            onCheckedChange={(checked) => table.toggleAllRowsSelected(checked === true)}
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
        header: 'Asset',
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
        header: 'Side',
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
        header: 'Qty',
        cell: ({ getValue }) => (
          <span className="tabular">{getValue<number>()}</span>
        ),
      },
      {
        accessorKey: 'price',
        header: 'Entry',
        cell: ({ getValue }) => (
          <span className="tabular">{currencyFormatter.format(getValue<number>())}</span>
        ),
      },
      {
        accessorKey: 'tradeDate',
        header: ({ column }) => (
          <button
            className="inline-flex items-center gap-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Date <ArrowUpDown className="h-3 w-3" />
          </button>
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
        header: 'Status',
        cell: ({ getValue }) => {
          const status = getValue<string>()
          return (
            <Badge
              variant="outline"
              className={cn(
                'uppercase',
                status === 'open'
                  ? 'border-sky/40 text-sky'
                  : 'border-border text-muted-foreground'
              )}
            >
              {status}
            </Badge>
          )
        },
      },
      {
        id: 'marketPrice',
        header: 'Market',
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
        header: 'P&L',
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
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
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
                No trades yet — log your first transmutation.
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
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
  )
}

export default TradeTable
