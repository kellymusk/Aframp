/**
 * PEP screening engine.
 *
 * In production: replace `fetchPepDatabase()` with a call to
 * Dow Jones / Refinitiv / ComplyAdvantage API.
 * The rest of the scoring, audit, and EDD logic is provider-agnostic.
 */

import {
  compositeRiskScore,
  riskLevel,
  type AuditLogEntry,
  type EddRecord,
  type PepCandidate,
  type PepMatch,
  type PepScreeningResult,
} from './types'
import { matchName, normaliseName } from './fuzzy-match'

// ── In-memory stores (replace with DB in production) ─────────────────────────
const screeningResults = new Map<string, PepScreeningResult>()
const eddRecords = new Map<string, EddRecord>()
const auditLog: AuditLogEntry[] = []

// ── Configurable thresholds ───────────────────────────────────────────────────
const MATCH_THRESHOLD = 0.82   // minimum Jaro-Winkler score to surface a match
const AUTO_CLEAR_THRESHOLD = 0.70 // below this → auto false-positive (contextual filter)
const EDD_RISK_THRESHOLD = 60  // risk score ≥ this triggers EDD

// ── Audit helper ──────────────────────────────────────────────────────────────
function audit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) {
  auditLog.push({ id: `audit-${Date.now()}-${Math.random()}`, timestamp: Date.now(), ...entry })
}

// ── PEP database fetch ────────────────────────────────────────────────────────
/**
 * Fetch PEP candidates from the configured provider.
 * Falls back to a minimal built-in sample list when no API key is set.
 */
async function fetchPepDatabase(): Promise<PepCandidate[]> {
  const env = (typeof process !== 'undefined' ? process : {}) as Record<string, unknown> & { env?: Record<string, string> }
  const apiKey = env.env?.PEP_PROVIDER_API_KEY

  if (apiKey) {
    const baseUrl = env.env?.PEP_PROVIDER_URL ?? 'https://api.example-pep-provider.com'
    const res = await fetch(`${baseUrl}/v1/pep-list`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok) throw new Error(`PEP provider error: ${res.status}`)
    return res.json() as Promise<PepCandidate[]>
  }

  // Development / demo fallback — representative sample
  return SAMPLE_PEP_DB
}

// ── Core screening ────────────────────────────────────────────────────────────
export async function screenPep(
  walletAddress: string,
  fullName: string,
  performedBy: 'system' | string = 'system'
): Promise<PepScreeningResult> {
  audit({ action: 'screening_initiated', walletAddress, performedBy, detail: `Screening: ${fullName}` })

  const db = await fetchPepDatabase()
  const normQuery = normaliseName(fullName)

  const matches: PepMatch[] = []

  for (const candidate of db) {
    const similarity = matchName(
      normQuery,
      normaliseName(candidate.fullName),
      candidate.aliases.map(normaliseName)
    )

    if (similarity < AUTO_CLEAR_THRESHOLD) continue // contextual filter — suppress low matches

    const risk = compositeRiskScore(
      similarity,
      candidate.influenceLevel,
      candidate.relationshipType,
      candidate.cpiScore
    )

    const status = similarity < MATCH_THRESHOLD ? 'false_positive' : 'potential'

    matches.push({ candidate, similarityScore: similarity, riskScore: risk, status })
  }

  // Sort by risk descending
  matches.sort((a, b) => b.riskScore - a.riskScore)

  const topScore = matches[0]?.riskScore ?? 0
  const level = riskLevel(topScore)
  const requiresEdd = topScore >= EDD_RISK_THRESHOLD

  const result: PepScreeningResult = {
    id: `pep-${Date.now()}-${walletAddress.slice(0, 6)}`,
    walletAddress,
    fullName,
    screenedAt: Date.now(),
    matches,
    riskScore: topScore,
    riskLevel: level,
    requiresEdd,
    status: matches.length === 0 ? 'cleared' : matches[0].status,
  }

  screeningResults.set(result.id, result)

  if (matches.length > 0) {
    audit({
      action: 'match_found',
      walletAddress,
      performedBy,
      detail: `${matches.length} match(es). Top risk: ${topScore} (${level})`,
      resultId: result.id,
    })
  }

  // Auto-create EDD task for high-risk matches
  if (requiresEdd) {
    await createEddRecord(walletAddress, result.id)
  }

  return result
}

// ── EDD ───────────────────────────────────────────────────────────────────────
export async function createEddRecord(
  walletAddress: string,
  screeningResultId: string
): Promise<EddRecord> {
  const edd: EddRecord = {
    id: `edd-${Date.now()}-${walletAddress.slice(0, 6)}`,
    walletAddress,
    screeningResultId,
    status: 'pending',
    supportingDocs: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  eddRecords.set(edd.id, edd)
  audit({ action: 'edd_created', walletAddress, performedBy: 'system', detail: `EDD task created`, resultId: screeningResultId })
  return edd
}

export async function updateEddRecord(
  eddId: string,
  update: Partial<Pick<EddRecord, 'status' | 'sourceOfWealth' | 'sourceOfFunds' | 'supportingDocs' | 'assignedTo' | 'signOffBy'>>,
  performedBy: string
): Promise<EddRecord | null> {
  const edd = eddRecords.get(eddId)
  if (!edd) return null

  Object.assign(edd, update, { updatedAt: Date.now() })
  if (update.status === 'approved' || update.status === 'rejected') {
    edd.signOffAt = Date.now()
    audit({
      action: update.status === 'approved' ? 'edd_approved' : 'edd_rejected',
      walletAddress: edd.walletAddress,
      performedBy,
      detail: `EDD ${update.status} by ${performedBy}`,
      resultId: edd.screeningResultId,
    })
  }
  return edd
}

// ── Manual review ─────────────────────────────────────────────────────────────
export async function resolveScreeningResult(
  resultId: string,
  status: 'confirmed' | 'false_positive' | 'cleared',
  reviewedBy: string,
  note: string
): Promise<PepScreeningResult | null> {
  const result = screeningResults.get(resultId)
  if (!result) return null

  result.status = status
  result.reviewedBy = reviewedBy
  result.reviewedAt = Date.now()
  result.reviewNote = note

  audit({
    action: status === 'false_positive' ? 'false_positive_resolved' : 'manual_review',
    walletAddress: result.walletAddress,
    performedBy: reviewedBy,
    detail: `Status set to ${status}. Note: ${note}`,
    resultId,
  })

  return result
}

// ── Getters ───────────────────────────────────────────────────────────────────
export function getScreeningResult(id: string) { return screeningResults.get(id) ?? null }
export function getScreeningResultByWallet(wallet: string) {
  return [...screeningResults.values()].filter((r) => r.walletAddress === wallet)
}
export function getEddRecord(id: string) { return eddRecords.get(id) ?? null }
export function getEddByWallet(wallet: string) {
  return [...eddRecords.values()].filter((r) => r.walletAddress === wallet)
}
export function getPendingEdd() {
  return [...eddRecords.values()].filter((r) => r.status === 'pending' || r.status === 'in_review')
}
export function getAuditLog(walletAddress?: string) {
  return walletAddress ? auditLog.filter((e) => e.walletAddress === walletAddress) : [...auditLog]
}

// ── Nightly re-screening ──────────────────────────────────────────────────────
/**
 * Re-screen all known wallets. Called by the cron API route.
 * Returns count of status changes detected.
 */
export async function runNightlyRescreening(wallets: Array<{ address: string; fullName: string }>) {
  let changes = 0
  audit({ action: 'rescreening_run', walletAddress: 'ALL', performedBy: 'system', detail: `Rescreening ${wallets.length} customers` })

  for (const w of wallets) {
    const prev = getScreeningResultByWallet(w.address).at(-1)
    const next = await screenPep(w.address, w.fullName, 'system')
    if (prev && prev.riskLevel !== next.riskLevel) {
      changes++
      audit({
        action: 'match_found',
        walletAddress: w.address,
        performedBy: 'system',
        detail: `Risk level changed: ${prev.riskLevel} → ${next.riskLevel}`,
        resultId: next.id,
      })
    }
  }
  return changes
}

// ── Sample PEP database (dev/demo) ────────────────────────────────────────────
const SAMPLE_PEP_DB: PepCandidate[] = [
  {
    id: 'pep-001',
    fullName: 'John Adeyemi Doe',
    aliases: ['J.A. Doe', 'John Doe'],
    country: 'NG',
    position: 'Minister of Finance',
    influenceLevel: 'senior_official',
    relationshipType: 'direct',
    cpiScore: 24,
    source: 'sample',
  },
  {
    id: 'pep-002',
    fullName: 'Amara Osei Mensah',
    aliases: ['A. Mensah'],
    country: 'GH',
    position: 'Member of Parliament',
    influenceLevel: 'senior_official',
    relationshipType: 'direct',
    cpiScore: 43,
    source: 'sample',
  },
  {
    id: 'pep-003',
    fullName: 'Fatima Al-Rashid',
    aliases: ['Fatima Rashid', 'F. Al Rashid'],
    country: 'KE',
    position: 'Governor, Central Bank',
    influenceLevel: 'head_of_state',
    relationshipType: 'direct',
    cpiScore: 31,
    source: 'sample',
  },
]
