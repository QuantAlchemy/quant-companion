import { ClientOnly } from '@tanstack/react-router'
import { Suspense, lazy } from 'react'

import type { PlotParams } from 'react-plotly.js'

// plotly.js touches `window` at import time — client-only, code-split
const PlotImpl = lazy(() => import('./PlotImpl'))

function PlotSkeleton() {
  return (
    <div className="flex h-[420px] w-full animate-pulse items-center justify-center rounded-xl bg-muted/40">
      <span className="font-mono text-xs text-muted-foreground">
        rendering chart…
      </span>
    </div>
  )
}

export function Plot(props: PlotParams) {
  return (
    <ClientOnly fallback={<PlotSkeleton />}>
      <Suspense fallback={<PlotSkeleton />}>
        <PlotImpl {...props} />
      </Suspense>
    </ClientOnly>
  )
}

export default Plot
