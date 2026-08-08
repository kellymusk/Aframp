import { NextRequest, NextResponse } from 'next/server'
import { getProvider, MobileMoneyError } from '@/lib/payments'
import type { MobileMoneyProviderName } from '@/lib/payments'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ transactionId: string }> }
) {
  const { transactionId } = await context.params

  // Provider name is passed as a query param so the status endpoint is stateless
  const providerName = request.nextUrl.searchParams.get('provider') as MobileMoneyProviderName | null

  if (!providerName || !['mpesa', 'mtn_momo', 'flutterwave'].includes(providerName)) {
    return NextResponse.json(
      { error: 'provider query param is required and must be "mpesa", "mtn_momo", or "flutterwave"' },
      { status: 400 }
    )
  }

  try {
    const provider = getProvider(providerName)
    const status = await provider.getStatus(transactionId)

    return NextResponse.json({ transactionId, status, provider: providerName })
  } catch (err) {
    if (err instanceof MobileMoneyError) {
      return NextResponse.json(
        { transactionId, status: err.code, provider: providerName, error: err.message },
        { status: 200 } // 200 so the client can read the terminal status
      )
    }

    console.error('[mobile-money/status]', err)
    return NextResponse.json({ error: 'Status check failed' }, { status: 500 })
  }
}
