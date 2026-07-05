import { Link, createFileRoute } from '@tanstack/react-router'
import { useStore } from '@tanstack/react-store'
import { ArrowRight, CheckCircle2, Flame, Lock } from 'lucide-react'

import {
  ACHIEVEMENTS,
  RANKS,
  gamificationStore,
  nextProofStep,
  proofLadderProgress,
  rankForXp,
} from '@/lib/gamification'
import { cn } from '@/lib/utils'
import { seo } from '@/lib/seo'

export const Route = createFileRoute('/achievements')({
  head: () =>
    seo({
      title: 'Proof Ladder · Quant Companion',
      description:
        'Proof receipts for disciplined trading behavior — imported data, tested assumptions, defined risk, and reconciled journal outcomes.',
      path: '/achievements',
    }),
  component: AchievementsPage,
})

function AchievementsPage() {
  const state = useStore(gamificationStore)
  const { rank, level, next, progress } = rankForXp(state.xp)
  const proofProgress = proofLadderProgress(state)
  const nextProof = nextProofStep(state)
  const unlockedCount = proofProgress.completed

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8">
      <div className="rise-in mb-10 max-w-2xl">
        <p className="kicker">The Great Work</p>
        <h1 className="font-display mt-2 text-3xl md:text-4xl">
          Your <span className="gold-text gold-shimmer">Transmutation</span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          Achievements are proof receipts for disciplined trading behavior —
          imported data, tested assumptions, defined risk, and reconciled
          journal outcomes.
        </p>
      </div>

      {/* Rank ladder */}
      <div className="panel gilded rise-in mb-10 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="gold-text gold-shimmer font-display text-2xl font-semibold">
              {rank.symbol} {rank.name}
            </div>
            <div className="font-mono mt-1 text-sm text-muted-foreground">
              {state.xp} XP
              {next && ` · ${next.minXp - state.xp} XP to ${next.name}`}
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 font-mono text-gold">
              <Flame className="h-4 w-4" />
              {state.streak}-day streak
            </span>
            <span className="font-mono text-muted-foreground">
              best {state.bestStreak}
            </span>
          </div>
        </div>

        <div className="mt-6">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-linear-to-r from-gold-deep to-gold transition-all duration-700"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
            {RANKS.map((r, i) => (
              <div
                key={r.name}
                className={cn(
                  'rounded-lg border px-2 py-2',
                  i <= level
                    ? 'gilded text-gold'
                    : 'border-border/60 text-muted-foreground',
                )}
              >
                <div className="text-lg">{r.symbol}</div>
                <div className="mt-0.5 text-[10px] leading-tight">{r.name}</div>
                <div className="font-mono text-[10px] opacity-60">
                  {r.minXp} XP
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="panel rise-in mb-10 p-6"
        style={{ animationDelay: '80ms' }}
      >
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <p className="kicker">Proof Ladder</p>
            <h2 className="font-display mt-1 text-2xl">
              {proofProgress.completed} of {proofProgress.total} proofs recorded
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {nextProof
                ? `Next best proof: ${nextProof.achievement.proofLabel}. ${nextProof.achievement.evidence}`
                : 'Full ladder complete. Your workflow now has a data, risk, and journal evidence chain.'}
            </p>
          </div>
          <div className="min-w-44">
            <div className="font-mono mb-2 text-right text-xs text-muted-foreground">
              {proofProgress.percent}% complete
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-linear-to-r from-violet to-gold transition-all duration-700"
                style={{ width: `${proofProgress.percent}%` }}
              />
            </div>
            {nextProof && (
              <Link
                to={nextProof.achievement.route}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary/20"
              >
                {nextProof.achievement.actionLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div className="rise-in" style={{ animationDelay: '120ms' }}>
        <h2 className="font-display mb-4 text-2xl">
          Achievements{' '}
          <span className="text-base text-muted-foreground">
            {unlockedCount} / {ACHIEVEMENTS.length}
          </span>
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ACHIEVEMENTS.map((a) => {
            const unlockedAt = state.unlocked[a.id]
            const proven = a.check(state)
            return (
              <div
                key={a.id}
                className={cn(
                  'panel panel-hover p-4',
                  proven ? 'gilded' : 'opacity-70',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full border',
                      proven
                        ? 'border-gold/50 bg-gold/10 text-gold'
                        : 'border-border bg-muted/40 text-muted-foreground',
                    )}
                  >
                    {proven ? (
                      <CheckCircle2 className="h-4.5 w-4.5" />
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                  </div>
                </div>
                <h3 className={cn('mt-3 font-semibold', proven && 'gold-text')}>
                  {a.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {a.description}
                </p>
                <div className="mt-3 rounded-lg border border-border/60 bg-background/30 p-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
                    {a.proofLabel}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {a.evidence}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  {proven ? (
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {unlockedAt
                        ? `unlocked ${new Date(unlockedAt).toLocaleDateString()}`
                        : 'proof recorded'}
                    </p>
                  ) : (
                    <Link
                      to={a.route}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-violet hover:underline"
                    >
                      {a.actionLabel}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                  <span className="font-mono text-xs text-muted-foreground">
                    +{a.xp} XP
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
