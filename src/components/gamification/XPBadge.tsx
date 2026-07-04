import { Link } from '@tanstack/react-router'
import { useStore } from '@tanstack/react-store'
import { Flame } from 'lucide-react'

import { gamificationStore, rankForXp } from '@/lib/gamification'

const RING_R = 15
const RING_C = 2 * Math.PI * RING_R

export default function XPBadge() {
  const { xp, streak } = useStore(gamificationStore, (s) => ({
    xp: s.xp,
    streak: s.streak,
  }))
  const { rank, next, progress } = rankForXp(xp)

  return (
    <Link
      to="/achievements"
      className="group flex items-center gap-2 rounded-full border border-gold/25 bg-gold/5 py-1 pl-1 pr-3 transition-colors hover:border-gold/50 hover:bg-gold/10"
      title={
        next
          ? `${rank.name} — ${xp} XP (${next.minXp - xp} to ${next.name})`
          : `${rank.name} — ${xp} XP`
      }
    >
      <span className="relative inline-flex h-9 w-9 items-center justify-center">
        <svg viewBox="0 0 36 36" className="h-9 w-9 -rotate-90">
          <circle
            cx="18"
            cy="18"
            r={RING_R}
            fill="none"
            stroke="color-mix(in oklab, var(--gold) 22%, transparent)"
            strokeWidth="2.5"
          />
          <circle
            cx="18"
            cy="18"
            r={RING_R}
            fill="none"
            stroke="var(--gold)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={RING_C}
            strokeDashoffset={RING_C * (1 - progress)}
            style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.16,1,0.3,1)' }}
          />
        </svg>
        <span className="absolute text-[13px] leading-none text-gold">
          {rank.symbol}
        </span>
      </span>
      <span className="hidden flex-col leading-tight sm:flex">
        <span className="gold-text gold-shimmer text-[11px] font-semibold">
          {rank.name}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          {xp} XP
        </span>
      </span>
      {streak > 1 && (
        <span
          className="flex items-center gap-0.5 font-mono text-[11px] text-gold"
          title={`${streak}-day streak`}
        >
          <Flame className="h-3.5 w-3.5" />
          {streak}
        </span>
      )}
    </Link>
  )
}
