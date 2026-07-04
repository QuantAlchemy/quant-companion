import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { currencyFormatter } from '@/lib/format'
import { addTrade, closeTrade, editTrade, splitTrade } from '@/lib/journal'

import type { AssetType, JournalTrade, NewTrade, TradeType } from '@/lib/journal'

const today = () => new Date().toISOString().slice(0, 10)

const emptyForm = (): NewTrade => ({
  assetName: '',
  assetType: 'crypto',
  quantity: 0,
  price: 0,
  tradeType: 'buy',
  tradeDate: today(),
  commission: undefined,
  exchange: '',
  comments: '',
})

interface TradeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When provided the dialog edits this trade, otherwise it creates one. */
  trade?: JournalTrade | null
}

export function TradeFormDialog({ open, onOpenChange, trade }: TradeFormDialogProps) {
  const [form, setForm] = useState<NewTrade>(emptyForm())

  useEffect(() => {
    if (!open) return
    setForm(
      trade
        ? {
            assetName: trade.assetName,
            assetType: trade.assetType,
            quantity: trade.quantity,
            price: trade.price,
            tradeType: trade.tradeType,
            tradeDate: trade.tradeDate.slice(0, 10),
            commission: trade.commission,
            exchange: trade.exchange ?? '',
            comments: trade.comments ?? '',
          }
        : emptyForm()
    )
  }, [open, trade])

  const set = <TKey extends keyof NewTrade>(key: TKey, value: NewTrade[TKey]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.assetName.trim()) return toast.error('Asset symbol is required')
    if (form.quantity <= 0) return toast.error('Quantity must be greater than 0')
    if (form.price <= 0) return toast.error('Entry price must be greater than 0')

    if (trade) {
      editTrade(trade.id, form)
      toast.success(`Updated ${form.assetName.toUpperCase()}`)
    } else {
      addTrade(form)
      toast.success(`Logged ${form.assetName.toUpperCase()} trade`)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="panel max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {trade ? 'Edit trade' : 'Log a trade'}
          </DialogTitle>
          <DialogDescription>
            {trade
              ? 'Adjust the details of this position.'
              : 'Record a new position in your journal.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="assetName">Asset</Label>
            <Input
              id="assetName"
              placeholder="BTC, NVDA…"
              value={form.assetName}
              onChange={(e) => set('assetName', e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Asset type</Label>
            <Select
              value={form.assetType}
              onValueChange={(v) => set('assetType', v as AssetType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="crypto">Crypto</SelectItem>
                <SelectItem value="traditional">Traditional</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Side</Label>
            <Select
              value={form.tradeType}
              onValueChange={(v) => set('tradeType', v as TradeType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buy">Buy / Long</SelectItem>
                <SelectItem value="sell">Sell / Short</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tradeDate">Entry date</Label>
            <Input
              id="tradeDate"
              type="date"
              value={form.tradeDate}
              onChange={(e) => set('tradeDate', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              step="any"
              min={0}
              value={form.quantity || ''}
              onChange={(e) => set('quantity', e.target.valueAsNumber || 0)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="price">Entry price</Label>
            <Input
              id="price"
              type="number"
              step="any"
              min={0}
              value={form.price || ''}
              onChange={(e) => set('price', e.target.valueAsNumber || 0)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="commission">Commission (optional)</Label>
            <Input
              id="commission"
              type="number"
              step="any"
              min={0}
              value={form.commission ?? ''}
              onChange={(e) =>
                set(
                  'commission',
                  Number.isNaN(e.target.valueAsNumber)
                    ? undefined
                    : e.target.valueAsNumber
                )
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exchange">Exchange (optional)</Label>
            <Input
              id="exchange"
              placeholder="Coinbase, Alpaca…"
              value={form.exchange ?? ''}
              onChange={(e) => set('exchange', e.target.value)}
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="comments">Notes — why this trade?</Label>
            <Textarea
              id="comments"
              placeholder="Setup, thesis, invalidation level… (earns Scribe XP)"
              value={form.comments ?? ''}
              onChange={(e) => set('comments', e.target.value)}
            />
          </div>
          <DialogFooter className="col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{trade ? 'Save changes' : 'Log trade'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface CloseTradeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trade: JournalTrade | null
}

export function CloseTradeDialog({ open, onOpenChange, trade }: CloseTradeDialogProps) {
  const [closingPrice, setClosingPrice] = useState(0)
  const [closingDate, setClosingDate] = useState(today())

  useEffect(() => {
    if (open) {
      setClosingPrice(0)
      setClosingDate(today())
    }
  }, [open])

  if (!trade) return null

  const estPnl =
    closingPrice > 0
      ? (trade.tradeType === 'buy'
          ? closingPrice - trade.price
          : trade.price - closingPrice) * trade.quantity
      : null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (closingPrice <= 0) return toast.error('Closing price must be greater than 0')
    const pnl = closeTrade(trade.id, closingPrice, closingDate)
    toast.success(
      `Closed ${trade.assetName} for ${currencyFormatter.format(pnl)} ${pnl >= 0 ? 'profit' : 'loss'}`
    )
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="panel max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Close {trade.assetName}
          </DialogTitle>
          <DialogDescription>
            {trade.quantity} @ {currencyFormatter.format(trade.price)} —{' '}
            {trade.tradeType === 'buy' ? 'long' : 'short'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="closingPrice">Closing price</Label>
            <Input
              id="closingPrice"
              type="number"
              step="any"
              min={0}
              value={closingPrice || ''}
              onChange={(e) => setClosingPrice(e.target.valueAsNumber || 0)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="closingDate">Closing date</Label>
            <Input
              id="closingDate"
              type="date"
              value={closingDate}
              onChange={(e) => setClosingDate(e.target.value)}
            />
          </div>
          {estPnl !== null && (
            <p
              className={`tabular text-sm font-semibold ${estPnl >= 0 ? 'text-profit' : 'text-loss'}`}
            >
              Estimated P&L: {currencyFormatter.format(estPnl)}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Close trade</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface SplitTradeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trade: JournalTrade | null
}

export function SplitTradeDialog({ open, onOpenChange, trade }: SplitTradeDialogProps) {
  const [closingQuantity, setClosingQuantity] = useState(0)
  const [closingPrice, setClosingPrice] = useState(0)
  const [closingDate, setClosingDate] = useState(today())

  useEffect(() => {
    if (open) {
      setClosingQuantity(0)
      setClosingPrice(0)
      setClosingDate(today())
    }
  }, [open])

  if (!trade) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (closingPrice <= 0) return toast.error('Closing price must be greater than 0')
    if (closingQuantity <= 0 || closingQuantity >= trade.quantity) {
      return toast.error(
        `Quantity must be between 0 and ${trade.quantity} (exclusive)`
      )
    }
    try {
      const pnl = splitTrade(trade.id, closingPrice, closingDate, closingQuantity)
      toast.success(
        `Partially closed ${trade.assetName} for ${currencyFormatter.format(pnl ?? 0)}`
      )
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to split trade')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="panel max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Partial close {trade.assetName}
          </DialogTitle>
          <DialogDescription>
            Close part of the position; the remainder stays open. Open quantity:{' '}
            {trade.quantity}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="splitQuantity">Quantity to close</Label>
            <Input
              id="splitQuantity"
              type="number"
              step="any"
              min={0}
              max={trade.quantity}
              value={closingQuantity || ''}
              onChange={(e) => setClosingQuantity(e.target.valueAsNumber || 0)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="splitPrice">Closing price</Label>
            <Input
              id="splitPrice"
              type="number"
              step="any"
              min={0}
              value={closingPrice || ''}
              onChange={(e) => setClosingPrice(e.target.valueAsNumber || 0)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="splitDate">Closing date</Label>
            <Input
              id="splitDate"
              type="date"
              value={closingDate}
              onChange={(e) => setClosingDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Partial close</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
