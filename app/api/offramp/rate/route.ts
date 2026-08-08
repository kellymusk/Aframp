import { NextRequest, NextResponse } from 'next/server'
import { getLockedOfframpRate } from '@/lib/offramp/rate-service'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const pair = request.nextUrl.searchParams.get('pair') ?? 'USDC-NGN'

  try {
    const rate = await getLockedOfframpRate(pair)
    return NextResponse.json(rate)
  } catch (error) {
    console.error('Failed to compute offramp exchange rate', error)
    return NextResponse.json({ error: 'Unable to fetch exchange rate' }, { status: 502 })
  }
}
