import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { createConvexClient } from '@/lib/convex'

import type { ConvexReactClient } from 'convex/react'
import type { ReactNode } from 'react'

export interface AppRouterContext {
  convexClient: ConvexReactClient | null
  queryClient: QueryClient
}

export function getContext(): AppRouterContext {
  const queryClient = new QueryClient()

  return {
    convexClient: createConvexClient(),
    queryClient,
  }
}
export default function TanstackQueryProvider({
  children,
  queryClient,
}: {
  children: ReactNode
  queryClient: QueryClient
}) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
