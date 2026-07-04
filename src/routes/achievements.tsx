import { createFileRoute } from '@tanstack/react-router'
import { useStore } from '@tanstack/react-store'
import { Award, Flame, Lock } from 'lucide-react'

import {
  ACHIEVEMENTS,
  RANKS,
  gamificationStore,
  rankForXp,
} from '@/lib/gamification'
import { cn } from '@/lib/utils'
import { seo } from '@/lib/seo'

export const Route = createFileRoute('/achievements')({
  head: () =>
    seo({
      title: 'Achievements · Quant Companion',
      description:
        'Your transmutation ladder — XP, ranks, streaks, and achievements earned through disciplined trading.',
      path: '/achievements',
    }),
  component: AchievementsPage,
})

function AchievementsPage() {
  const state = useStore(gamificationStore)
  const { rank, level, next, progress } = rankForXp(state.xp)
  const unlockedCount = Object.keys(state.unlocked).length

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8">
      <div className="rise-in mb-10 max-w-2xl">
        <p className="kicker">The Great Work</p>
        <h1 className="font-display mt-2 text-3xl md:text-4xl">
          Your <span className="gold-text gold-shimmer">Transmutation</span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          Every disciplined action — journaling trades, stress-testing strategies,
          sizing risk — moves you along the alchemist's ladder.
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
                    : 'border-border/60 text-muted-foreground'
                )}
              >
                <div className="text-lg">{r.symbol}</div>
                <div className="mt-0.5 text-[10px] leading-tight">{r.name}</div>
                <div className="font-mono text-[10px] opacity-60">{r.minXp} XP</div>
              </div>
            ))}
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
            return (
              <div
                key={a.id}
                className={cn(
                  'panel panel-hover p-4',
                  unlockedAt ? 'gilded' : 'opacity-70'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full border',
                      unlockedAt
                        ? 'border-gold/50 bg-gold/10 text-gold'
                        : 'border-border bg-muted/40 text-muted-foreground'
                    )}
                  >
                    {unlockedAt ? (
                      <Award className="h-4.5 w-4.5" />
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    +{a.xp} XP
                  </span>
                </div>
                <h3
                  className={cn(
                    'mt-3 font-semibold',
                    unlockedAt && 'gold-text'
                  )}
                >
                  {a.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>
                {unlockedAt && (
                  <p className="font-mono mt-2 text-[10px] text-muted-foreground">
                    unlocked {new Date(unlockedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
