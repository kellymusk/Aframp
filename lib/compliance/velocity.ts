/**
 * Velocity rules — behavioural transaction monitoring.
 *
 * Each rule is a pure function of (subject, ledger history, config) → signal or
 * null.  Pure because rules get argued about: an analyst clearing a case, or a
 * regulator reviewing the model, must be able to reproduce exactly why a
 * transaction fired, and every rule below returns the observed values and the
 * threshold it breached in `metadata` for precisely that reason.
 *
 * The rules target the three classic laundering stages as they present on a
 * crypto ramp:
 *
 *   Placement  — STRUCTURING, NEW_ACCOUNT_HIGH_VALUE, DORMANT_REACTIVATION
 *   Layering   — RAPID_RAMP_REVERSAL, COUNTERPARTY_FANOUT
 *   Volume     — VELOCITY_TX_COUNT, VELOCITY_VOLUME, VELOCITY_SPIKE
 *
 * None of them is decisive alone.  That is by design: a single velocity signal
 * scores below DECISION_THRESHOLDS.review, so it takes either a severe signal
 * or corroboration between rules to hold a payment.  See scoreSignals().
 */

import { DAY_MS, VELOCITY_RULES } from './config'
import { policyFor } from './markets'
import {
  getDistinctCounterparties,
  getEntriesInWindow,
  getFirstEntry,
  getLastEntryBefore,
  getWindowTotals,
  type LedgerEntry,
} from './ledger'
import type { RiskSignal, ScreeningSubject } from './types'

export interface VelocityContext {
  /** Evaluation time.  Injectable so rules are testable without a fake clock. */
  now?: Date
}

/**
 * Runs every enabled rule and returns the signals that fired.
 *
 * The subject transaction is *not* yet in the ledger when this runs — it is
 * recorded after screening completes, so that a blocked transaction still
 * lands in the history.  Rules that need to include the current transaction in
 * a total therefore add `subject.amountCents` explicitly; this is easy to get
 * wrong in one direction (a rule that silently excludes the transaction it is
 * judging) so each such rule says so at its call site.
 */
export function evaluateVelocityRules(
  subject: ScreeningSubject,
  { now = new Date() }: VelocityContext = {}
): RiskSignal[] {
  const signals: RiskSignal[] = []

  const rules = [
    checkTransactionCount,
    checkVolume,
    checkVolumeSpike,
    checkStructuring,
    checkRapidReversal,
    checkCounterpartyFanout,
    checkNewAccountHighValue,
    checkDormantReactivation,
  ]

  for (const rule of rules) {
    const signal = rule(subject, now)
    if (signal) signals.push(signal)
  }

  return signals
}

// ---------------------------------------------------------------------------
// Volume and frequency
// ---------------------------------------------------------------------------

/** More transactions in the window than a retail user plausibly makes. */
function checkTransactionCount(subject: ScreeningSubject, now: Date): RiskSignal | null {
  const rule = VELOCITY_RULES.txCount
  if (!rule.enabled) return null

  const { count } = getWindowTotals(subject.userId, { windowMs: rule.windowMs, now })
  // +1 for the transaction being screened, which is not in the ledger yet.
  const withCurrent = count + 1
  if (withCurrent <= rule.maxCount) return null

  return {
    code: 'VELOCITY_TX_COUNT',
    severity: 'MEDIUM',
    score: rule.score,
    description: `${withCurrent} transactions in ${hours(rule.windowMs)}h (threshold ${rule.maxCount})`,
    metadata: {
      observedCount: withCurrent,
      threshold: rule.maxCount,
      windowHours: hours(rule.windowMs),
    },
  }
}

/** Throughput in the window above the configured ceiling. */
function checkVolume(subject: ScreeningSubject, now: Date): RiskSignal | null {
  const rule = VELOCITY_RULES.volume
  if (!rule.enabled) return null

  const { volumeCents } = getWindowTotals(subject.userId, { windowMs: rule.windowMs, now })
  // Includes the transaction being screened — the point is whether letting it
  // through would breach the ceiling, not whether history already has.
  const withCurrent = volumeCents + subject.amountCents
  if (withCurrent <= rule.maxVolumeCents) return null

  return {
    code: 'VELOCITY_VOLUME',
    severity: 'HIGH',
    score: rule.score,
    description: `${usd(withCurrent)} moved in ${hours(rule.windowMs)}h (threshold ${usd(rule.maxVolumeCents)})`,
    metadata: {
      observedVolumeCents: withCurrent,
      thresholdCents: rule.maxVolumeCents,
      windowHours: hours(rule.windowMs),
    },
  }
}

/**
 * Today's volume far above the account's own trailing average.
 *
 * Relative rather than absolute, so it catches an account whose normal is $50
 * suddenly moving $900 — under the absolute ceiling, but a tenfold change in
 * behaviour.  Absolute limits alone are exactly what a competent launderer
 * sizes their transactions against.
 */
function checkVolumeSpike(subject: ScreeningSubject, now: Date): RiskSignal | null {
  const rule = VELOCITY_RULES.spike
  if (!rule.enabled) return null

  const first = getFirstEntry(subject.userId)
  if (!first) return null

  // Not enough history for "normal" to mean anything yet.  Firing here would
  // flag every legitimate second transaction a new user makes.
  const historyDays = (now.getTime() - first.occurredAt.getTime()) / DAY_MS
  if (historyDays < rule.minHistoryDays) return null

  const baseline = getWindowTotals(subject.userId, { windowMs: rule.baselineMs, now })
  if (baseline.volumeCents < rule.minBaselineCents) return null

  const recent = getWindowTotals(subject.userId, { windowMs: rule.windowMs, now })
  const todayCents = recent.volumeCents + subject.amountCents

  // Baseline excludes the current window so a spike is not compared against
  // itself, which would flatten the ratio and hide exactly what we're after.
  const baselineExcludingToday = Math.max(0, baseline.volumeCents - recent.volumeCents)
  const baselineDays = Math.max(1, (rule.baselineMs - rule.windowMs) / DAY_MS)
  const dailyMean = baselineExcludingToday / baselineDays

  if (dailyMean <= 0) return null
  const ratio = todayCents / dailyMean
  if (ratio < rule.multiplier) return null

  return {
    code: 'VELOCITY_SPIKE',
    severity: 'HIGH',
    score: rule.score,
    description: `${usd(todayCents)} today is ${ratio.toFixed(1)}× this account's ${usd(Math.round(dailyMean))} daily average`,
    metadata: {
      todayCents,
      dailyMeanCents: Math.round(dailyMean),
      ratio: Number(ratio.toFixed(2)),
      multiplierThreshold: rule.multiplier,
      baselineDays: Math.round(baselineDays),
    },
  }
}

// ---------------------------------------------------------------------------
// Structuring
// ---------------------------------------------------------------------------

/**
 * Repeated transactions sized just under the reporting threshold.
 *
 * Deliberately splitting a reportable amount into sub-threshold pieces is an
 * offence in its own right in all five markets, independent of whether the
 * underlying funds are criminal — so this rule is scored highly.
 *
 * Both legs are required: transactions must cluster in the band *and* sum to
 * at least the threshold.  A trader who habitually moves similar amounts trips
 * the first leg constantly; only someone reassembling a reportable total trips
 * both.
 */
function checkStructuring(subject: ScreeningSubject, now: Date): RiskSignal | null {
  const rule = VELOCITY_RULES.structuring
  if (!rule.enabled) return null

  const policy = policyFor(subject.jurisdiction)
  const threshold = policy.reportingThresholdCents
  const bandFloor = threshold * (1 - rule.bandPct)

  const inBand = (amount: number) => amount >= bandFloor && amount < threshold
  if (!inBand(subject.amountCents)) return null

  const history = getEntriesInWindow(subject.userId, { windowMs: rule.windowMs, now })
  const banded = history.filter((e) => inBand(e.amountCents))

  const count = banded.length + 1 // includes the transaction being screened
  if (count < rule.minCount) return null

  const total = banded.reduce((sum, e) => sum + e.amountCents, 0) + subject.amountCents
  if (total < threshold) return null

  return {
    code: 'STRUCTURING',
    severity: 'HIGH',
    score: rule.score,
    description: `${count} transactions of ${usd(Math.round(total / count))}–ish just below the ${subject.jurisdiction} reporting threshold of ${usd(threshold)}, totalling ${usd(total)}`,
    metadata: {
      bandedCount: count,
      totalCents: total,
      reportingThresholdCents: threshold,
      bandFloorCents: Math.round(bandFloor),
      windowDays: Math.round(rule.windowMs / DAY_MS),
      jurisdiction: subject.jurisdiction,
      localThresholdNote: policy.localThresholdNote,
    },
  }
}

// ---------------------------------------------------------------------------
// Layering
// ---------------------------------------------------------------------------

/**
 * An onramp reversed by an offramp of similar size, or vice versa, within
 * hours.
 *
 * Round-tripping fiat → crypto → fiat pays the spread twice and gains the user
 * nothing, so there is rarely an economic reason to do it. There is a
 * laundering reason: it puts a blockchain hop between the source account and
 * the destination one.
 */
function checkRapidReversal(subject: ScreeningSubject, now: Date): RiskSignal | null {
  const rule = VELOCITY_RULES.rapidReversal
  if (!rule.enabled) return null
  if (subject.amountCents < rule.minAmountCents) return null
  if (subject.kind === 'billpay') return null

  const opposite = subject.kind === 'onramp' ? 'offramp' : 'onramp'
  const history = getEntriesInWindow(subject.userId, { windowMs: rule.windowMs, now })

  const counterpart = history.find(
    (e) => e.kind === opposite && withinTolerance(e.amountCents, subject.amountCents, rule.valueTolerance)
  )
  if (!counterpart) return null

  const gapMinutes = Math.round((now.getTime() - counterpart.occurredAt.getTime()) / 60_000)

  return {
    code: 'RAPID_RAMP_REVERSAL',
    severity: 'HIGH',
    score: rule.score,
    description: `${subject.kind} of ${usd(subject.amountCents)} reverses a ${opposite} of ${usd(counterpart.amountCents)} made ${gapMinutes} minutes earlier`,
    metadata: {
      counterpartTransactionId: counterpart.transactionId,
      counterpartAmountCents: counterpart.amountCents,
      counterpartKind: opposite,
      gapMinutes,
      windowHours: hours(rule.windowMs),
    },
  }
}

/**
 * Value fanned out across an implausible number of distinct recipients.
 *
 * The mirror image of structuring: rather than splitting the input, the output
 * is split across mule accounts.
 */
function checkCounterpartyFanout(subject: ScreeningSubject, now: Date): RiskSignal | null {
  const rule = VELOCITY_RULES.counterpartyFanout
  if (!rule.enabled) return null

  const keys = getDistinctCounterparties(subject.userId, { windowMs: rule.windowMs, now })
  // The current counterparty may be new; count it without double-counting a
  // repeat, which is what makes this a *distinct* recipient measure.
  if (subject.counterpartyId) keys.add(subject.counterpartyId)

  if (keys.size <= rule.maxCounterparties) return null

  return {
    code: 'COUNTERPARTY_FANOUT',
    severity: 'MEDIUM',
    score: rule.score,
    description: `${keys.size} distinct counterparties in ${hours(rule.windowMs)}h (threshold ${rule.maxCounterparties})`,
    metadata: {
      distinctCounterparties: keys.size,
      threshold: rule.maxCounterparties,
      windowHours: hours(rule.windowMs),
    },
  }
}

// ---------------------------------------------------------------------------
// Account lifecycle
// ---------------------------------------------------------------------------

/** A large transaction before the account has any track record. */
function checkNewAccountHighValue(subject: ScreeningSubject, now: Date): RiskSignal | null {
  const rule = VELOCITY_RULES.newAccountHighValue
  if (!rule.enabled) return null
  if (subject.amountCents < rule.minAmountCents) return null

  // Prefer the real account creation date; fall back to first observed
  // activity, which is all the ledger knows about accounts predating it.
  const createdAt = subject.accountCreatedAt ?? getFirstEntry(subject.userId)?.occurredAt
  if (!createdAt) {
    // No history at all — this is the account's first transaction, and it is
    // over the threshold.
    return newAccountSignal(subject, 0, rule)
  }

  const ageMs = now.getTime() - createdAt.getTime()
  if (ageMs > rule.windowMs) return null

  return newAccountSignal(subject, ageMs, rule)
}

function newAccountSignal(
  subject: ScreeningSubject,
  ageMs: number,
  rule: typeof VELOCITY_RULES.newAccountHighValue
): RiskSignal {
  const ageDays = Math.floor(ageMs / DAY_MS)
  return {
    code: 'NEW_ACCOUNT_HIGH_VALUE',
    severity: 'MEDIUM',
    score: rule.score,
    description: `${usd(subject.amountCents)} on an account ${ageDays === 0 ? 'created today' : `${ageDays} days old`}`,
    metadata: {
      amountCents: subject.amountCents,
      accountAgeDays: ageDays,
      thresholdCents: rule.minAmountCents,
      maxAgeDays: Math.round(rule.windowMs / DAY_MS),
    },
  }
}

/**
 * A significant transaction after a long silence.
 *
 * Dormant accounts get bought, phished or coerced; a sudden reactivation at
 * value is a recognised mule pattern rather than a quirk.
 */
function checkDormantReactivation(subject: ScreeningSubject, now: Date): RiskSignal | null {
  const rule = VELOCITY_RULES.dormantReactivation
  if (!rule.enabled) return null
  if (subject.amountCents < rule.minAmountCents) return null

  const last = getLastEntryBefore(subject.userId, now)
  if (!last) return null // no prior activity is newness, not dormancy

  const gapMs = now.getTime() - last.occurredAt.getTime()
  if (gapMs < rule.dormancyMs) return null

  const gapDays = Math.floor(gapMs / DAY_MS)

  return {
    code: 'DORMANT_REACTIVATION',
    severity: 'MEDIUM',
    score: rule.score,
    description: `${usd(subject.amountCents)} after ${gapDays} days of inactivity`,
    metadata: {
      amountCents: subject.amountCents,
      dormantDays: gapDays,
      dormancyThresholdDays: Math.round(rule.dormancyMs / DAY_MS),
      lastTransactionId: last.transactionId,
    },
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function withinTolerance(a: number, b: number, tolerance: number): boolean {
  if (b === 0) return a === 0
  return Math.abs(a - b) / b <= tolerance
}

function hours(ms: number): number {
  return Math.round(ms / 3_600_000)
}

/** Formats cents for analyst-facing signal text. */
function usd(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/** Exported for the ledger-shaped fixtures velocity tests build. */
export type { LedgerEntry }
