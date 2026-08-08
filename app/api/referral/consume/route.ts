import { NextResponse } from 'next/server'
import { consumedDiscountWallets } from '@/lib/referral/store'

/** GET /api/referral/consume?wallet=G... — check whether this wallet has already used its first-ramp discount */
export function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const wallet = searchParams.get('wallet')
  if (!wallet) return NextResponse.json({ error: 'wallet required' }, { status: 400 })

  return NextResponse.json({ consumed: consumedDiscountWallets.has(wallet) })
}

/**
 * POST /api/referral/consume — atomically mark a wallet's first-ramp referral
 * discount as consumed. Rejects if this wallet has already used it, so the
 * one-time discount cannot be replayed by clearing client-side state.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as { wallet?: string }
  const { wallet } = body

  if (!wallet) {
    return NextResponse.json({ error: 'wallet required' }, { status: 400 })
  }

  if (consumedDiscountWallets.has(wallet)) {
    return NextResponse.json(
      { error: 'Referral discount already used for this wallet' },
      { status: 409 }
    )
  }

  consumedDiscountWallets.add(wallet)
  return NextResponse.json({ success: true })
}
