import { ClerkProvider } from '@clerk/tanstack-react-start'
import { shadcn } from '@clerk/ui/themes'
import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { Toaster } from 'sonner'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'
import TanstackQueryProvider from '../integrations/tanstack-query/root-provider'
import AppHeader from '@/components/AppHeader'
import GamificationBridge from '@/components/gamification/GamificationBridge'
import { TooltipProvider } from '@/components/ui/tooltip'

import appCss from '../styles.css?url'
import { isClerkClientConfigured } from '@/lib/clerk'
import { siteStructuredData } from '@/lib/seo'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'theme-color', content: '#0a0d16' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: 'image/svg+xml', href: '/qc-icon.svg' },
    ],
    scripts: [
      {
        type: 'application/ld+json',
        children: siteStructuredData(),
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const { queryClient } = Route.useRouteContext()
  const content = (
    <TanstackQueryProvider queryClient={queryClient}>
      <TooltipProvider>
        <GamificationBridge />
        <div className="flex min-h-screen flex-col">
          <AppHeader />
          <main className="flex-1">{children}</main>
          <footer className="mt-16 border-t border-border/40 py-6">
            <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 text-xs text-muted-foreground md:px-8">
              <span>
                Forged by{' '}
                <a
                  href="https://quantalchemy.io"
                  target="_blank"
                  rel="noreferrer"
                >
                  Quant Alchemy
                </a>
              </span>
              <span>
                Your data stays yours — uploads are processed locally in your
                browser.
              </span>
            </div>
          </footer>
        </div>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'oklch(0.21 0.033 274)',
              border: '1px solid rgba(146,155,205,0.2)',
              color: 'var(--foreground)',
            },
          }}
        />
        <TanStackDevtools
          config={{ position: 'bottom-right' }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
      </TooltipProvider>
    </TanstackQueryProvider>
  )

  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {isClerkClientConfigured() ? (
          <ClerkProvider appearance={{ theme: shadcn }}>
            {content}
          </ClerkProvider>
        ) : (
          content
        )}
        <Scripts />
      </body>
    </html>
  )
}
