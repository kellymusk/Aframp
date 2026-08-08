/**
 * /api/admin/compliance/sars
 *
 * GET   Lists SAR/STR filings, soonest deadline first.
 *
 *   Query: ?status=DRAFT|SUBMITTED|ACKNOWLEDGED|REJECTED
 *          &jurisdiction=NG|KE|GH|ZA|UG
 *          &overdueOnly=true
 *   200:   { sars }
 *
 * POST  Drafts a SAR against a case, or advances an existing one.
 *
 *   Draft:   { caseId, narrative }
 *   Advance: { sarId, status, regulatorReference? }
 *   200:     { sar }
 *   409:     the case already has a SAR, or the status transition is invalid
 *
 * The filing deadline is computed from when suspicion was formed — the case's
 * creation — not from when the analyst opened the draft.  See draftSar().
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateAdmin } from '@/lib/compliance/admin-auth'
import { SarError, draftSar, listSars, updateSarStatus } from '@/lib/compliance/case-store'
import { JURISDICTIONS } from '@/lib/compliance/config'

const NO_STORE = { 'Cache-Control': 'no-store, private' }

const QuerySchema = z.object({
  status: z.enum(['DRAFT', 'SUBMITTED', 'ACKNOWLEDGED', 'REJECTED']).optional(),
  jurisdiction: z.enum(['NG', 'KE', 'GH', 'ZA', 'UG']).optional(),
  overdueOnly: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export function GET(request: NextRequest) {
  const auth = authenticateAdmin(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { searchParams } = request.nextUrl
  const parsed = QuerySchema.safeParse({
    status: searchParams.get('status') ?? undefined,
    jurisdiction: searchParams.get('jurisdiction') ?? undefined,
    overdueOnly: searchParams.get('overdueOnly') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  return NextResponse.json(
    {
      sars: listSars(parsed.data),
      // The console renders regulator names and filing windows next to each
      // row; shipping the policy table avoids duplicating it client-side where
      // it would drift from config.ts.
      jurisdictions: JURISDICTIONS,
    },
    { status: 200, headers: NO_STORE }
  )
}

const BodySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('draft'),
    caseId: z.string().trim().min(1).max(64),
    // A filing is the narrative — a bare form with no explanation is not a
    // report, so this has a real minimum length rather than min(1).
    narrative: z.string().trim().min(50).max(20_000),
  }),
  z.object({
    action: z.literal('advance'),
    sarId: z.string().trim().min(1).max(64),
    status: z.enum(['SUBMITTED', 'ACKNOWLEDGED', 'REJECTED']),
    regulatorReference: z.string().trim().min(1).max(128).optional(),
  }),
])

export async function POST(request: NextRequest) {
  const auth = authenticateAdmin(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { analystId } = auth.identity

  try {
    const sar =
      parsed.data.action === 'draft'
        ? draftSar({
            caseId: parsed.data.caseId,
            analystId,
            narrative: parsed.data.narrative,
          })
        : updateSarStatus(
            parsed.data.sarId,
            analystId,
            parsed.data.status,
            parsed.data.regulatorReference
          )

    return NextResponse.json({ sar }, { status: 200, headers: NO_STORE })
  } catch (error) {
    if (error instanceof SarError) {
      const status =
        error.code === 'CASE_NOT_FOUND' || error.code === 'SAR_NOT_FOUND' ? 404 : 409
      return NextResponse.json({ error: error.code, message: error.message }, { status })
    }
    throw error
  }
}
