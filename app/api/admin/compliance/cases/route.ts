/**
 * GET /api/admin/compliance/cases
 *
 * The analyst work queue.  Lists flagged transactions with filters and paging,
 * plus the summary counts the console header shows.
 *
 * Query:
 *   status?       OPEN | IN_REVIEW | ESCALATED | CLEARED | CONFIRMED_SUSPICIOUS
 *   jurisdiction? NG | KE | GH | ZA | UG
 *   assignedTo?   analyst id
 *   userId?       wallet address — every case for one account
 *   minRiskScore? 0-100
 *   limit?        1-100 (default 25)
 *   offset?       default 0
 *
 * 200 { cases, total, stats }
 * 401 missing/invalid bearer token
 * 403 console not provisioned
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateAdmin } from '@/lib/compliance/admin-auth'
import { getCaseStats, listCases } from '@/lib/compliance/case-store'

const QuerySchema = z.object({
  status: z
    .enum(['OPEN', 'IN_REVIEW', 'ESCALATED', 'CLEARED', 'CONFIRMED_SUSPICIOUS'])
    .optional(),
  jurisdiction: z.enum(['NG', 'KE', 'GH', 'ZA', 'UG']).optional(),
  assignedTo: z.string().trim().min(1).max(64).optional(),
  userId: z.string().trim().min(1).max(128).optional(),
  minRiskScore: z.coerce.number().int().min(0).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
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
    assignedTo: searchParams.get('assignedTo') ?? undefined,
    userId: searchParams.get('userId') ?? undefined,
    minRiskScore: searchParams.get('minRiskScore') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
    offset: searchParams.get('offset') ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { cases, total } = listCases(parsed.data)

  return NextResponse.json(
    {
      cases,
      total,
      // Returned alongside the page so the header counts stay consistent with
      // the rows — two round trips would let them drift mid-triage.
      stats: getCaseStats(),
    },
    {
      status: 200,
      // Case data is customer PII under a live investigation.  Nothing between
      // here and the analyst's browser may retain a copy.
      headers: { 'Cache-Control': 'no-store, private' },
    }
  )
}
