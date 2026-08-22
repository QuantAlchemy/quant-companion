import { Show } from '@clerk/tanstack-react-start'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useStore } from '@tanstack/react-store'
import {
  ArrowRight,
  BookOpenText,
  Calculator,
  Flame,
  LineChart,
  Sparkles,
} from 'lucide-react'

import { LogoMark } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { isClerkClientConfigured } from '@/lib/clerk'
import {
  gamificationStore,
  nextProofStep,
  proofLadderProgress,
  rankForXp,
} from '@/lib/gamification'
import { seo } from '@/lib/seo'

export const Route = createFileRoute('/')({
  head: () =>
    seo({
      title: 'Quant Companion · Quant Alchemy',
      path: '/',
    }),
  component: HomePage,
})

const TOOLS = [
  {
    to: '/analytics',
    icon: LineChart,
    title: 'Performance Analytics',
    kicker: 'Attack your backtest',
    description:
      'Upload TradingView exports and stress-test them with Monte Carlo simulation, probability cones, z-scores, and the Strategy Invalidation Lab.',
    delay: '0ms',
  },
  {
    to: '/journal',
    icon: BookOpenText,
    title: 'Trading Journal',
    kicker: 'Discipline compounds',
    description:
      'Log entries with your reasoning, track live unrealized P&L, close with honesty. Streaks and achievements keep you accountable.',
    delay: '90ms',
  },
  {
    to: '/calculator',
    icon: Calculator,
    title: 'Position Sizing',
    kicker: 'Risk before reward',
    description:
      'Size every position from the risk you accept, with leverage, margin, and liquidation-buffer analysis built in.',
    delay: '180ms',
  },
] as const

function HomePage() {
  const state = useStore(gamificationStore)
  const { xp, streak } = state
  const { next } = rankForXp(xp)
  const proofProgress = proofLadderProgress(state)
  const nextProof = nextProofStep(state)

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 md:px-8">
      {/* Hero */}
      <section className="relative flex flex-col items-center pb-20 pt-20 text-center md:pt-28">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-[420px] max-w-3xl rounded-full opacity-60 blur-3xl"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(109,79,255,0.25), rgba(180,140,255,0.08) 55%, transparent 75%)',
          }}
        />
        <div className="rise-in">
          <LogoMark size={84} />
        </div>
        <p className="kicker rise-in mt-7">
          A trading workbench for disciplined decisions
        </p>
        <h1
          className="font-display rise-in mt-4 max-w-3xl text-balance text-4xl leading-tight md:text-6xl"
          style={{ animationDelay: '80ms' }}
        >
          Turn market lead into{' '}
          <span className="gold-text gold-shimmer">gold</span>, one disciplined
          trade at a time.
        </h1>
        <p
          className="rise-in mt-6 max-w-xl text-pretty text-lg text-muted-foreground"
          style={{ animationDelay: '160ms' }}
        >
          Quant Companion is the Quant Alchemy workbench: strategy analytics, a
          trading journal, and position sizing, unified in one place.
        </p>
        <div
          className="rise-in mt-8 flex flex-wrap items-center justify-center gap-3"
          style={{ animationDelay: '240ms' }}
        >
          <HeroActions />
        </div>

        {/* proof strip */}
        <Link
          to="/achievements"
          className="gilded rise-in mt-10 flex max-w-2xl items-center gap-4 rounded-full px-5 py-2.5 text-sm transition-transform hover:scale-[1.02]"
          style={{ animationDelay: '320ms' }}
        >
          <Sparkles className="h-4 w-4 text-gold" />
          <span>
            <span className="gold-text font-semibold">
              Proof Ladder {proofProgress.completed}/{proofProgress.total}
            </span>
            <span className="font-mono text-muted-foreground"> · {xp} XP</span>
            {nextProof ? (
              <span className="font-mono text-muted-foreground">
                {' '}
                · next: {nextProof.achievement.proofLabel}
              </span>
            ) : next ? (
              <span className="font-mono text-muted-foreground">
                {' '}
                · {next.minXp - xp} to {next.symbol}
              </span>
            ) : null}
          </span>
          {streak > 1 && (
            <span className="flex items-center gap-1 font-mono text-gold">
              <Flame className="h-3.5 w-3.5" />
              {streak}
            </span>
          )}
        </Link>
      </section>

      <section className="mb-20 grid gap-4 md:grid-cols-2">
        <div className="panel p-6">
          <p className="kicker">Open tools</p>
          <h2 className="font-display mt-2 text-2xl">
            Analyze before you commit.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Upload a TradingView export or calculate position risk without an
            account. Your files stay in your browser.
          </p>
          <Button
            render={<Link to="/analytics" />}
            className="mt-5"
            variant="outline"
          >
            Explore analytics <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        <div className="panel gilded p-6">
          <p className="kicker">Private beta</p>
          <h2 className="font-display mt-2 text-2xl">
            Keep the record that compounds.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            The account-scoped journal and live market-data tools are available
            to approved users while the beta stays focused.
          </p>
          <Button render={<Link to="/waitlist" />} className="mt-5">
            Request access <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Tools */}
      <section className="grid grid-cols-1 gap-6 pb-24 md:grid-cols-3">
        {TOOLS.map((tool) => (
          <Link
            key={tool.to}
            to={tool.to}
            className="panel panel-hover rise-in group flex flex-col p-6"
            style={{ animationDelay: tool.delay }}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-violet">
              <tool.icon className="h-5 w-5" />
            </div>
            <p className="kicker mt-5">{tool.kicker}</p>
            <h2 className="font-display mt-1 text-2xl text-foreground">
              {tool.title}
            </h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
              {tool.description}
            </p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-violet transition-transform group-hover:translate-x-1">
              Open <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        ))}
      </section>

      <section className="mx-auto max-w-3xl pb-20">
        <p className="kicker text-center">Common questions</p>
        <h2 className="font-display mt-2 text-center text-3xl">
          Know what crosses the wire.
        </h2>
        <div className="mt-8 grid gap-4">
          <article className="panel p-5">
            <h3 className="font-semibold">Do you upload my strategy files?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              No. CSV and XLSX strategy files are processed in your browser.
            </p>
          </article>
          <article className="panel p-5">
            <h3 className="font-semibold">Where does my journal live?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Journal entries are stored in a private cloud record scoped to
              your approved account. You can export them at any time.
            </p>
          </article>
          <article className="panel p-5">
            <h3 className="font-semibold">Is this trading advice?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              No. Quant Companion provides analysis and recordkeeping tools. You
              remain responsible for every trading decision.
            </p>
          </article>
        </div>
      </section>
    </div>
  )
}

function HeroActions() {
  if (!isClerkClientConfigured()) {
    return (
      <>
        <Button render={<Link to="/analytics" />} size="lg">
          Explore analytics
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <Button render={<Link to="/calculator" />} size="lg" variant="outline">
          Size a position
        </Button>
      </>
    )
  }

  return (
    <>
      <Show when="signed-out">
        <Button render={<Link to="/waitlist" />} size="lg">
          Request journal access
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <Button render={<Link to="/analytics" />} size="lg" variant="outline">
          Explore without an account
        </Button>
      </Show>
      <Show when="signed-in">
        <Button render={<Link to="/journal" />} size="lg">
          Open your journal
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <Button render={<Link to="/analytics" />} size="lg" variant="outline">
          Explore without an account
        </Button>
      </Show>
    </>
  )
}
