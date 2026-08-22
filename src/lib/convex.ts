import { ConvexReactClient } from 'convex/react'

const convexUrl = import.meta.env.VITE_CONVEX_URL

export function createConvexClient() {
  return convexUrl ? new ConvexReactClient(convexUrl) : null
}

export function isConvexConfigured() {
  return typeof convexUrl === 'string' && convexUrl.length > 0
}
