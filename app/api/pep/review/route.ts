import { NextResponse } from 'next/server'
import { resolveScreeningResult } from '@/lib/pep/screening-engine'

/** PATCH /api/pep/review — compliance officer resolves a screening result */
export async function PATCH(request: Request) {
  const body = (await request.json()) as {
    resultId: string
    status: 'confirmed' | 'false_positive' | 'cleared'
    reviewedBy: string
    note: string
  }

  const { resultId, status, reviewedBy, note } = body
  if (!resultId || !status || !reviewedBy) {
    return NextResponse.json({ error: 'resultId, status, reviewedBy required' }, { status: 400 })
  }

  const result = await resolveScreeningResult(resultId, status, reviewedBy, note ?? '')
  if (!result) return NextResponse.json({ error: 'Result not found' }, { status: 404 })
  return NextResponse.json(result)
}
