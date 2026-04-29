import { NextResponse } from 'next/server'
import { getEddByWallet, getPendingEdd, updateEddRecord } from '@/lib/pep/screening-engine'

/** GET /api/pep/edd?wallet=G... — fetch EDD records for a wallet (or all pending) */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const wallet = searchParams.get('wallet')
  return NextResponse.json(wallet ? getEddByWallet(wallet) : getPendingEdd())
}

/** PATCH /api/pep/edd — update EDD record (assign, add docs, sign off) */
export async function PATCH(request: Request) {
  const body = (await request.json()) as {
    eddId: string
    performedBy: string
    status?: string
    sourceOfWealth?: string
    sourceOfFunds?: string
    supportingDocs?: string[]
    assignedTo?: string
    signOffBy?: string
  }

  const { eddId, performedBy, ...update } = body
  if (!eddId || !performedBy) {
    return NextResponse.json({ error: 'eddId and performedBy required' }, { status: 400 })
  }

  const result = await updateEddRecord(eddId, update as Parameters<typeof updateEddRecord>[1], performedBy)
  if (!result) return NextResponse.json({ error: 'EDD record not found' }, { status: 404 })
  return NextResponse.json(result)
}
