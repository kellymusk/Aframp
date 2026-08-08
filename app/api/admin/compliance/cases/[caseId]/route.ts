/**
 * /api/admin/compliance/cases/[caseId]
 *
 * GET    Full case file — signals, evidence metadata and the audit trail.
 *
 * PATCH  Records an analyst action.  One of:
 *          { action: "assign" }
 *          { action: "note",   note: string }
 *          { action: "decide", status, disposition?, rationale }
 *          { action: "reopen", reason: string }
 *
 *        The acting analyst comes from the bearer token, never from the body —
 *        letting a caller name the actor would make the audit trail worthless.
 *
 * 200 { case }
 * 400 invalid body
 * 401 / 403 auth
 * 404 no such case
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateAdmin } from '@/lib/compliance/admin-auth'
import {
  addCaseNote,
  assignCase,
  decideCase,
  getCase,
  reopenCase,
  retentionExpiryFor,
} from '@/lib/compliance/case-store'

const NO_STORE = { 'Cache-Control': 'no-store, private' }

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const auth = authenticateAdmin(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { caseId } = await params
  const record = getCase(caseId)
  if (!record) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 })
  }

  return NextResponse.json(
    { case: record, retentionExpiresAt: retentionExpiryFor(record) },
    { status: 200, headers: NO_STORE }
  )
}

/**
 * Discriminated on `action` so each variant validates only its own fields —
 * `rationale` is required for a decision and meaningless for an assignment,
 * and a single flat schema could not express that.
 */
const PatchSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('assign') }),
  z.object({
    action: z.literal('note'),
    note: z.string().trim().min(1).max(4_000),
  }),
  z.object({
    action: z.literal('decide'),
    status: z.enum(['CLEARED', 'CONFIRMED_SUSPICIOUS', 'ESCALATED']),
    disposition: z.enum(['FALSE_POSITIVE', 'TRUE_POSITIVE', 'INCONCLUSIVE']).optional(),
    // Non-empty by schema: closing an alert with no recorded reason is the
    // single most common examination finding against a monitoring programme.
    rationale: z.string().trim().min(1).max(4_000),
  }),
  z.object({
    action: z.literal('reopen'),
    reason: z.string().trim().min(1).max(4_000),
  }),
])

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const auth = authenticateAdmin(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { caseId } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { analystId } = auth.identity
  const input = parsed.data

  let updated
  switch (input.action) {
    case 'assign':
      updated = assignCase(caseId, analystId)
      break
    case 'note':
      updated = addCaseNote(caseId, analystId, input.note)
      break
    case 'decide':
      updated = decideCase({
        caseId,
        analystId,
        status: input.status,
        disposition: input.disposition,
        rationale: input.rationale,
      })
      break
    case 'reopen':
      updated = reopenCase(caseId, analystId, input.reason)
      break
  }

  if (!updated) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 })
  }

  return NextResponse.json({ case: updated }, { status: 200, headers: NO_STORE })
}
