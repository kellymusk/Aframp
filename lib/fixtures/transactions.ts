/**
 * Synthetic transaction fixtures for the dashboard Transaction History demo.
 * Not real payment data.
 */

export type TransactionType = 'onramp' | 'offramp' | 'billpay'
export type TransactionStatus = 'pending' | 'completed' | 'failed'

export interface Transaction {
  id: string
  /** ISO timestamp */
  date: string
  type: TransactionType
  /** Amount in stroops (1 unit = 10^7 stroops), matching the bigint money model. */
  amountStroops: bigint
  asset: string
  counterparty: string
  status: TransactionStatus
}

export const STROOPS_PER_UNIT = BigInt(10_000_000)

/** Assets that have a cash-out (offramp) route. */
export const OFFRAMP_ASSETS = ['cNGN', 'cKES', 'cGHS'] as const

/** Fixed reference "now" so fixtures are deterministic (SSR-safe, test-stable). */
export const FIXTURE_NOW = Date.UTC(2026, 1, 26, 9, 0, 0)

const MINUTE = 60_000

/** Convert whole/fractional display units to stroops without float drift beyond 7dp. */
export function unitsToStroops(units: number): bigint {
  return BigInt(Math.round(units * 10_000_000))
}

/** Format stroops as a 2dp display string using integer math. */
export function formatStroops(stroops: bigint): string {
  const cents = (stroops + BigInt(50_000)) / BigInt(100_000) // round to 2dp
  const whole = cents / BigInt(100)
  const frac = (cents % BigInt(100)).toString().padStart(2, '0')
  return `${whole.toLocaleString('en-US')}.${frac}`
}

function ago(minutes: number): string {
  return new Date(FIXTURE_NOW - minutes * MINUTE).toISOString()
}

export const mockTransactions: Transaction[] = [
  {
    id: 'ONR-240191',
    date: ago(38),
    type: 'onramp',
    amountStroops: unitsToStroops(15000),
    asset: 'cNGN',
    counterparty: 'From Zenith Bank',
    status: 'completed',
  },
  {
    id: 'BIL-240178',
    date: ago(16 * 60 + 49),
    type: 'billpay',
    amountStroops: unitsToStroops(5500),
    asset: 'cNGN',
    counterparty: 'To IKEDC Electricity',
    status: 'completed',
  },
  {
    id: 'ONR-240173',
    date: ago(21 * 60 + 25),
    type: 'onramp',
    amountStroops: unitsToStroops(25000),
    asset: 'cNGN',
    counterparty: 'From Access Bank',
    status: 'pending',
  },
  {
    id: 'BIL-240162',
    date: ago(47 * 60 + 17),
    type: 'billpay',
    amountStroops: unitsToStroops(2100),
    asset: 'cNGN',
    counterparty: 'To Glo Airtime',
    status: 'failed',
  },
  {
    id: 'ONR-240158',
    date: ago(36 * 60 + 50),
    type: 'onramp',
    amountStroops: unitsToStroops(8000),
    asset: 'cNGN',
    counterparty: 'From GTBank',
    status: 'completed',
  },
  {
    id: 'BIL-240151',
    date: ago(48 * 60 + 23),
    type: 'billpay',
    amountStroops: unitsToStroops(4300),
    asset: 'cNGN',
    counterparty: 'To DSTV',
    status: 'completed',
  },
  {
    id: 'OFF-240144',
    date: ago(58 * 60 + 31),
    type: 'offramp',
    amountStroops: unitsToStroops(16000),
    asset: 'cNGN',
    counterparty: 'To Opay Wallet',
    status: 'completed',
  },
  {
    id: 'ONR-240132',
    date: ago(70 * 60 + 56),
    type: 'onramp',
    amountStroops: unitsToStroops(10000),
    asset: 'cNGN',
    counterparty: 'From Moniepoint',
    status: 'failed',
  },
]
