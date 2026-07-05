import { Store } from '@tanstack/store'
import confetti from 'canvas-confetti'
import { toast } from 'sonner'

/**
 * Gamification — the alchemist's ladder.
 * XP transmutes through ranks; gold styling is reserved for these moments.
 */

export type GamificationEvent =
  | 'trade-logged'
  | 'trade-closed'
  | 'trade-won'
  | 'trade-lost'
  | 'note-added'
  | 'journal-imported'
  | 'csv-uploaded'
  | 'invalidation-reviewed'
  | 'monte-carlo-run'
  | 'position-sized'
  | 'daily-visit'

export const XP_AWARDS: Record<GamificationEvent, number> = {
  'trade-logged': 10,
  'trade-closed': 15,
  'trade-won': 10,
  'trade-lost': 10,
  'note-added': 5,
  'journal-imported': 15,
  'csv-uploaded': 20,
  'invalidation-reviewed': 10,
  'monte-carlo-run': 10,
  'position-sized': 5,
  'daily-visit': 5,
}

export interface Rank {
  name: string
  minXp: number
  symbol: string
}

// Transmutation ladder: lead → philosopher's stone
export const RANKS: Rank[] = [
  { name: 'Lead Seeker', minXp: 0, symbol: '☽' },
  { name: 'Copper Apprentice', minXp: 100, symbol: '♀' },
  { name: 'Silver Adept', minXp: 300, symbol: '☿' },
  { name: 'Gold Alchemist', minXp: 700, symbol: '☉' },
  { name: 'Master of Transmutation', minXp: 1500, symbol: '△' },
  { name: 'Philosopher’s Stone', minXp: 3000, symbol: '⊙' },
]

export interface AchievementDef {
  id: string
  title: string
  description: string
  /** Short evidence label shown on the proof ladder card. */
  proofLabel: string
  /** User-facing proof receipt copy. This must describe evidence, not vanity XP. */
  evidence: string
  /** Destination where the user can earn the proof. */
  route: '/analytics' | '/journal' | '/calculator' | '/achievements'
  /** CTA copy for the next-best proof step. */
  actionLabel: string
  xp: number
  check: (s: GamificationState) => boolean
}

export interface ProofLadderProgress {
  completed: number
  total: number
  percent: number
}

export interface NextProofStep {
  achievement: AchievementDef
  progress: ProofLadderProgress
}

export interface GamificationState {
  xp: number
  counters: Record<string, number>
  unlocked: Record<string, string> // achievement id -> ISO date unlocked
  streak: number
  bestStreak: number
  lastActiveDay: string | null // YYYY-MM-DD
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'data-alchemist',
    title: 'Trade List Proven',
    description:
      'Upload a TradingView strategy export so the app can inspect real trades.',
    proofLabel: 'TradingView export imported',
    evidence:
      'Your analytics are anchored to an actual trade list, not a hand-waved claim.',
    route: '/analytics',
    actionLabel: 'Import a strategy file',
    xp: 30,
    check: (s) => (s.counters['csv-uploaded'] ?? 0) >= 1,
  },
  {
    id: 'invalidation-lab-review',
    title: 'Invalidation Reviewed',
    description:
      'Open the Invalidation Lab after importing trade data and review the tests.',
    proofLabel: 'Strategy attacked by invalidation tests',
    evidence:
      'You looked for fake, fragile, overfit, or outlier-driven performance before trusting the strategy.',
    route: '/analytics',
    actionLabel: 'Review invalidation tests',
    xp: 25,
    check: (s) => (s.counters['invalidation-reviewed'] ?? 0) >= 1,
  },
  {
    id: 'fortune-teller',
    title: 'Path Risk Simulated',
    description:
      'Run a Monte Carlo simulation against the imported strategy history.',
    proofLabel: 'Monte Carlo path stress test run',
    evidence:
      'You inspected path dependency instead of treating one equity curve as destiny.',
    route: '/analytics',
    actionLabel: 'Run Monte Carlo',
    xp: 30,
    check: (s) => (s.counters['monte-carlo-run'] ?? 0) >= 1,
  },
  {
    id: 'risk-artisan',
    title: 'Risk Defined First',
    description:
      'Size a position from accepted risk before focusing on upside.',
    proofLabel: 'Position sized from stop/risk',
    evidence:
      'The position was calculated from account risk, stop distance, leverage, and liquidation buffer.',
    route: '/calculator',
    actionLabel: 'Size a position',
    xp: 20,
    check: (s) => (s.counters['position-sized'] ?? 0) >= 1,
  },
  {
    id: 'first-trade',
    title: 'First Trade Receipt',
    description: 'Log your first trade in the journal.',
    proofLabel: 'Trade entered into the ledger',
    evidence:
      'A real trade record exists with symbol, side, quantity, entry, and date.',
    route: '/journal',
    actionLabel: 'Log a trade',
    xp: 25,
    check: (s) => (s.counters['trade-logged'] ?? 0) >= 1,
  },
  {
    id: 'scribe',
    title: 'Thesis Attached',
    description: 'Annotate a trade with the reasoning you can review later.',
    proofLabel: 'Trade thesis or note recorded',
    evidence:
      'The ledger includes reasoning, making later review harder to rewrite from memory.',
    route: '/journal',
    actionLabel: 'Add trade reasoning',
    xp: 20,
    check: (s) => (s.counters['note-added'] ?? 0) >= 1,
  },
  {
    id: 'realized',
    title: 'Closed Loop',
    description: 'Close a trade and reconcile it against the original entry.',
    proofLabel: 'Trade closed with realized P&L',
    evidence:
      'The journal has at least one completed trade with an outcome, not just an open intention.',
    route: '/journal',
    actionLabel: 'Close a trade',
    xp: 25,
    check: (s) => (s.counters['trade-closed'] ?? 0) >= 1,
  },
  {
    id: 'loss-reconciler',
    title: 'Loss Reconciled',
    description: 'Record a losing close instead of only celebrating winners.',
    proofLabel: 'Losing trade accepted in the ledger',
    evidence:
      'The proof ladder includes at least one loss so maturity is not just win-count theater.',
    route: '/journal',
    actionLabel: 'Reconcile a loss',
    xp: 30,
    check: (s) => (s.counters['trade-lost'] ?? 0) >= 1,
  },
  {
    id: 'green-elixir',
    title: 'Winner Reconciled',
    description:
      'Close a profitable trade and preserve the outcome in the journal.',
    proofLabel: 'Profitable trade closed',
    evidence:
      'The ledger includes a realized winner that can be compared against the original thesis.',
    route: '/journal',
    actionLabel: 'Close a winner',
    xp: 30,
    check: (s) => (s.counters['trade-won'] ?? 0) >= 1,
  },
  {
    id: 'journal-imported',
    title: 'History Recovered',
    description:
      'Import journal history from a compatible JSON or JSONL export.',
    proofLabel: 'Historical ledger imported',
    evidence:
      'Your proof ladder can start from prior records instead of forcing a blank-slate diary.',
    route: '/journal',
    actionLabel: 'Import journal history',
    xp: 25,
    check: (s) => (s.counters['journal-imported'] ?? 0) >= 1,
  },
  {
    id: 'ledger-keeper',
    title: 'Ledger Keeper',
    description: 'Log 10 trades so patterns have something to work with.',
    proofLabel: '10 trade records accumulated',
    evidence:
      'The ledger is large enough to begin surfacing recurring behaviors instead of anecdotes.',
    route: '/journal',
    actionLabel: 'Build the ledger',
    xp: 50,
    check: (s) => (s.counters['trade-logged'] ?? 0) >= 10,
  },
  {
    id: 'iron-discipline',
    title: 'Seven-Day Discipline',
    description: 'Stay active for 7 days in a row.',
    proofLabel: '7-day operating cadence',
    evidence:
      'You returned to the system for a full week; the companion is becoming process, not novelty.',
    route: '/achievements',
    actionLabel: 'Keep the streak alive',
    xp: 100,
    check: (s) => s.streak >= 7 || s.bestStreak >= 7,
  },
]

export function proofLadderProgress(
  state: GamificationState,
): ProofLadderProgress {
  const completed = ACHIEVEMENTS.filter((achievement) =>
    achievement.check(state),
  ).length
  const total = ACHIEVEMENTS.length
  return {
    completed,
    total,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
  }
}

export function nextProofStep(state: GamificationState): NextProofStep | null {
  const achievement = ACHIEVEMENTS.find((candidate) => !candidate.check(state))
  if (!achievement) return null

  return {
    achievement,
    progress: proofLadderProgress(state),
  }
}

const EMPTY_STATE: GamificationState = {
  xp: 0,
  counters: {},
  unlocked: {},
  streak: 0,
  bestStreak: 0,
  lastActiveDay: null,
}

let userKey = 'guest'

const storageKey = () => `qc:${userKey}:progress`

function load(): GamificationState {
  if (typeof window === 'undefined') return EMPTY_STATE
  try {
    const raw = window.localStorage.getItem(storageKey())
    if (!raw) return EMPTY_STATE
    return { ...EMPTY_STATE, ...(JSON.parse(raw) as GamificationState) }
  } catch {
    return EMPTY_STATE
  }
}

function persist(state: GamificationState) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(storageKey(), JSON.stringify(state))
  } catch {
    // storage full/unavailable — gamification is best-effort
  }
}

export const gamificationStore = new Store<GamificationState>(EMPTY_STATE)

/** Swap the active user (Clerk user id or 'guest') and reload progress. */
export function setGamificationUser(id: string | null | undefined) {
  userKey = id ?? 'guest'
  gamificationStore.setState(() => load())
}

export function rankForXp(xp: number): {
  rank: Rank
  level: number
  next: Rank | null
  progress: number
} {
  let level = 0
  for (let i = 0; i < RANKS.length; i++) {
    if (xp >= RANKS[i].minXp) level = i
  }
  const rank = RANKS[level]
  const next = level + 1 < RANKS.length ? RANKS[level + 1] : null
  const progress = next
    ? Math.min(1, (xp - rank.minXp) / (next.minXp - rank.minXp))
    : 1
  return { rank, level, next, progress }
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isYesterday(day: string) {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return (
    day ===
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  )
}

function celebrateLevelUp(rank: Rank) {
  if (typeof document !== 'undefined') {
    confetti({
      particleCount: 160,
      spread: 75,
      origin: { y: 0.25 },
      colors: ['#E8B45A', '#F4CF87', '#7C5CFF', '#B48CFF', '#ffffff'],
    })
  }
  toast(`Transmutation complete — you are now ${rank.name} ${rank.symbol}`, {
    description: 'Your dedication is turning lead into gold.',
    duration: 6000,
  })
}

function celebrateAchievement(a: AchievementDef) {
  toast(`Achievement unlocked: ${a.title}`, {
    description: `${a.description} (+${a.xp} XP)`,
    duration: 5000,
  })
}

/**
 * Record an event: adds XP, updates the daily streak, unlocks achievements,
 * and celebrates level-ups. Safe to call from any client event handler.
 */
export function award(event: GamificationEvent) {
  if (typeof window === 'undefined') return

  gamificationStore.setState((prev) => {
    const state: GamificationState = {
      ...prev,
      counters: { ...prev.counters },
      unlocked: { ...prev.unlocked },
    }

    // streak bookkeeping — any activity counts
    const today = todayStr()
    if (state.lastActiveDay !== today) {
      state.streak =
        state.lastActiveDay && isYesterday(state.lastActiveDay)
          ? state.streak + 1
          : 1
      state.bestStreak = Math.max(state.bestStreak, state.streak)
      state.lastActiveDay = today
    }

    const before = rankForXp(state.xp).level
    state.counters[event] = (state.counters[event] ?? 0) + 1
    state.xp += XP_AWARDS[event]

    for (const a of ACHIEVEMENTS) {
      if (!state.unlocked[a.id] && a.check(state)) {
        state.unlocked[a.id] = new Date().toISOString()
        state.xp += a.xp
        celebrateAchievement(a)
      }
    }

    const after = rankForXp(state.xp)
    if (after.level > before) celebrateLevelUp(after.rank)

    persist(state)
    return state
  })
}

/** Once-per-day visit XP; call on app mount when the user is known. */
export function recordDailyVisit() {
  if (typeof window === 'undefined') return
  const state = gamificationStore.state
  if (state.lastActiveDay !== todayStr()) award('daily-visit')
}
