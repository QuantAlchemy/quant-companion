import { clerkMiddleware } from '@clerk/tanstack-react-start/server'
import { createStart } from '@tanstack/react-start'

import { isClerkServerConfigured } from '@/lib/clerk'

export const startInstance = createStart(() => {
  return {
    requestMiddleware: isClerkServerConfigured() ? [clerkMiddleware()] : [],
  }
})
