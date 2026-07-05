import { describe, expect, it } from 'vitest'

import {
  ACHIEVEMENTS,
  nextProofStep,
  proofLadderProgress,
} from './gamification'

import type { GamificationState } from './gamification'

const state = (
  counters: GamificationState['counters'],
  unlocked: GamificationState['unlocked'] = {},
): GamificationState => ({
  xp: 0,
  counters,
  unlocked,
  streak: 0,
  bestStreak: 0,
  lastActiveDay: null,
})

describe('proof ladder achievements', () => {
  it('defines a routeable proof ladder with concrete evidence copy', () => {
    expect(ACHIEVEMENTS).toHaveLength(12)
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(
      ACHIEVEMENTS.length,
    )

    for (const achievement of ACHIEVEMENTS) {
      expect(achievement.proofLabel).toMatch(/\S/)
      expect(achievement.evidence).toMatch(/\S/)
      expect(achievement.actionLabel).toMatch(/\S/)
      expect(achievement.route).toMatch(/^\//)
    }
  })

  it('routes an empty user to the first proof step, then advances across tools', () => {
    expect(nextProofStep(state({}))?.achievement.id).toBe('data-alchemist')
    expect(nextProofStep(state({}))?.achievement.route).toBe('/analytics')

    expect(nextProofStep(state({ 'csv-uploaded': 1 }))?.achievement.id).toBe(
      'invalidation-lab-review',
    )

    expect(
      nextProofStep(
        state({
          'csv-uploaded': 1,
          'invalidation-reviewed': 1,
          'monte-carlo-run': 1,
        }),
      )?.achievement.route,
    ).toBe('/calculator')
  })

  it('summarizes ladder progress from achievement checks rather than vanity XP', () => {
    const progress = proofLadderProgress(
      state({
        'csv-uploaded': 1,
        'invalidation-reviewed': 1,
        'monte-carlo-run': 1,
        'position-sized': 1,
        'trade-logged': 1,
        'note-added': 1,
      }),
    )

    expect(progress.completed).toBe(6)
    expect(progress.total).toBe(12)
    expect(progress.percent).toBe(50)
  })

  it('routes streak upkeep away from the proof ladder page itself', () => {
    const next = nextProofStep(
      state({
        'csv-uploaded': 1,
        'invalidation-reviewed': 1,
        'monte-carlo-run': 1,
        'position-sized': 1,
        'trade-logged': 10,
        'note-added': 1,
        'trade-closed': 1,
        'trade-lost': 1,
        'trade-won': 1,
        'journal-imported': 1,
      }),
    )

    expect(next?.achievement.id).toBe('iron-discipline')
    expect(next?.achievement.route).toBe('/')
  })

  it('returns null once every proof has evidence', () => {
    const complete = state({
      'csv-uploaded': 1,
      'invalidation-reviewed': 1,
      'monte-carlo-run': 1,
      'position-sized': 1,
      'trade-logged': 10,
      'note-added': 1,
      'trade-closed': 1,
      'trade-lost': 1,
      'trade-won': 1,
      'journal-imported': 1,
    })
    complete.streak = 7
    complete.bestStreak = 7

    expect(nextProofStep(complete)).toBeNull()
    expect(proofLadderProgress(complete)).toMatchObject({
      completed: 12,
      total: 12,
      percent: 100,
    })
  })
})
