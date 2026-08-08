import { NextResponse } from 'next/server'
import { captureError } from '@/lib/observability'

const COINGECKO_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=usd-coin,stellar&vs_currencies=ngn,kes,ghs,zar,ugx'

const CACHE_KEY = 'exchange-rates'
const CACHE_TTL_SECONDS = 60

type ExchangeRates = Record<string, Record<string, number>>

export async function GET() {
  try {
    const cached = await redis.get<ExchangeRates>(CACHE_KEY)

    if (cached) {
      return NextResponse.json(cached, {
        headers: { 'X-Cache': 'HIT' },
      })
    }
  } catch {
    // Continue to CoinGecko when the cache is unavailable.
  }

  try {
    const response = await fetch(COINGECKO_URL, {
      cache: 'no-store',
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
  } catch (err) {
    captureError(err, {
      tags: { domain: 'rates', operation: 'exchange-rate-fetch' },
    })
    return NextResponse.json({ error: 'Unable to fetch exchange rates' }, { status: 500 })
  }
}
