import { NextResponse } from 'next/server'
import { generateReferralCode } from '@/lib/referral'
import { addReferee, createReferralRecordIfMissing, getReferralRecord } from '@/lib/referral/store'

async function getOrCreate(walletAddress: string) {
  const code = generateReferralCode(walletAddress)
  await createReferralRecordIfMissing({
    code,
    ownerAddress: walletAddress,
    referees: [],
    totalRebatesEarned: 0,
    createdAt: Date.now(),
  })
  return getReferralRecord(code)
}

/** GET /api/referral?wallet=G... — fetch or create referral record */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const wallet = searchParams.get('wallet')
  if (!wallet) return NextResponse.json({ error: 'wallet required' }, { status: 400 })

  const record = await getOrCreate(wallet)
  return NextResponse.json(record)
}

/** POST /api/referral — apply a referral code for a new user */
export async function POST(request: Request) {
  const body = (await request.json()) as { code: string; refereeWallet: string }
  const { code, refereeWallet } = body

  if (!code || !refereeWallet) {
    return NextResponse.json({ error: 'code and refereeWallet required' }, { status: 400 })
  }

  const record = await getReferralRecord(code.toUpperCase())
  if (!record) {
    return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 })
  }

  if (record.ownerAddress === refereeWallet) {
    return NextResponse.json({ error: 'Cannot use your own referral code' }, { status: 400 })
  }

  if (record.referees.includes(refereeWallet)) {
    return NextResponse.json({ error: 'Code already used by this wallet' }, { status: 409 })
  }

  await addReferee(record.code, refereeWallet)
  return NextResponse.json({ success: true, discountPct: 10 })
}
