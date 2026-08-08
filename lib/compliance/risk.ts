/**
 * Risk aggregation — turns a bag of signals into one score, level and decision.
 *
 * Isolated from the orchestrator so the scoring model can be unit-tested and
 * reasoned about on its own.  Examiners ask how a score is produced; the answer
 * needs to fit on one page, which is this file.
 */

import { DECISION_THRESHOLDS, RISK_BANDS, SECONDARY_SIGNAL_WEIGHT } from './config'
import {
  RISK_LEVEL_RANK,
  type RiskLevel,
  type RiskSignal,
  type ScreeningDecision,
} from './types'

/**
 * Aggregates signal scores into a single 0–100 figure.
 *
 * The model is "strongest signal, plus a discounted contribution from the
 * rest", capped at 100:
 *
 *   score = max(s) + SECONDARY_SIGNAL_WEIGHT × Σ(remaining s)
 *
 * A plain sum was rejected because three unremarkable MEDIUM signals would
 * outrank one sanctions-adjacent HIGH one, and analysts end up triaging noise
 * ahead of danger.  Taking the max alone was also rejected: corroboration is
 * genuinely evidence, and an account tripping four rules at once deserves to
 * outrank one tripping a single rule of the same severity.  The discounted sum
 * keeps the ordering dominated by the worst thing observed while still letting
 * corroboration escalate a case across a band boundary.
 *
 * The function is order-independent and monotone — adding a signal can never
 * lower the score, which is the property that makes the model defensible.
 */
export function scoreSignals(signals: RiskSignal[]): number {
  if (signals.length === 0) return 0

  const scores = signals.map((s) => clamp(s.score, 0, 100)).sort((a, b) => b - a)
  const [highest, ...rest] = scores
  const secondary = rest.reduce((sum, s) => sum + s, 0) * SECONDARY_SIGNAL_WEIGHT

  return Math.min(100, Math.round(highest + secondary))
}

/** Maps an aggregate score onto its band.  Bands are lower-inclusive. */
export function riskLevelForScore(score: number): RiskLevel {
  const clamped = clamp(score, 0, 100)
  // RISK_BANDS is ordered highest-first, so the first match is the tightest.
  const band = RISK_BANDS.find((b) => clamped >= b.min)
  return band?.level ?? 'LOW'
}

/**
 * Chooses ALLOW / REVIEW / BLOCK.
 *
 * `hardBlock` is set by the caller for conditions that are not a matter of
 * accumulated score — a confirmed sanctions match, or a provider verdict that
 * the counterparty address is itself sanctioned.  Those are legal
 * prohibitions rather than risk appetite, so they bypass the thresholds.
 */
export function decideFromScore(score: number, hardBlock = false): ScreeningDecision {
  if (hardBlock) return 'BLOCK'
  if (score >= DECISION_THRESHOLDS.block) return 'BLOCK'
  if (score >= DECISION_THRESHOLDS.review) return 'REVIEW'
  return 'ALLOW'
}

/** The most severe level present, or LOW for an empty set. */
export function highestSeverity(signals: RiskSignal[]): RiskLevel {
  return signals.reduce<RiskLevel>(
    (worst, s) => (RISK_LEVEL_RANK[s.severity] > RISK_LEVEL_RANK[worst] ? s.severity : worst),
    'LOW'
  )
}

/** Sorts most-severe-first, then by score — the order analysts read them in. */
export function sortSignals(signals: RiskSignal[]): RiskSignal[] {
  return [...signals].sort((a, b) => {
    const bySeverity = RISK_LEVEL_RANK[b.severity] - RISK_LEVEL_RANK[a.severity]
    return bySeverity !== 0 ? bySeverity : b.score - a.score
  })
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}
