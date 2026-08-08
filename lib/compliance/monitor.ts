/**
 * Screening orchestrator — the single entry point for transaction monitoring.
 *
 * Callers hand it a transaction and get back a decision.  Everything else —
 * which vendor answered, how signals were scored, whether a case was opened,
 * what got written to the ledger — is this module's business.  Payment routes
 * must never assemble their own view of risk; a control implemented twice is a
 * control implemented differently.
 *
 * Order of operations, and why:
 *
 *   1. Sanctions and wallet screening run **concurrently**.  They are
 *      independent network calls and this sits in a payment path.
 *   2. Velocity rules run against the ledger, which does not yet contain the
 *      subject transaction.
 *   3. Signals are scored into one decision (lib/compliance/risk.ts).
 *   4. A case is opened for anything not ALLOW.
 *   5. The transaction is recorded in the ledger **including when blocked** —
 *      a blocked attempt is evidence of behaviour, and omitting it would make
 *      a probing account look quieter than it is.
 *
 * Failure behaviour:
 *   A provider that errors or times out never produces a clean result.  It
 *   raises PROVIDER_UNAVAILABLE, the local list is still consulted so
 *   designations are caught during an outage, and under FAIL_CLOSED the
 *   transaction is held for review rather than allowed through unscreened.
 */

import { FAIL_CLOSED, NAME_SCREENING } from './config'
import { openCase } from './case-store'
import { hashCounterparty, recordTransaction } from './ledger'
import {
  getNameScreeningProvider,
  getWalletRiskProvider,
  localNameProvider,
  localWalletProvider,
} from './providers'
import { decideFromScore, riskLevelForScore, scoreSignals, sortSignals } from './risk'
import type {
  NameMatch,
  ProviderAttribution,
  RiskSignal,
  ScreeningResult,
  ScreeningSubject,
  WalletRiskResult,
} from './types'
import { evaluateVelocityRules } from './velocity'

export interface ScreenOptions {
  /** Evaluation time.  Injectable so tests need no clock control. */
  now?: Date
  /**
   * Skip the ledger write.  For re-screening an existing transaction (a
   * periodic re-check against updated lists) where a second entry would
   * double-count it in every velocity rule.
   */
  skipLedger?: boolean
}

/**
 * Screens a transaction and returns the decision.
 *
 * Never throws for compliance reasons — a BLOCK is a return value, not an
 * exception, so the caller decides how to surface it to the user.  It can
 * still throw on programmer error (missing COMPLIANCE_HASH_SALT, an
 * unconfigured provider), which are startup faults rather than screening
 * outcomes.
 */
export async function screenTransaction(
  subject: ScreeningSubject,
  { now = new Date(), skipLedger = false }: ScreenOptions = {}
): Promise<ScreeningResult> {
  const signals: RiskSignal[] = []
  const providers: ProviderAttribution[] = []

  // -- 1. External screening, concurrently -----------------------------------
  const [walletOutcome, nameOutcome] = await Promise.all([
    subject.walletAddress
      ? screenWallet(subject.walletAddress, subject.chain, providers)
      : Promise.resolve(null),
    subject.accountName
      ? screenName(subject.accountName, subject.jurisdiction, providers)
      : Promise.resolve(null),
  ])

  if (walletOutcome) signals.push(...walletSignals(walletOutcome))
  if (nameOutcome) signals.push(...nameSignals(nameOutcome))

  // -- 2. Velocity -----------------------------------------------------------
  signals.push(...evaluateVelocityRules(subject, { now }))

  // -- 3. Score and decide ---------------------------------------------------
  const sorted = sortSignals(signals)
  const riskScore = scoreSignals(sorted)
  const riskLevel = riskLevelForScore(riskScore)

  // A designation is a legal prohibition, not a risk appetite question, so it
  // bypasses the score thresholds entirely.
  const hardBlock = sorted.some(
    (s) =>
      (s.code === 'SANCTIONS_MATCH' && s.severity === 'SEVERE') ||
      (s.code === 'WALLET_SEVERE_RISK' && s.metadata?.sanctioned === true)
  )

  let decision = decideFromScore(riskScore, hardBlock)

  // Fail closed: an unscreened transaction is not an approved one.
  const providerFailed = sorted.some((s) => s.code === 'PROVIDER_UNAVAILABLE')
  if (FAIL_CLOSED && providerFailed && decision === 'ALLOW') {
    decision = 'REVIEW'
  }

  const result: Omit<ScreeningResult, 'caseId'> = {
    transactionId: subject.transactionId,
    userId: subject.userId,
    decision,
    riskScore,
    riskLevel,
    signals: sorted,
    providers,
    screenedAt: now.toISOString(),
  }

  // -- 4. Open a case for anything held or blocked ---------------------------
  const caseId = decision === 'ALLOW' ? undefined : openCase(subject, result).id

  // -- 5. Record the attempt, whatever the outcome ---------------------------
  if (!skipLedger) {
    recordTransaction({
      transactionId: subject.transactionId,
      userId: subject.userId,
      kind: subject.kind,
      amountCents: subject.amountCents,
      asset: subject.asset,
      chain: subject.chain,
      counterpartyKey: subject.counterpartyId
        ? hashCounterparty(subject.counterpartyId)
        : undefined,
      decision,
      riskScore,
      occurredAt: now,
    })
  }

  return { ...result, caseId }
}

// ---------------------------------------------------------------------------
// Wallet screening
// ---------------------------------------------------------------------------

interface WalletOutcome {
  result: WalletRiskResult | null
  failed: boolean
  error?: string
}

/**
 * Screens an address with the configured vendor, falling back to the local
 * list.
 *
 * The fallback is not a substitute — see the note in providers/local.ts.  When
 * the vendor fails, `failed` stays true even if the local list came back
 * clean, so PROVIDER_UNAVAILABLE is raised and the transaction is held.
 */
async function screenWallet(
  address: string,
  chain: string,
  providers: ProviderAttribution[]
): Promise<WalletOutcome> {
  const provider = getWalletRiskProvider()
  const startedAt = Date.now()

  try {
    const result = await provider.screenWallet(address, chain)
    providers.push({
      name: provider.name,
      kind: 'wallet',
      ok: true,
      latencyMs: Date.now() - startedAt,
      reference: result.reference,
    })
    return { result, failed: false }
  } catch (error) {
    providers.push({
      name: provider.name,
      kind: 'wallet',
      ok: false,
      latencyMs: Date.now() - startedAt,
    })

    // Still consult the local list — a designated address must be caught even
    // while the vendor is down.
    let fallback: WalletRiskResult | null = null
    try {
      fallback = await localWalletProvider.screenWallet(address, chain)
      providers.push({
        name: localWalletProvider.name,
        kind: 'wallet',
        ok: true,
        latencyMs: Date.now() - startedAt,
      })
    } catch {
      // The local list is in-process; a failure here means the corpus itself is
      // broken, which the health endpoint surfaces separately.
    }

    return {
      result: fallback,
      failed: true,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

function walletSignals(outcome: WalletOutcome): RiskSignal[] {
  const signals: RiskSignal[] = []

  if (outcome.failed) {
    signals.push({
      code: 'PROVIDER_UNAVAILABLE',
      severity: 'MEDIUM',
      // Scored just under DECISION_THRESHOLDS.review: an outage alone should
      // hold the transaction (via FAIL_CLOSED) without also inflating the risk
      // score of an otherwise unremarkable account, which would distort the
      // queue ordering analysts triage by.
      score: 45,
      description: `Wallet risk provider unavailable — ${outcome.error ?? 'unknown error'}`,
      metadata: { failedCheck: 'wallet', error: outcome.error },
    })
  }

  const result = outcome.result
  if (!result) return signals

  if (result.sanctioned) {
    signals.push({
      code: 'WALLET_SEVERE_RISK',
      severity: 'SEVERE',
      score: 100,
      description: `Counterparty address is on a sanctions list`,
      metadata: {
        sanctioned: true,
        address: result.address,
        categories: result.categories,
        reference: result.reference,
      },
    })
    return signals
  }

  if (result.riskLevel === 'SEVERE' || result.riskLevel === 'HIGH') {
    signals.push({
      code: result.riskLevel === 'SEVERE' ? 'WALLET_SEVERE_RISK' : 'WALLET_HIGH_RISK',
      severity: result.riskLevel,
      score: result.riskScore,
      description: `Address rated ${result.riskLevel} — ${result.categories.join(', ') || 'no categories returned'}`,
      metadata: {
        sanctioned: false,
        address: result.address,
        providerScore: result.riskScore,
        categories: result.categories,
        reference: result.reference,
      },
    })
  } else if (result.riskLevel === 'MEDIUM') {
    signals.push({
      code: 'WALLET_MEDIUM_RISK',
      severity: 'MEDIUM',
      score: result.riskScore,
      description: `Address rated MEDIUM — ${result.categories.join(', ') || 'no categories returned'}`,
      metadata: {
        address: result.address,
        providerScore: result.riskScore,
        categories: result.categories,
      },
    })
  }

  return signals
}

// ---------------------------------------------------------------------------
// Name screening
// ---------------------------------------------------------------------------

interface NameOutcome {
  matches: NameMatch[]
  failed: boolean
  error?: string
  reference?: string
}

async function screenName(
  name: string,
  jurisdiction: string,
  providers: ProviderAttribution[]
): Promise<NameOutcome> {
  const provider = getNameScreeningProvider()
  const startedAt = Date.now()

  try {
    const result = await provider.screenName(name, { country: jurisdiction })
    providers.push({
      name: provider.name,
      kind: 'name',
      ok: true,
      latencyMs: Date.now() - startedAt,
      reference: result.reference,
    })
    return { matches: result.matches, failed: false, reference: result.reference }
  } catch (error) {
    providers.push({
      name: provider.name,
      kind: 'name',
      ok: false,
      latencyMs: Date.now() - startedAt,
    })

    let fallbackMatches: NameMatch[] = []
    try {
      const fallback = await localNameProvider.screenName(name)
      fallbackMatches = fallback.matches
      providers.push({
        name: localNameProvider.name,
        kind: 'name',
        ok: true,
        latencyMs: Date.now() - startedAt,
      })
    } catch {
      // See the equivalent note in screenWallet().
    }

    return {
      matches: fallbackMatches,
      failed: true,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Turns name hits into signals.
 *
 * Only the strongest hit of each class becomes a signal.  A common name can
 * return dozens of list entries, and emitting one signal each would let match
 * *quantity* dominate the aggregate score over match *quality* — five weak
 * homonyms would outrank one near-exact designation. Every hit is still
 * carried in metadata for the analyst.
 */
function nameSignals(outcome: NameOutcome): RiskSignal[] {
  const signals: RiskSignal[] = []

  if (outcome.failed) {
    signals.push({
      code: 'PROVIDER_UNAVAILABLE',
      severity: 'MEDIUM',
      score: 45,
      description: `Name screening provider unavailable — ${outcome.error ?? 'unknown error'}`,
      metadata: { failedCheck: 'name', error: outcome.error },
    })
  }

  const strongest = (type: NameMatch['matchTypes'][number]) =>
    outcome.matches
      .filter((m) => m.matchTypes.includes(type))
      .sort((a, b) => b.matchScore - a.matchScore)[0]

  const sanction = strongest('SANCTION')
  if (sanction) {
    // Above strongMatchThreshold the hit is near-exact and blocks; between the
    // two thresholds a human decides, so it scores into REVIEW rather than
    // BLOCK. Auto-blocking every fuzzy homonym would strand legitimate
    // customers who share a name with a designated person — a real and
    // frequent occurrence, not a hypothetical.
    const strong = sanction.matchScore >= NAME_SCREENING.strongMatchThreshold
    signals.push({
      code: 'SANCTIONS_MATCH',
      severity: strong ? 'SEVERE' : 'HIGH',
      score: strong ? 100 : 70,
      description: `Account name matches "${sanction.name}" on ${sanction.listName} at ${(sanction.matchScore * 100).toFixed(0)}% confidence`,
      metadata: {
        matchScore: sanction.matchScore,
        entityId: sanction.entityId,
        listName: sanction.listName,
        strongMatch: strong,
        allMatches: outcome.matches,
        providerReference: outcome.reference,
      },
    })
  }

  const pep = strongest('PEP')
  if (pep) {
    signals.push({
      code: 'PEP_MATCH',
      severity: 'MEDIUM',
      // A PEP is not a criminal — the obligation is enhanced due diligence, not
      // refusal — so this scores to review, never to block.
      score: 40,
      description: `Account name matches politically exposed person "${pep.name}" at ${(pep.matchScore * 100).toFixed(0)}% confidence`,
      metadata: {
        matchScore: pep.matchScore,
        entityId: pep.entityId,
        listName: pep.listName,
        countries: pep.countries,
      },
    })
  }

  const media = strongest('ADVERSE_MEDIA')
  if (media) {
    signals.push({
      code: 'ADVERSE_MEDIA',
      severity: 'MEDIUM',
      score: 30,
      description: `Adverse media match on "${media.name}" at ${(media.matchScore * 100).toFixed(0)}% confidence`,
      metadata: {
        matchScore: media.matchScore,
        entityId: media.entityId,
        listName: media.listName,
      },
    })
  }

  return signals
}
