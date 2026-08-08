import { NextResponse } from 'next/server'
import { captureError } from '@/lib/observability'

const COINGECKO_ETH_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'

const CACHE_KEY = 'exchange-rates:ethereum-usd'
const CACHE_TTL_SECONDS = 60

type EthereumRate = { ethereum: { usd: number } }

export async function GET() {
  try {
    const cached = await redis.get<EthereumRate>(CACHE_KEY)

    if (cached) {
      return NextResponse.json(cached, {
        headers: { 'X-Cache': 'HIT' },
      })
    }
  } catch {
    // Continue to CoinGecko when the cache is unavailable.
  }

  try {
    const res = await fetch(COINGECKO_ETH_URL, {
      headers: { 'User-Agent': 'Aframp/1.0', Accept: 'application/json' },
      cache: 'no-store',
    })

    if (!res.ok) throw new Error(`CoinGecko responded ${res.status}`)

    const data = (await res.json()) as EthereumRate

    if (!data?.ethereum?.usd) throw new Error('Unexpected CoinGecko response shape')

    try {
      await redis.set(CACHE_KEY, data, { ex: CACHE_TTL_SECONDS })
    } catch {
      // Return fresh rates even when the cache write fails.
    }

    return NextResponse.json(data, { headers: { 'X-Cache': 'MISS' } })
  } catch (err) {
    // Serve stale cache as fallback rather than failing
    if (cache) {
      return NextResponse.json(cache.data, {
        headers: { 'X-Cache': 'STALE' },
        status: 200,
      })
    }

    captureError(err, { tags: { domain: 'rates', operation: 'eth-price-fetch' } })
    const message = err instanceof Error ? err.message : 'Failed to fetch rates'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
