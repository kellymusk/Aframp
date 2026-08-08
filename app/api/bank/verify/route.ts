import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const accountNumber = request.nextUrl.searchParams.get('accountNumber')
  const bankCode = request.nextUrl.searchParams.get('bankCode')

  if (!accountNumber || accountNumber.length !== 10 || !bankCode) {
    return NextResponse.json(
      { error: 'A valid accountNumber and bankCode are required' },
      { status: 400 }
    )
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey) {
    console.error('PAYSTACK_SECRET_KEY is not configured')
    return NextResponse.json({ error: 'Bank verification is not configured' }, { status: 503 })
  }

  try {
    const response = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
      }
    )

    const result = await response.json().catch(() => null)

    if (!response.ok || !result?.status) {
      return NextResponse.json(
        { error: result?.message || 'Invalid account number or verification failed' },
        { status: response.status === 200 ? 422 : response.status }
      )
    }

    return NextResponse.json({ accountName: result.data.account_name })
  } catch (error) {
    console.error('Bank account verification failed', error)
    return NextResponse.json({ error: 'Unable to verify account at this time' }, { status: 502 })
  }
}
