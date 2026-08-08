/**
 * Case store and SAR workflow.
 *
 * A flagged transaction is not a case file on its own — the regulatory
 * artefact is the *record of what a human did about it*.  Every mutation here
 * appends to an immutable event trail rather than only updating state, because
 * "who cleared this, when, and on what basis" is the first question asked in an
 * examination and the last thing anyone remembers a year later.
 *
 * Storage layer:
 *   In-memory maps mirroring db/migrations/003_create_compliance.sql, matching
 *   the convention in lib/orders/order-store.ts and lib/kyc/withdrawalLimitService.ts.
 *   Each function quotes its SQL equivalent.
 *
 * Deletion:
 *   There is deliberately no deleteCase().  AML records carry a five-year
 *   retention obligation (RECORD_RETENTION_YEARS) in all five markets, and a
 *   case that can be deleted through the application is a case that can be
 *   deleted by whoever compromises it.  Cases close; they do not disappear.
 */

import { RECORD_RETENTION_YEARS } from './config'
import { isLicensedJurisdiction, policyFor } from './markets'
import type {
  CaseDisposition,
  CaseEvent,
  CaseStatus,
  ComplianceCase,
  Jurisdiction,
  Market,
  SarRecord,
  SarStatus,
  ScreeningResult,
  ScreeningSubject,
  SignalCode,
} from './types'

// ---------------------------------------------------------------------------
// In-memory stores (replace with DB queries in production)
// ---------------------------------------------------------------------------

/** Map<caseId, ComplianceCase> — the `compliance_cases` table. */
export const _caseStore = new Map<string, ComplianceCase>()

/** Map<sarId, SarRecord> — the `compliance_sars` table. */
export const _sarStore = new Map<string, SarRecord>()

/** Map<transactionId, caseId> — stands in for a unique index. */
const _byTransaction = new Map<string, string>()

// ---------------------------------------------------------------------------
// Case creation
// ---------------------------------------------------------------------------

/**
 * Opens a case for a screening result, or returns the existing one.
 *
 *   INSERT INTO compliance_cases (…) VALUES (…)
 *   ON CONFLICT (transaction_id) DO NOTHING
 *   RETURNING *;
 *
 * Idempotent on transactionId: the screening endpoint is retried by clients,
 * and duplicate cases for one transaction inflate the queue and get closed
 * inconsistently.
 */
export function openCase(
  subject: ScreeningSubject,
  result: Omit<ScreeningResult, 'caseId'>
): ComplianceCase {
  const existingId = _byTransaction.get(subject.transactionId)
  if (existingId) {
    const existing = _caseStore.get(existingId)
    if (existing) return existing
  }

  const now = new Date().toISOString()
  const id = generateId('CASE')

  const record: ComplianceCase = {
    id,
    transactionId: subject.transactionId,
    userId: subject.userId,
    kind: subject.kind,
    jurisdiction: subject.jurisdiction,
    amountCents: subject.amountCents,
    asset: subject.asset,
    status: 'OPEN',
    riskScore: result.riskScore,
    riskLevel: result.riskLevel,
    decision: result.decision,
    signals: result.signals,
    events: [
      {
        at: now,
        actor: 'system',
        action: 'CREATED',
        detail: `${result.decision} at risk ${result.riskScore} — ${result.signals
          .map((s) => s.code)
          .join(', ')}`,
      },
    ],
    createdAt: now,
    updatedAt: now,
  }

  _caseStore.set(id, record)
  _byTransaction.set(subject.transactionId, id)

  return record
}

// ---------------------------------------------------------------------------
// Case reads
// ---------------------------------------------------------------------------

export function getCase(caseId: string): ComplianceCase | null {
  return _caseStore.get(caseId) ?? null
}

export function getCaseByTransaction(transactionId: string): ComplianceCase | null {
  const id = _byTransaction.get(transactionId)
  return id ? (_caseStore.get(id) ?? null) : null
}

export interface ListCasesOptions {
  status?: CaseStatus
  jurisdiction?: Market
  assignedTo?: string
  userId?: string
  /** Only cases at or above this aggregate score. */
  minRiskScore?: number
  limit?: number
  offset?: number
}

export interface ListCasesResult {
  cases: ComplianceCase[]
  /** Total matching the filter, before paging — drives the queue counter. */
  total: number
}

/**
 * Lists cases newest-first, filtered and paged.
 *
 *   SELECT * FROM compliance_cases
 *   WHERE  ($1::TEXT IS NULL OR status = $1)
 *     AND  ($2::TEXT IS NULL OR jurisdiction = $2)
 *     AND  ($3::TEXT IS NULL OR assigned_to = $3)
 *     AND  ($4::TEXT IS NULL OR user_id = $4)
 *     AND  ($5::INT  IS NULL OR risk_score >= $5)
 *   ORDER  BY created_at DESC
 *   LIMIT  $6 OFFSET $7;
 *
 * Newest-first rather than riskiest-first is intentional: filing deadlines run
 * from when suspicion was formed, so the oldest unworked case is the one that
 * breaches first, and analysts work the queue from the far end. The admin UI
 * offers risk sorting on top of this for triage.
 */
export function listCases({
  status,
  jurisdiction,
  assignedTo,
  userId,
  minRiskScore,
  limit = 25,
  offset = 0,
}: ListCasesOptions = {}): ListCasesResult {
  const matching = [..._caseStore.values()]
    .filter((c) => (status ? c.status === status : true))
    .filter((c) => (jurisdiction ? c.jurisdiction === jurisdiction : true))
    .filter((c) => (assignedTo ? c.assignedTo === assignedTo : true))
    .filter((c) => (userId ? c.userId === userId : true))
    .filter((c) => (minRiskScore != null ? c.riskScore >= minRiskScore : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return {
    cases: matching.slice(offset, offset + limit),
    total: matching.length,
  }
}

/** Open-case counts by status — the admin dashboard's summary row. */
export function getCaseStats(): {
  byStatus: Record<CaseStatus, number>
  total: number
  /** Cases with an unfiled SAR past their jurisdiction's deadline. */
  overdueFilings: number
} {
  const byStatus: Record<CaseStatus, number> = {
    OPEN: 0,
    IN_REVIEW: 0,
    ESCALATED: 0,
    CLEARED: 0,
    CONFIRMED_SUSPICIOUS: 0,
  }

  for (const record of _caseStore.values()) {
    byStatus[record.status]++
  }

  const now = Date.now()
  const overdueFilings = [..._sarStore.values()].filter(
    (sar) => sar.status === 'DRAFT' && new Date(sar.dueAt).getTime() < now
  ).length

  return {
    byStatus,
    total: _caseStore.size,
    overdueFilings,
  }
}

// ---------------------------------------------------------------------------
// Case mutations
// ---------------------------------------------------------------------------

/**
 * Applies a change and appends the matching audit event.
 *
 * The single mutation path exists so no caller can change a case without
 * leaving a trace — an "update case" helper that took arbitrary fields would
 * make the trail optional, and an optional audit trail is not an audit trail.
 */
function mutate(
  caseId: string,
  actor: string,
  action: CaseEvent['action'],
  detail: string | undefined,
  apply: (record: ComplianceCase) => Partial<ComplianceCase>
): ComplianceCase | null {
  const existing = _caseStore.get(caseId)
  if (!existing) return null

  const now = new Date().toISOString()
  const updated: ComplianceCase = {
    ...existing,
    ...apply(existing),
    events: [...existing.events, { at: now, actor, action, detail }],
    updatedAt: now,
  }

  _caseStore.set(caseId, updated)
  return updated
}

/**
 * Assigns a case to an analyst and moves it to IN_REVIEW.
 *
 *   UPDATE compliance_cases SET assigned_to = $2, status = 'IN_REVIEW' WHERE id = $1;
 */
export function assignCase(caseId: string, analystId: string): ComplianceCase | null {
  return mutate(caseId, analystId, 'ASSIGNED', `Assigned to ${analystId}`, (record) => ({
    assignedTo: analystId,
    // Don't drag a closed case back into the queue by assigning it.
    status: isClosed(record.status) ? record.status : 'IN_REVIEW',
  }))
}

export interface DecideCaseInput {
  caseId: string
  analystId: string
  status: Extract<CaseStatus, 'CLEARED' | 'CONFIRMED_SUSPICIOUS' | 'ESCALATED'>
  disposition?: CaseDisposition
  /** Analyst's reasoning.  Required — a decision without a rationale is not one. */
  rationale: string
}

/**
 * Records an analyst's decision on a case.
 *
 * `rationale` is mandatory by signature rather than by convention.  The most
 * common examination finding against a monitoring programme is alerts closed
 * with no recorded reason, and the cheapest way to prevent that is to make the
 * reason impossible to omit.
 */
export function decideCase({
  caseId,
  analystId,
  status,
  disposition,
  rationale,
}: DecideCaseInput): ComplianceCase | null {
  return mutate(
    caseId,
    analystId,
    'STATUS_CHANGED',
    `${status}${disposition ? ` (${disposition})` : ''}: ${rationale}`,
    () => ({ status, disposition })
  )
}

/** Appends a free-text note without changing state. */
export function addCaseNote(
  caseId: string,
  analystId: string,
  note: string
): ComplianceCase | null {
  return mutate(caseId, analystId, 'NOTE_ADDED', note, () => ({}))
}

/**
 * Reopens a closed case — new information, or a quality-assurance review.
 *
 *   UPDATE compliance_cases SET status = 'IN_REVIEW', disposition = NULL WHERE id = $1;
 *
 * The prior disposition is cleared but its history stays in `events`, so a
 * reopened case still shows what was originally concluded and by whom.
 */
export function reopenCase(
  caseId: string,
  analystId: string,
  reason: string
): ComplianceCase | null {
  return mutate(caseId, analystId, 'REOPENED', reason, () => ({
    status: 'IN_REVIEW',
    disposition: undefined,
  }))
}

function isClosed(status: CaseStatus): boolean {
  return status === 'CLEARED' || status === 'CONFIRMED_SUSPICIOUS'
}

// ---------------------------------------------------------------------------
// SAR / STR workflow
// ---------------------------------------------------------------------------

export interface DraftSarInput {
  caseId: string
  analystId: string
  /** The narrative filed with the FIU — who, what, when, why it is suspicious. */
  narrative: string
}

export class SarError extends Error {
  readonly code:
    | 'CASE_NOT_FOUND'
    | 'ALREADY_FILED'
    | 'SAR_NOT_FOUND'
    | 'INVALID_TRANSITION'
    | 'NO_FILING_ROUTE'

  constructor(code: SarError['code'], message: string) {
    super(message)
    this.name = 'SarError'
    this.code = code
  }
}

/**
 * Drafts a SAR/STR against a case.
 *
 * The filing deadline runs from the case's creation — the moment the system
 * formed suspicion — not from when the analyst got round to drafting.  Dating
 * the clock from draft time would let a backlog quietly extinguish every
 * deadline, which is the exact failure the deadline exists to prevent.
 *
 * Drafting also moves the case to CONFIRMED_SUSPICIOUS: you do not report a
 * transaction you consider clean.
 *
 * Refuses on cases from unlicensed markets.  There is no FIU to receive the
 * filing, and minting a SAR addressed to no regulator would leave the case
 * looking discharged in every queue and count that reads `sarId` — the review
 * obligation is still live and must stay visibly so.
 */
export function draftSar({ caseId, analystId, narrative }: DraftSarInput): SarRecord {
  const record = _caseStore.get(caseId)
  if (!record) throw new SarError('CASE_NOT_FOUND', `No case ${caseId}`)
  if (record.sarId) {
    throw new SarError('ALREADY_FILED', `Case ${caseId} already has SAR ${record.sarId}`)
  }
  if (!isLicensedJurisdiction(record.jurisdiction)) {
    throw new SarError(
      'NO_FILING_ROUTE',
      `Case ${caseId} originates in ${record.jurisdiction}, where Aframp holds no AML registration. ` +
        `Disposition it internally and escalate to the MLRO — there is no FIU to file with.`
    )
  }

  const policy = policyFor(record.jurisdiction)
  const suspicionFormedAt = record.createdAt
  const dueAt = new Date(
    new Date(suspicionFormedAt).getTime() + policy.filingDeadlineHours * 3_600_000
  ).toISOString()

  const now = new Date().toISOString()
  const sar: SarRecord = {
    id: generateId('SAR'),
    caseId,
    userId: record.userId,
    jurisdiction: record.jurisdiction,
    regulator: policy.regulator,
    status: 'DRAFT',
    narrative,
    groundsForSuspicion: record.signals.map((s) => s.code) as SignalCode[],
    amountCents: record.amountCents,
    filedBy: analystId,
    suspicionFormedAt,
    dueAt,
    createdAt: now,
    updatedAt: now,
  }

  _sarStore.set(sar.id, sar)

  mutate(
    caseId,
    analystId,
    'SAR_FILED',
    `${policy.filingName} ${sar.id} drafted for ${policy.regulator}, due ${dueAt}`,
    () => ({ sarId: sar.id, status: 'CONFIRMED_SUSPICIOUS' as CaseStatus })
  )

  return sar
}

/**
 * Advances a SAR through submission and acknowledgement.
 *
 * Transitions are constrained (DRAFT → SUBMITTED → ACKNOWLEDGED | REJECTED)
 * because a filing record that can jump straight to ACKNOWLEDGED without ever
 * being submitted is a record that can be falsified after the fact.
 */
export function updateSarStatus(
  sarId: string,
  analystId: string,
  status: SarStatus,
  regulatorReference?: string
): SarRecord {
  const sar = _sarStore.get(sarId)
  if (!sar) throw new SarError('SAR_NOT_FOUND', `No SAR ${sarId}`)

  const allowed: Record<SarStatus, SarStatus[]> = {
    DRAFT: ['SUBMITTED'],
    SUBMITTED: ['ACKNOWLEDGED', 'REJECTED'],
    // A rejected filing is corrected and resubmitted; an acknowledged one is final.
    REJECTED: ['SUBMITTED'],
    ACKNOWLEDGED: [],
  }

  if (!allowed[sar.status].includes(status)) {
    throw new SarError(
      'INVALID_TRANSITION',
      `Cannot move SAR ${sarId} from ${sar.status} to ${status}`
    )
  }

  const now = new Date().toISOString()
  const updated: SarRecord = {
    ...sar,
    status,
    regulatorReference: regulatorReference ?? sar.regulatorReference,
    submittedAt: status === 'SUBMITTED' ? now : sar.submittedAt,
    updatedAt: now,
  }

  _sarStore.set(sarId, updated)
  addCaseNote(sar.caseId, analystId, `SAR ${sarId} → ${status}`)

  return updated
}

export function getSar(sarId: string): SarRecord | null {
  return _sarStore.get(sarId) ?? null
}

export interface ListSarsOptions {
  status?: SarStatus
  jurisdiction?: Jurisdiction
  /** Only drafts past their filing deadline. */
  overdueOnly?: boolean
  limit?: number
}

/**
 * Lists SARs, soonest deadline first.
 *
 *   SELECT * FROM compliance_sars
 *   WHERE  ($1::TEXT IS NULL OR status = $1)
 *     AND  ($2::TEXT IS NULL OR jurisdiction = $2)
 *   ORDER  BY due_at
 *   LIMIT  $3;
 */
export function listSars({
  status,
  jurisdiction,
  overdueOnly = false,
  limit = 50,
}: ListSarsOptions = {}): SarRecord[] {
  const now = Date.now()

  return [..._sarStore.values()]
    .filter((s) => (status ? s.status === status : true))
    .filter((s) => (jurisdiction ? s.jurisdiction === jurisdiction : true))
    .filter((s) =>
      overdueOnly ? s.status === 'DRAFT' && new Date(s.dueAt).getTime() < now : true
    )
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
    .slice(0, limit)
}

/** ISO date after which a case may lawfully be purged. */
export function retentionExpiryFor(record: ComplianceCase): string {
  const expiry = new Date(record.createdAt)
  expiry.setFullYear(expiry.getFullYear() + RECORD_RETENTION_YEARS)
  return expiry.toISOString()
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Empties both stores.  Test helper only. */
export function _clearCases(): void {
  _caseStore.clear()
  _sarStore.clear()
  _byTransaction.clear()
}
