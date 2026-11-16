/**
 * Browser notifications for stop and target alerts. The service worker
 * (public/sw.js) shows each push. The server sends them (convex/push.ts) to
 * the subscription saved through alerts.subscribePush.
 */

const WORKER_URL = '/sw.js'

export const pushSupported = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window

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

/** Asks for permission and subscribes. Returns what the server stores. */
export const subscribeToPush = async (vapidPublicKey: string) => {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Notifications are blocked for this site in the browser')
  }
  const registration = await navigator.serviceWorker.register(WORKER_URL)
  await navigator.serviceWorker.ready
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(vapidPublicKey),
    }))
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
  return subscription.endpoint
}
