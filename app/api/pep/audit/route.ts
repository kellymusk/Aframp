import { NextResponse } from 'next/server'
import { getAuditLog } from '@/lib/pep/screening-engine'

/** GET /api/pep/audit?wallet=G... — tamper-proof audit log */
export async function GET(request: Request) {
  const wallet = new URL(request.url).searchParams.get('wallet') ?? undefined
  return NextResponse.json(getAuditLog(wallet))
}
