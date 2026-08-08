import { Redis } from '@upstash/redis'

const COINGECKO_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=ngn'

const RATE_LOCK_TTL_SECONDS = 15 * 60
const OFFRAMP_SPREAD_BPS = Number(process.env.OFFRAMP_SPREAD_BPS ?? 150) // 1.5% default spread

export interface OfframpRate {
  pair: string
  rate: number
  spreadBps: number
  lockedAt: number
  expiresAt: number
}

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

async function fetchMarketRate(): Promise<number> {
  const response = await fetch(COINGECKO_URL, {
    headers: { 'User-Agent': 'Aframp/1.0', Accept: 'application/json' },
    next: { revalidate: 20 },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch market rate: ${response.status}`)
  }

  const data = await response.json()
  const rate = data?.['usd-coin']?.ngn

  if (typeof rate !== 'number') {
    throw new Error('Market rate unavailable')
  }

  return rate
}

// Fetches the live market rate, applies the offramp spread/fee, and locks the
// resulting rate for 15 minutes so a user's quote doesn't move mid-flow.
export async function getLockedOfframpRate(pair = 'USDC-NGN'): Promise<OfframpRate> {
  const redis = getRedis()
  const cacheKey = `offramp:rate:${pair}`

  if (redis) {
    const cached = await redis.get<OfframpRate>(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return cached
    }
  }

  const marketRate = await fetchMarketRate()
  const rate = Number((marketRate * (1 - OFFRAMP_SPREAD_BPS / 10000)).toFixed(2))
  const lockedAt = Date.now()
  const locked: OfframpRate = {
    pair,
    rate,
    spreadBps: OFFRAMP_SPREAD_BPS,
    lockedAt,
    expiresAt: lockedAt + RATE_LOCK_TTL_SECONDS * 1000,
  }

  if (redis) {
    await redis.set(cacheKey, locked, { ex: RATE_LOCK_TTL_SECONDS })
  }

  return locked
}
