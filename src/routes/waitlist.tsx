import { Waitlist } from '@clerk/tanstack-react-start'
import { createFileRoute } from '@tanstack/react-router'

import { LogoMark } from '@/components/Logo'
import { seo } from '@/lib/seo'

export const Route = createFileRoute('/waitlist')({
  head: () =>
    seo({
      title: 'Request access · Quant Companion',
      description:
        'Join the Quant Companion waitlist for the cloud trading journal and live market-data features.',
      path: '/waitlist',
    }),
  component: WaitlistPage,
})

function WaitlistPage() {
  return (
    <div className="mx-auto grid min-h-[calc(100vh-8rem)] w-full max-w-5xl items-center gap-12 px-4 py-16 lg:grid-cols-[1fr_auto] lg:px-8">
      <section className="max-w-xl">
        <LogoMark size={72} />
        <p className="kicker mt-8">Private beta</p>
        <h1 className="font-display mt-3 text-4xl leading-tight md:text-5xl">
          Build a trading record you can trust.
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
          Request access to the cloud journal and live market-data tools. Public
          analytics and position sizing remain available without an account.
        </p>
        <ul className="mt-8 grid gap-3 text-sm text-muted-foreground">
          <li>Secure, account-scoped trade history</li>
          <li>Live unrealized P&amp;L for open positions</li>
          <li>Benchmark tests powered by current market data</li>
        </ul>
      </section>
      <div className="panel p-3">
        <Waitlist />
      </div>
    </div>
  )
}
