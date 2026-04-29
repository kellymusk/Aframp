import { NextResponse } from 'next/server'

const COINGECKO_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=usd-coin,stellar&vs_currencies=ngn,kes,ghs,zar,ugx'

export async function GET() {
  try {
    const response = await fetch(COINGECKO_URL, {
      next: { revalidate: 20 },
      headers: {
        'User-Agent': 'Aframp/1.0',
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch rates' }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Unable to fetch exchange rates' }, { status: 500 })
  }
}
