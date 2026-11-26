import type { Balance } from '@/lib/api'
import { STROOPS_PER_UNIT } from '@/lib/money'

const RATE_SCALE = 1_000_000n
const RATES_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=stellar,usd-coin&vs_currencies=ngn'

export interface NgnRates {
  XLM: bigint
  USDC: bigint
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toScaledRate(value: unknown, asset: string): bigint {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(`The market rate for ${asset} is invalid.`)
  }

  const scaled = Math.round(value * Number(RATE_SCALE))
  if (!Number.isSafeInteger(scaled) || scaled <= 0) {
    throw new Error(`The market rate for ${asset} is outside the supported range.`)
  }

  return BigInt(scaled)
}

export async function fetchNgnRates(signal?: AbortSignal): Promise<NgnRates> {
  const response = await fetch(RATES_URL, { signal })
  if (!response.ok) {
    throw new Error(`Market rates could not be loaded (HTTP ${response.status}).`)
  }

  const data: unknown = await response.json()
  if (!isRecord(data) || !isRecord(data.stellar) || !isRecord(data['usd-coin'])) {
    throw new Error('The market rates response is incomplete.')
  }

  return {
    XLM: toScaledRate(data.stellar.ngn, 'XLM'),
    USDC: toScaledRate(data['usd-coin'].ngn, 'USDC'),
  }
}

/**
 * Returns the rounded NGN value of available balances, or null if an asset
 * cannot be valued. Rates are stored as NGN per unit, scaled to six decimals.
 */
export function estimateAvailableNgn(balances: Balance[], rates: NgnRates): bigint | null {
  let scaledTotal = 0n

  for (const balance of balances) {
    let rate: bigint
    switch (balance.asset) {
      case 'cNGN':
        rate = RATE_SCALE
        break
      case 'XLM':
        rate = rates.XLM
        break
      case 'USDC':
        rate = rates.USDC
        break
      default:
        if (balance.available === 0n) continue
        return null
    }

    scaledTotal += balance.available * rate
  }

  const divisor = STROOPS_PER_UNIT * RATE_SCALE
  return (scaledTotal + divisor / 2n) / divisor
}
