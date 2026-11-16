import { useAuth } from '@clerk/tanstack-react-start'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { Bell } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { api } from '@/../convex/_generated/api'
import { formatUsdPrice } from '@/lib/format'
import {
  activeSubscription,
  pushSupported,
  releaseUnlessOwner,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/push'
import { cn } from '@/lib/utils'

import type { FunctionReturnType } from 'convex/server'

type InboxAlert = FunctionReturnType<typeof api.alerts.list>['alerts'][number]

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

/**
 * The bell in the app bar and the alert panel it opens. Stop and target hits
 * arrive here live from convex/alerts.ts. Shown only to signed-in users.
 */
export default function AlertInbox() {
  const inbox = useQuery(api.alerts.list)
  const [open, setOpen] = useState(false)
  const unread = inbox?.unread ?? 0

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        aria-label={unread > 0 ? `Alerts, ${unread} unread` : 'Alerts'}
        onClick={() => setOpen(true)}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 rounded-full bg-loss px-1 font-mono text-[10px] leading-4 font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-0 right-0 left-auto h-dvh max-h-dvh w-full translate-x-0 translate-y-0 content-start overflow-y-auto rounded-none sm:max-w-sm data-open:zoom-in-100 data-closed:zoom-out-100">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Alerts</DialogTitle>
            <DialogDescription>
              Stops and take profits are checked every hour. An alert is not an
              order.
            </DialogDescription>
          </DialogHeader>
          <AlertChannels />
          <AlertList
            alerts={inbox?.alerts ?? []}
            unread={unread}
            onNavigate={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

/**
 * Drops this browser's push subscription when another user signs in, or when
 * the owner signs out during this visit. A page that loads signed out, such
 * as after a session expired, keeps it. Rendered in the header whether or not
 * anyone is signed in.
 */
export function BrowserAlertOwner() {
  const { isLoaded, userId } = useAuth()
  const previous = useRef<string | null>(null)
  useEffect(() => {
    if (!isLoaded) return
    const signedOut = !userId && previous.current !== null
    previous.current = userId ?? null
    if (!userId && !signedOut) return
    releaseUnlessOwner(userId ?? null).catch((error: unknown) =>
      console.error('Could not release browser alerts', error),
    )
  }, [isLoaded, userId])
  return null
}

/**
 * In app is always on. Browser is per device; email is per account. The
 * browser switch is on only when the server delivers to this browser for the
 * signed-in user with the current key.
 */
function AlertChannels() {
  const { userId } = useAuth()
  const settings = useQuery(api.alerts.settings)
  const setEmail = useMutation(api.alerts.setEmail)
  const subscribe = useMutation(api.alerts.subscribePush)
  const unsubscribe = useMutation(api.alerts.unsubscribePush)
  const [endpoint, setEndpoint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const vapidPublicKey = settings?.vapidPublicKey ?? null
  const delivering = useQuery(
    api.alerts.pushStatus,
    endpoint ? { endpoint } : 'skip',
  )
  const browserOn = endpoint !== null && delivering === true

  useEffect(() => {
    if (!vapidPublicKey) return
    void activeSubscription(vapidPublicKey).then((subscription) =>
      setEndpoint(subscription?.endpoint ?? null),
    )
  }, [vapidPublicKey])

  const browserReason = !pushSupported()
    ? 'This browser cannot show notifications'
    : settings && !settings.vapidPublicKey
      ? 'Browser alerts are not set up on this server'
      : 'On this device'
  const emailReason = settings?.emailReady
    ? (settings.emailAddress ?? 'Your sign-in has no email address')
    : 'Email alerts are not set up on this server'

  const run = async (work: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await work()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Change failed')
    } finally {
      setBusy(false)
    }
  }

  const toggleBrowser = (enabled: boolean) =>
    run(async () => {
      if (enabled) {
        if (!vapidPublicKey || !userId) return
        const subscription = await subscribeToPush(vapidPublicKey, userId)
        setEndpoint(subscription.endpoint)
        await subscribe(subscription)
      } else {
        const removed = await unsubscribeFromPush()
        setEndpoint(null)
        if (removed) await unsubscribe({ endpoint: removed })
      }
    })

  return (
    <div className="divide-y divide-border/60 rounded-lg border border-border/60 text-sm">
      <Channel label="In the app" detail="Always on" checked disabled />
      <Channel
        label="Browser notification"
        detail={browserReason}
        checked={browserOn}
        disabled={busy || !pushSupported() || !vapidPublicKey}
        onChange={toggleBrowser}
      />
      <Channel
        label="Email"
        detail={emailReason}
        checked={settings?.email ?? false}
        disabled={busy || !settings?.emailReady || !settings.emailAddress}
        onChange={(enabled) => run(() => setEmail({ enabled }))}
      />
    </div>
  )
}

function Channel({
  label,
  detail,
  checked,
  disabled,
  onChange,
}: {
  label: string
  detail: string
  checked: boolean
  disabled?: boolean
  onChange?: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3 px-3 py-2.5">
      <span>
        {label}
        <span className="block text-xs text-muted-foreground">{detail}</span>
      </span>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={(next) => onChange?.(next)}
      />
    </label>
  )
}

function AlertList({
  alerts,
  unread,
  onNavigate,
}: {
  alerts: InboxAlert[]
  unread: number
  onNavigate: () => void
}) {
  const markRead = useMutation(api.alerts.markRead)

  if (alerts.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No alerts yet. Add a stop loss or take profit to an open trade.
      </p>
    )
  }

  return (
    <div className="space-y-2.5">
      {unread > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto flex"
          onClick={() => void markRead({})}
        >
          Mark all read
        </Button>
      )}
      {alerts.map((alert) => (
        <AlertCard
          key={alert._id}
          alert={alert}
          onRead={() => void markRead({ alertId: alert._id })}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  )
}

function AlertCard({
  alert,
  onRead,
  onNavigate,
}: {
  alert: InboxAlert
  onRead: () => void
  onNavigate: () => void
}) {
  const isStop = alert.kind === 'stop'
  const unread = alert.readAt == null
  const open = alert.tradeStatus === 'open'
  const follow = () => {
    if (unread) onRead()
    onNavigate()
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-border/60 bg-card p-3 text-sm',
        unread &&
          (isStop ? 'border-l-4 border-l-loss' : 'border-l-4 border-l-profit'),
        !unread && 'opacity-70',
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-medium">
          {isStop ? 'Stop hit' : 'Take profit hit'} · {alert.assetName}{' '}
          {alert.tradeType === 'buy' ? 'long' : 'short'}
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          {timeFormatter.format(alert._creationTime)}
        </span>
      </div>
      <dl className="mt-1.5 grid grid-cols-2 gap-x-3 font-mono text-xs">
        <dt className="text-muted-foreground">
          {isStop ? 'Stop' : 'Take profit'}
        </dt>
        <dd className="text-right">{formatUsdPrice(alert.level)}</dd>
        <dt className="text-muted-foreground">Price seen</dt>
        <dd className={cn('text-right', isStop ? 'text-loss' : 'text-profit')}>
          {formatUsdPrice(alert.price)}
        </dd>
      </dl>
      {open ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {/* Intentional: prefills the level, not the price seen. The card shows
              both, and the close dialog is editable for the real fill. */}
          <Button
            size="sm"
            render={
              <Link
                to="/journal"
                search={{ close: alert.tradeId, price: alert.level }}
                onClick={follow}
              />
            }
          >
            Close at {formatUsdPrice(alert.level)}
          </Button>
          <Button
            size="sm"
            variant="outline"
            render={
              <Link
                to="/journal"
                search={{ edit: alert.tradeId }}
                onClick={follow}
              />
            }
          >
            Edit levels
          </Button>
          {unread && (
            <Button size="sm" variant="ghost" onClick={onRead}>
              Dismiss
            </Button>
          )}
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          {alert.tradeStatus === 'closed'
            ? `Closed${alert.closingPrice != null ? ` at ${formatUsdPrice(alert.closingPrice)}` : ''} in the journal`
            : 'This trade was deleted'}
        </p>
      )}
    </div>
  )
}
