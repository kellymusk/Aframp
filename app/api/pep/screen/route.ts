import { NextResponse } from 'next/server'
import { screenPep, getScreeningResultByWallet } from '@/lib/pep/screening-engine'

/** POST /api/pep/screen — run real-time PEP screening */
export async function POST(request: Request) {
  const body = (await request.json()) as { walletAddress: string; fullName: string; performedBy?: string }
  const { walletAddress, fullName, performedBy } = body

  if (!walletAddress || !fullName) {
    return NextResponse.json({ error: 'walletAddress and fullName required' }, { status: 400 })
  }

  try {
    const result = await screenPep(walletAddress, fullName, performedBy ?? 'system')
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

/** GET /api/pep/screen?wallet=G... — fetch screening history for a wallet */
export async function GET(request: Request) {
  const wallet = new URL(request.url).searchParams.get('wallet')
  if (!wallet) return NextResponse.json({ error: 'wallet required' }, { status: 400 })
  return NextResponse.json(getScreeningResultByWallet(wallet))
}
