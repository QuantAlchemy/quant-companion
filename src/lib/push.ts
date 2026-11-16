/**
 * Browser notifications for stop and target alerts. The service worker
 * (public/sw.js) shows each push. The server sends them (convex/push.ts) to
 * the subscription saved through alerts.subscribePush.
 *
 * A subscription belongs to the browser, not the account, so this file also
 * remembers which Clerk user made it. BrowserAlertOwner (AlertInbox.tsx) drops
 * it when that user signs out or someone else signs in.
 */

const WORKER_URL = '/sw.js'
const OWNER_KEY = 'quant-companion:push-owner'

export const pushSupported = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window

const readOwner = () => {
  try {
    return localStorage.getItem(OWNER_KEY)
  } catch {
    return null
  }
}

const writeOwner = (userId: string | null) => {
  try {
    if (userId) localStorage.setItem(OWNER_KEY, userId)
    else localStorage.removeItem(OWNER_KEY)
  } catch {
    // Without storage the owner is unknown, so the next check unsubscribes.
  }
}

/** This browser's subscription, or null when it has none. */
export const currentSubscription = async () => {
  if (!pushSupported()) return null
  const registration = await navigator.serviceWorker.getRegistration(WORKER_URL)
  return (await registration?.pushManager.getSubscription()) ?? null
}

/** VAPID keys are URL-safe base64; the Push API wants the raw bytes. */
const keyBytes = (base64: string) => {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4))
    .replaceAll('-', '+')
    .replaceAll('_', '/')
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0))
}

/** False when the subscription was made with an older server key. */
const usesKey = (subscription: PushSubscription, vapidPublicKey: string) => {
  const key = subscription.options.applicationServerKey
  if (!key) return false
  const current = keyBytes(vapidPublicKey)
  const saved = new Uint8Array(key)
  return (
    saved.length === current.length &&
    saved.every((byte, index) => byte === current[index])
  )
}

/** This browser's subscription when it uses the current server key, else null. */
export const activeSubscription = async (vapidPublicKey: string) => {
  const subscription = await currentSubscription()
  return subscription && usesKey(subscription, vapidPublicKey)
    ? subscription
    : null
}

/** Asks for permission and subscribes. Returns what the server stores. */
export const subscribeToPush = async (
  vapidPublicKey: string,
  ownerId: string,
) => {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Notifications are blocked for this site in the browser')
  }
  const registration = await navigator.serviceWorker.register(WORKER_URL)
  await navigator.serviceWorker.ready
  const existing = await registration.pushManager.getSubscription()
  // A subscription made with an old server key can no longer receive pushes.
  if (existing && !usesKey(existing, vapidPublicKey)) {
    await existing.unsubscribe()
  }
  const subscription =
    existing && usesKey(existing, vapidPublicKey)
      ? existing
      : await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyBytes(vapidPublicKey),
        })
  writeOwner(ownerId)
  const { endpoint, keys } = subscription.toJSON()
  if (!endpoint || !keys?.p256dh || !keys.auth) {
    throw new Error('The browser returned an incomplete subscription')
  }
  return { endpoint, p256dh: keys.p256dh, auth: keys.auth }
}

/** Unsubscribes this browser. Returns the endpoint to remove on the server. */
export const unsubscribeFromPush = async () => {
  const subscription = await currentSubscription()
  if (!subscription) return null
  await subscription.unsubscribe()
  writeOwner(null)
  return subscription.endpoint
}

/**
 * Unsubscribes this browser unless `userId` made the subscription. Runs on
 * sign-out and sign-in, so one person's alerts never show for the next. The
 * server row is removed when the next push to it fails as gone.
 */
export const releaseUnlessOwner = async (userId: string | null) => {
  const subscription = await currentSubscription()
  if (!subscription) return
  if (userId !== null && readOwner() === userId) return
  await unsubscribeFromPush()
}
