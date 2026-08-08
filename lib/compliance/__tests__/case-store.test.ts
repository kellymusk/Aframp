/**
 * Case management and SAR workflow tests.
 *
 * The properties pinned here are the ones an examiner actually tests: that
 * decisions are attributed, that the audit trail only grows, that filing
 * deadlines run from suspicion rather than from convenience, and that a case
 * cannot be reported twice.
 */

import {
  SarError,
  _clearCases,
  addCaseNote,
  assignCase,
  decideCase,
  draftSar,
  getCase,
  getCaseByTransaction,
  getCaseStats,
  listCases,
  listSars,
  openCase,
  reopenCase,
  retentionExpiryFor,
  updateSarStatus,
} from '../case-store'
import { JURISDICTIONS, RECORD_RETENTION_YEARS } from '../config'
import type { Jurisdiction, ScreeningResult, ScreeningSubject } from '../types'

const USER = 'GTESTWALLET000000000000000000000000000000000000000000'

let sequence = 0

function subject(overrides: Partial<ScreeningSubject> = {}): ScreeningSubject {
  return {
    transactionId: `tx_${sequence++}`,
    userId: USER,
    kind: 'offramp',
    amountCents: 500_00,
    asset: 'USDC',
    chain: 'Stellar',
    jurisdiction: 'NG',
    ...overrides,
  }
}

function result(overrides: Partial<ScreeningResult> = {}): Omit<ScreeningResult, 'caseId'> {
  return {
    transactionId: 'tx',
    userId: USER,
    decision: 'REVIEW',
    riskScore: 65,
    riskLevel: 'HIGH',
    signals: [
      { code: 'STRUCTURING', severity: 'HIGH', score: 70, description: 'structured' },
    ],
    providers: [],
    screenedAt: new Date().toISOString(),
    ...overrides,
  }
}

/** Opens a case and returns it. */
function open(overrides: Partial<ScreeningSubject> = {}) {
  const input = subject(overrides)
  return openCase(input, result({ transactionId: input.transactionId }))
}

beforeEach(() => {
  _clearCases()
  sequence = 0
})

// ---------------------------------------------------------------------------

describe('openCase', () => {
  it('opens a case with a system-authored creation event', () => {
    const record = open()

    expect(record.status).toBe('OPEN')
    expect(record.events).toHaveLength(1)
    expect(record.events[0]).toMatchObject({ actor: 'system', action: 'CREATED' })
    expect(record.events[0].detail).toContain('STRUCTURING')
  })

  it('is idempotent per transaction', () => {
    const input = subject()
    const first = openCase(input, result({ transactionId: input.transactionId }))
    const second = openCase(input, result({ transactionId: input.transactionId }))

    expect(second.id).toBe(first.id)
    expect(listCases().total).toBe(1)
  })

  it('is findable by transaction id', () => {
    const input = subject()
    const record = openCase(input, result({ transactionId: input.transactionId }))
    expect(getCaseByTransaction(input.transactionId)?.id).toBe(record.id)
  })
})

describe('audit trail', () => {
  it('attributes every action to the analyst who took it', () => {
    const record = open()

    assignCase(record.id, 'ada.okafor')
    addCaseNote(record.id, 'ada.okafor', 'Called the customer.')
    decideCase({
      caseId: record.id,
      analystId: 'ben.mwangi',
      status: 'CLEARED',
      disposition: 'FALSE_POSITIVE',
      rationale: 'Salary payment, payslip provided.',
    })

    const actors = getCase(record.id)!.events.map((e) => e.actor)
    expect(actors).toEqual(['system', 'ada.okafor', 'ada.okafor', 'ben.mwangi'])
  })

  it('only ever grows', () => {
    const record = open()
    const lengths: number[] = [getCase(record.id)!.events.length]

    assignCase(record.id, 'ada.okafor')
    lengths.push(getCase(record.id)!.events.length)
    addCaseNote(record.id, 'ada.okafor', 'note')
    lengths.push(getCase(record.id)!.events.length)
    reopenCase(record.id, 'ada.okafor', 'new information')
    lengths.push(getCase(record.id)!.events.length)

    expect(lengths).toEqual([1, 2, 3, 4])
  })

  it('preserves the rationale of a decision verbatim', () => {
    const record = open()
    decideCase({
      caseId: record.id,
      analystId: 'ada.okafor',
      status: 'CLEARED',
      disposition: 'FALSE_POSITIVE',
      rationale: 'Verified against a utility bill dated 2026-02-01.',
    })

    const trail = getCase(record.id)!.events.map((e) => e.detail).join(' ')
    expect(trail).toContain('Verified against a utility bill dated 2026-02-01.')
  })
})

describe('assignCase', () => {
  it('moves an open case into review', () => {
    const record = open()
    expect(assignCase(record.id, 'ada.okafor')).toMatchObject({
      assignedTo: 'ada.okafor',
      status: 'IN_REVIEW',
    })
  })

  it('does not drag a closed case back into the queue', () => {
    const record = open()
    decideCase({
      caseId: record.id,
      analystId: 'ada.okafor',
      status: 'CLEARED',
      rationale: 'cleared',
    })

    expect(assignCase(record.id, 'ben.mwangi')?.status).toBe('CLEARED')
  })

  it('returns null for an unknown case', () => {
    expect(assignCase('CASE-NOPE', 'ada.okafor')).toBeNull()
  })
})

describe('reopenCase', () => {
  it('clears the disposition but keeps its history', () => {
    const record = open()
    decideCase({
      caseId: record.id,
      analystId: 'ada.okafor',
      status: 'CLEARED',
      disposition: 'FALSE_POSITIVE',
      rationale: 'Looked fine.',
    })

    const reopened = reopenCase(record.id, 'qa.reviewer', 'QA sample')!
    expect(reopened.status).toBe('IN_REVIEW')
    expect(reopened.disposition).toBeUndefined()
    // The original conclusion must remain visible.
    expect(reopened.events.map((e) => e.detail).join(' ')).toContain('Looked fine.')
  })
})

describe('listCases', () => {
  beforeEach(() => {
    open({ jurisdiction: 'NG' })
    open({ jurisdiction: 'KE' })
    const third = open({ jurisdiction: 'NG' })
    assignCase(third.id, 'ada.okafor')
  })

  it('filters by status', () => {
    expect(listCases({ status: 'OPEN' }).total).toBe(2)
    expect(listCases({ status: 'IN_REVIEW' }).total).toBe(1)
  })

  it('filters by jurisdiction', () => {
    expect(listCases({ jurisdiction: 'NG' }).total).toBe(2)
  })

  it('filters by assignee', () => {
    expect(listCases({ assignedTo: 'ada.okafor' }).total).toBe(1)
  })

  it('reports the pre-paging total alongside the page', () => {
    const { cases, total } = listCases({ limit: 1 })
    expect(cases).toHaveLength(1)
    expect(total).toBe(3)
  })

  it('filters by minimum risk score', () => {
    expect(listCases({ minRiskScore: 90 }).total).toBe(0)
    expect(listCases({ minRiskScore: 65 }).total).toBe(3)
  })
})

describe('getCaseStats', () => {
  it('counts cases by status', () => {
    open()
    const second = open()
    assignCase(second.id, 'ada.okafor')

    const stats = getCaseStats()
    expect(stats.total).toBe(2)
    expect(stats.byStatus.OPEN).toBe(1)
    expect(stats.byStatus.IN_REVIEW).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// SAR workflow
// ---------------------------------------------------------------------------

const NARRATIVE =
  'Customer received three sub-threshold transfers within seven days totalling more than the reporting threshold, with no documented source of funds.'

describe('draftSar', () => {
  it('routes the filing to the jurisdiction regulator', () => {
    const record = open({ jurisdiction: 'KE' })
    const sar = draftSar({ caseId: record.id, analystId: 'ada.okafor', narrative: NARRATIVE })

    expect(sar.regulator).toBe(JURISDICTIONS.KE.regulator)
    expect(sar.status).toBe('DRAFT')
  })

  it('runs the deadline from when suspicion was formed, not from draft time', () => {
    // Dating the clock from drafting would let a backlog quietly extinguish
    // every deadline — the precise failure the deadline exists to prevent.
    const record = open({ jurisdiction: 'NG' })
    const sar = draftSar({ caseId: record.id, analystId: 'ada.okafor', narrative: NARRATIVE })

    expect(sar.suspicionFormedAt).toBe(record.createdAt)

    const expectedDue =
      new Date(record.createdAt).getTime() + JURISDICTIONS.NG.filingDeadlineHours * 3_600_000
    expect(new Date(sar.dueAt).getTime()).toBe(expectedDue)
  })

  it('refuses to draft against a market with no filing route', () => {
    // There is no FIU to receive it.  Minting a SAR addressed to no regulator
    // would set `sarId` and make the case read as discharged everywhere that
    // counts filings, while the review obligation is still live.
    const record = open({ jurisdiction: 'TZ' })

    expect(() =>
      draftSar({ caseId: record.id, analystId: 'ada.okafor', narrative: NARRATIVE })
    ).toThrow(expect.objectContaining({ code: 'NO_FILING_ROUTE' }))

    expect(getCase(record.id)?.sarId).toBeUndefined()
    expect(getCase(record.id)?.status).toBe('OPEN')
  })

  it('applies each market own filing window', () => {
    const cases: Record<string, string> = {}
    for (const code of ['NG', 'KE', 'ZA'] as Jurisdiction[]) {
      const record = open({ jurisdiction: code })
      const sar = draftSar({ caseId: record.id, analystId: 'a', narrative: NARRATIVE })
      cases[code] = sar.dueAt
    }

    // ZA allows materially longer than NG, so the deadlines must differ.
    expect(new Date(cases.ZA).getTime()).toBeGreaterThan(new Date(cases.NG).getTime())
  })

  it('marks the case confirmed suspicious', () => {
    const record = open()
    const sar = draftSar({ caseId: record.id, analystId: 'ada.okafor', narrative: NARRATIVE })

    const updated = getCase(record.id)!
    expect(updated.status).toBe('CONFIRMED_SUSPICIOUS')
    expect(updated.sarId).toBe(sar.id)
  })

  it('copies the grounds for suspicion from the case', () => {
    const record = open()
    const sar = draftSar({ caseId: record.id, analystId: 'ada.okafor', narrative: NARRATIVE })
    expect(sar.groundsForSuspicion).toEqual(['STRUCTURING'])
  })

  it('refuses a second filing for the same case', () => {
    const record = open()
    draftSar({ caseId: record.id, analystId: 'ada.okafor', narrative: NARRATIVE })

    expect(() =>
      draftSar({ caseId: record.id, analystId: 'ada.okafor', narrative: NARRATIVE })
    ).toThrow(SarError)
  })

  it('refuses to file against an unknown case', () => {
    expect(() =>
      draftSar({ caseId: 'CASE-NOPE', analystId: 'ada.okafor', narrative: NARRATIVE })
    ).toThrow(SarError)
  })
})

describe('updateSarStatus', () => {
  function draft() {
    const record = open()
    return draftSar({ caseId: record.id, analystId: 'ada.okafor', narrative: NARRATIVE })
  }

  it('walks DRAFT → SUBMITTED → ACKNOWLEDGED', () => {
    const sar = draft()

    const submitted = updateSarStatus(sar.id, 'ada.okafor', 'SUBMITTED')
    expect(submitted.status).toBe('SUBMITTED')
    expect(submitted.submittedAt).toBeDefined()

    const acknowledged = updateSarStatus(sar.id, 'ada.okafor', 'ACKNOWLEDGED', 'NFIU-2026-001')
    expect(acknowledged.status).toBe('ACKNOWLEDGED')
    expect(acknowledged.regulatorReference).toBe('NFIU-2026-001')
  })

  it('refuses to jump straight from draft to acknowledged', () => {
    // A record that can reach ACKNOWLEDGED without ever being submitted is a
    // record that can be falsified after the fact.
    const sar = draft()
    expect(() => updateSarStatus(sar.id, 'ada.okafor', 'ACKNOWLEDGED')).toThrow(SarError)
  })

  it('allows a rejected filing to be resubmitted', () => {
    const sar = draft()
    updateSarStatus(sar.id, 'ada.okafor', 'SUBMITTED')
    updateSarStatus(sar.id, 'ada.okafor', 'REJECTED')
    expect(updateSarStatus(sar.id, 'ada.okafor', 'SUBMITTED').status).toBe('SUBMITTED')
  })

  it('treats acknowledgement as final', () => {
    const sar = draft()
    updateSarStatus(sar.id, 'ada.okafor', 'SUBMITTED')
    updateSarStatus(sar.id, 'ada.okafor', 'ACKNOWLEDGED')
    expect(() => updateSarStatus(sar.id, 'ada.okafor', 'SUBMITTED')).toThrow(SarError)
  })

  it('logs the transition on the case', () => {
    const sar = draft()
    updateSarStatus(sar.id, 'ada.okafor', 'SUBMITTED')

    const trail = getCase(sar.caseId)!.events.map((e) => e.detail).join(' ')
    expect(trail).toContain('SUBMITTED')
  })
})

describe('listSars', () => {
  it('orders by soonest deadline', () => {
    // ZA has the longest filing window of the three, so it must sort last.
    for (const code of ['ZA', 'NG', 'KE'] as Jurisdiction[]) {
      const record = open({ jurisdiction: code })
      draftSar({ caseId: record.id, analystId: 'a', narrative: NARRATIVE })
    }

    const jurisdictions = listSars().map((s) => s.jurisdiction)
    expect(jurisdictions[0]).toBe('NG')
    expect(jurisdictions[jurisdictions.length - 1]).toBe('ZA')
  })

  it('filters to a single market', () => {
    for (const code of ['NG', 'KE'] as Jurisdiction[]) {
      const record = open({ jurisdiction: code })
      draftSar({ caseId: record.id, analystId: 'a', narrative: NARRATIVE })
    }

    expect(listSars({ jurisdiction: 'NG' })).toHaveLength(1)
  })
})

describe('retentionExpiryFor', () => {
  it('is five years after the case was opened', () => {
    const record = open()
    const expiry = new Date(retentionExpiryFor(record))
    const created = new Date(record.createdAt)

    expect(expiry.getFullYear() - created.getFullYear()).toBe(RECORD_RETENTION_YEARS)
  })
})
