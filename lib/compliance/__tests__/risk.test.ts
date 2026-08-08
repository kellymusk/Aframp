/**
 * Risk aggregation tests.
 *
 * The scoring model gets argued about — by analysts tuning it and by examiners
 * reviewing it — so its stated properties are pinned here rather than left as
 * claims in a comment.
 */

import { DECISION_THRESHOLDS, SECONDARY_SIGNAL_WEIGHT } from '../config'
import {
  decideFromScore,
  highestSeverity,
  riskLevelForScore,
  scoreSignals,
  sortSignals,
} from '../risk'
import type { RiskLevel, RiskSignal, SignalCode } from '../types'

function signal(score: number, severity: RiskLevel = 'MEDIUM', code = 'VELOCITY_VOLUME'): RiskSignal {
  return { code: code as SignalCode, severity, score, description: 'test' }
}

describe('scoreSignals', () => {
  it('scores an empty set 0', () => {
    expect(scoreSignals([])).toBe(0)
  })

  it('returns the signal score itself when only one fired', () => {
    expect(scoreSignals([signal(55)])).toBe(55)
  })

  it('discounts every signal after the strongest', () => {
    // 60 + 0.35 × (40 + 20) = 81
    const expected = Math.round(60 + SECONDARY_SIGNAL_WEIGHT * 60)
    expect(scoreSignals([signal(40), signal(60), signal(20)])).toBe(expected)
  })

  it('is order-independent', () => {
    const signals = [signal(40), signal(60), signal(20)]
    const reversed = [...signals].reverse()
    expect(scoreSignals(signals)).toBe(scoreSignals(reversed))
  })

  it('is monotone — adding a signal never lowers the score', () => {
    // This is the property that makes the model defensible: more evidence
    // cannot make a transaction look safer.
    const base = [signal(50)]
    for (const extra of [1, 25, 70, 100]) {
      expect(scoreSignals([...base, signal(extra)])).toBeGreaterThanOrEqual(
        scoreSignals(base)
      )
    }
  })

  it('ranks one severe signal above several weak ones', () => {
    // The failure a plain sum would produce: three unremarkable signals
    // outranking a single dangerous one, so analysts triage noise first.
    const severe = scoreSignals([signal(100, 'SEVERE')])
    const weak = scoreSignals([signal(30), signal(30), signal(30)])
    expect(severe).toBeGreaterThan(weak)
  })

  it('lets corroboration escalate across a band boundary', () => {
    // The failure taking max alone would produce: four rules firing at once
    // scoring identically to one.
    const alone = scoreSignals([signal(45)])
    const corroborated = scoreSignals([signal(45), signal(45), signal(40)])
    expect(corroborated).toBeGreaterThan(alone)
    expect(riskLevelForScore(corroborated)).not.toBe(riskLevelForScore(alone))
  })

  it('caps at 100', () => {
    expect(scoreSignals([signal(100), signal(100), signal(100)])).toBe(100)
  })

  it('clamps out-of-range and non-finite scores rather than propagating them', () => {
    expect(scoreSignals([signal(150)])).toBe(100)
    expect(scoreSignals([signal(-20)])).toBe(0)
    expect(scoreSignals([signal(Number.NaN)])).toBe(0)
  })
})

describe('riskLevelForScore', () => {
  it.each([
    [0, 'LOW'],
    [24, 'LOW'],
    [25, 'MEDIUM'],
    [49, 'MEDIUM'],
    [50, 'HIGH'],
    [74, 'HIGH'],
    [75, 'SEVERE'],
    [100, 'SEVERE'],
  ])('maps %i to %s', (score, level) => {
    expect(riskLevelForScore(score)).toBe(level)
  })

  it('clamps scores outside 0–100', () => {
    expect(riskLevelForScore(-5)).toBe('LOW')
    expect(riskLevelForScore(500)).toBe('SEVERE')
  })
})

describe('decideFromScore', () => {
  it('allows below the review threshold', () => {
    expect(decideFromScore(DECISION_THRESHOLDS.review - 1)).toBe('ALLOW')
  })

  it('reviews at the threshold', () => {
    expect(decideFromScore(DECISION_THRESHOLDS.review)).toBe('REVIEW')
  })

  it('blocks at the block threshold', () => {
    expect(decideFromScore(DECISION_THRESHOLDS.block)).toBe('BLOCK')
  })

  it('blocks on a hard block regardless of score', () => {
    // A designation is a legal prohibition, not a risk-appetite question.
    expect(decideFromScore(0, true)).toBe('BLOCK')
  })
})

describe('highestSeverity', () => {
  it('returns LOW for no signals', () => {
    expect(highestSeverity([])).toBe('LOW')
  })

  it('returns the worst severity present regardless of score', () => {
    expect(highestSeverity([signal(90, 'MEDIUM'), signal(10, 'SEVERE')])).toBe('SEVERE')
  })
})

describe('sortSignals', () => {
  it('orders by severity first, then score', () => {
    const sorted = sortSignals([
      signal(90, 'MEDIUM'),
      signal(10, 'SEVERE'),
      signal(40, 'HIGH'),
      signal(95, 'MEDIUM'),
    ])
    expect(sorted.map((s) => [s.severity, s.score])).toEqual([
      ['SEVERE', 10],
      ['HIGH', 40],
      ['MEDIUM', 95],
      ['MEDIUM', 90],
    ])
  })

  it('does not mutate its input', () => {
    const signals = [signal(10, 'MEDIUM'), signal(90, 'SEVERE')]
    const snapshot = [...signals]
    sortSignals(signals)
    expect(signals).toEqual(snapshot)
  })
})
