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
  | 'note-added'
  | 'csv-uploaded'
  | 'monte-carlo-run'
  | 'position-sized'
  | 'daily-visit'

export const XP_AWARDS: Record<GamificationEvent, number> = {
  'trade-logged': 10,
  'trade-closed': 15,
  'trade-won': 10,
  'note-added': 5,
  'csv-uploaded': 20,
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
  xp: number
  check: (s: GamificationState) => boolean
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
    id: 'first-trade',
    title: 'First Transmutation',
    description: 'Log your first trade in the journal.',
    xp: 25,
    check: (s) => (s.counters['trade-logged'] ?? 0) >= 1,
  },
  {
    id: 'ledger-keeper',
    title: 'Ledger Keeper',
    description: 'Log 10 trades.',
    xp: 50,
    check: (s) => (s.counters['trade-logged'] ?? 0) >= 10,
  },
  {
    id: 'realized',
    title: 'Realized',
    description: 'Close your first trade.',
    xp: 25,
    check: (s) => (s.counters['trade-closed'] ?? 0) >= 1,
  },
  {
    id: 'green-elixir',
    title: 'Green Elixir',
    description: 'Close a profitable trade.',
    xp: 30,
    check: (s) => (s.counters['trade-won'] ?? 0) >= 1,
  },
  {
    id: 'scribe',
    title: 'Scribe',
    description: 'Annotate a trade with your reasoning.',
    xp: 20,
    check: (s) => (s.counters['note-added'] ?? 0) >= 1,
  },
  {
    id: 'data-alchemist',
    title: 'Data Alchemist',
    description: 'Upload a strategy performance file for analysis.',
    xp: 30,
    check: (s) => (s.counters['csv-uploaded'] ?? 0) >= 1,
  },
  {
    id: 'fortune-teller',
    title: 'Fortune Teller',
    description: 'Run a Monte Carlo simulation.',
    xp: 30,
    check: (s) => (s.counters['monte-carlo-run'] ?? 0) >= 1,
  },
  {
    id: 'risk-artisan',
    title: 'Risk Artisan',
    description: 'Size a position with the calculator.',
    xp: 20,
    check: (s) => (s.counters['position-sized'] ?? 0) >= 1,
  },
  {
    id: 'kindled-discipline',
    title: 'Kindled Discipline',
    description: 'Stay active 3 days in a row.',
    xp: 40,
    check: (s) => s.streak >= 3 || s.bestStreak >= 3,
  },
  {
    id: 'iron-discipline',
    title: 'Iron Discipline',
    description: 'Stay active 7 days in a row.',
    xp: 100,
    check: (s) => s.streak >= 7 || s.bestStreak >= 7,
  },
]

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
  return day === `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function celebrateLevelUp(rank: Rank) {
  confetti({
    particleCount: 160,
    spread: 75,
    origin: { y: 0.25 },
    colors: ['#E8B45A', '#F4CF87', '#7C5CFF', '#B48CFF', '#ffffff'],
  })
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
