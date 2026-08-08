/**
 * Bank directory for offramp payouts.
 *
 * Server-side helpers live here alongside the shared `Bank` shape so
 * /api/offramp/banks and the client bank service agree on one contract.
 *
 * A note on why there is only one static list.  A bank code routes money; a
 * wrong one routes it to the wrong institution.  The Nigerian list below is
 * pre-existing, reviewed NIBSS data, so it is safe as an offline fallback.  For
 * the other markets we do not hold a verified code table, and inventing one
 * would be worse than having none — so when Paystack is unavailable those
 * countries fall back to the customer typing their bank name, which a human
 * settles against, rather than to a code we guessed.
 */

import {
  getOfframpCountry,
  OFFRAMP_COUNTRIES,
  type OfframpCountryCode,
} from '@/lib/offramp/countries'

export interface Bank {
  id: string
  name: string
  /** Clearing / branch code used to route the payout. */
  code: string
  logo?: string
  /** Paystack distinguishes plain bank accounts from mobile money wallets. */
  type?: 'bank' | 'mobile_money'
  country: OfframpCountryCode
}

/** Where a returned bank list came from — surfaced so the UI can be honest. */
export type BankListSource = 'paystack' | 'static' | 'unavailable'

export interface BankListResult {
  country: OfframpCountryCode
  currency: string
  source: BankListSource
  banks: Bank[]
}

/**
 * Nigerian banks (NIBSS codes).
 *
 * Kept as the offline fallback for Nigeria and still exported under its original
 * name because other modules import it directly.
 */
export const NIGERIAN_BANKS: Bank[] = [
  {
    id: 'ng-044',
    name: 'Access Bank',
    code: '044',
    logo: 'https://nigerianbanks.xyz/logo/access-bank.png',
    type: 'bank',
    country: 'NG',
  },
  {
    id: 'ng-058',
    name: 'Guaranty Trust Bank',
    code: '058',
    logo: 'https://nigerianbanks.xyz/logo/guaranty-trust-bank.png',
    type: 'bank',
    country: 'NG',
  },
  {
    id: 'ng-011',
    name: 'First Bank of Nigeria',
    code: '011',
    logo: 'https://nigerianbanks.xyz/logo/first-bank-of-nigeria.png',
    type: 'bank',
    country: 'NG',
  },
  {
    id: 'ng-033',
    name: 'United Bank for Africa',
    code: '033',
    logo: 'https://nigerianbanks.xyz/logo/united-bank-for-africa.png',
    type: 'bank',
    country: 'NG',
  },
  {
    id: 'ng-057',
    name: 'Zenith Bank',
    code: '057',
    logo: 'https://nigerianbanks.xyz/logo/zenith-bank.png',
    type: 'bank',
    country: 'NG',
  },
  {
    id: 'ng-221',
    name: 'Stanbic IBTC Bank',
    code: '221',
    logo: 'https://nigerianbanks.xyz/logo/stanbic-ibtc-bank.png',
    type: 'bank',
    country: 'NG',
  },
  {
    id: 'ng-232',
    name: 'Sterling Bank',
    code: '232',
    logo: 'https://nigerianbanks.xyz/logo/sterling-bank.png',
    type: 'bank',
    country: 'NG',
  },
  {
    id: 'ng-032',
    name: 'Union Bank of Nigeria',
    code: '032',
    logo: 'https://nigerianbanks.xyz/logo/union-bank-of-nigeria.png',
    type: 'bank',
    country: 'NG',
  },
  {
    id: 'ng-035',
    name: 'Wema Bank',
    code: '035',
    logo: 'https://nigerianbanks.xyz/logo/wema-bank.png',
    type: 'bank',
    country: 'NG',
  },
  {
    id: 'ng-070',
    name: 'Fidelity Bank',
    code: '070',
    logo: 'https://nigerianbanks.xyz/logo/fidelity-bank.png',
    type: 'bank',
    country: 'NG',
  },
  {
    id: 'ng-50211',
    name: 'Kuda Bank',
    code: '50211',
    logo: 'https://nigerianbanks.xyz/logo/kuda-bank.png',
    type: 'bank',
    country: 'NG',
  },
  {
    id: 'ng-999992',
    name: 'OPay',
    code: '999992',
    logo: 'https://nigerianbanks.xyz/logo/opay.png',
    type: 'bank',
    country: 'NG',
  },
  {
    id: 'ng-999991',
    name: 'Palmpay',
    code: '999991',
    logo: 'https://nigerianbanks.xyz/logo/palmpay.png',
    type: 'bank',
    country: 'NG',
  },
  {
    id: 'ng-50515',
    name: 'Moniepoint',
    code: '50515',
    logo: 'https://nigerianbanks.xyz/logo/moniepoint.png',
    type: 'bank',
    country: 'NG',
  },
  {
    id: 'ng-214',
    name: 'First City Monument Bank',
    code: '214',
    logo: 'https://nigerianbanks.xyz/logo/first-city-monument-bank.png',
    type: 'bank',
    country: 'NG',
  },
]

/** Offline fallbacks, by country. Absent countries fall back to manual entry. */
const STATIC_BANKS: Partial<Record<OfframpCountryCode, Bank[]>> = {
  NG: NIGERIAN_BANKS,
}

export function getStaticBanks(code: OfframpCountryCode): Bank[] {
  return STATIC_BANKS[code] ?? []
}

/** Finds a bank in the static list — used to recover a logo for saved accounts. */
export function findStaticBank(code: OfframpCountryCode, bankCode: string): Bank | undefined {
  return getStaticBanks(code).find((bank) => bank.code === bankCode)
}

interface PaystackBank {
  id?: number
  name?: string
  code?: string
  slug?: string
  currency?: string
  type?: string
  active?: boolean
}

/**
 * Fetches a country's bank list from Paystack.  Server-only: it reads the
 * secret key.
 *
 * Returns null when Paystack is not configured or the call fails, leaving the
 * fallback decision to the caller.
 */
export async function fetchPaystackBanks(code: OfframpCountryCode): Promise<Bank[] | null> {
  const country = OFFRAMP_COUNTRIES[code]
  const secretKey = process.env.PAYSTACK_SECRET_KEY

  if (!secretKey || !country.paystackSlug) return null

  const url = new URL('https://api.paystack.co/bank')
  url.searchParams.set('country', country.paystackSlug)
  url.searchParams.set('currency', country.currency)
  url.searchParams.set('perPage', '200')

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${secretKey}` },
      // Bank directories change a few times a year. A day of cache keeps the
      // form fast and well inside Paystack's rate limits.
      next: { revalidate: 86_400 },
    })

    if (!response.ok) {
      console.error(`[offramp/banks] Paystack returned ${response.status} for ${code}`)
      return null
    }

    const payload = (await response.json()) as { status?: boolean; data?: PaystackBank[] }
    if (!payload.status || !Array.isArray(payload.data)) return null

    return normalizePaystackBanks(payload.data, code)
  } catch (error) {
    console.error(`[offramp/banks] Paystack request failed for ${code}`, error)
    return null
  }
}

/** Maps Paystack's payload onto `Bank`, dropping entries we cannot route to. */
export function normalizePaystackBanks(data: PaystackBank[], code: OfframpCountryCode): Bank[] {
  const seen = new Set<string>()

  return data
    .filter((bank) => bank.active !== false && bank.name && bank.code)
    .map((bank) => ({
      id: `${code.toLowerCase()}-${bank.code}`,
      name: bank.name!.trim(),
      code: bank.code!,
      type: bank.type === 'mobile_money' ? ('mobile_money' as const) : ('bank' as const),
      country: code,
    }))
    .filter((bank) => {
      // Paystack can list the same code more than once (per-currency rows).
      if (seen.has(bank.code)) return false
      seen.add(bank.code)
      return true
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * The bank list for a country, preferring Paystack and falling back to the
 * static table.  `source: 'unavailable'` means the customer must type the bank
 * name — see the module comment for why we do not substitute a guessed list.
 */
export async function getBankList(code: OfframpCountryCode): Promise<BankListResult> {
  const country = getOfframpCountry(code)

  if (country.bankDirectory === 'paystack') {
    const banks = await fetchPaystackBanks(code)
    if (banks && banks.length > 0) {
      return { country: code, currency: country.currency, source: 'paystack', banks }
    }
  }

  const fallback = getStaticBanks(code)
  return {
    country: code,
    currency: country.currency,
    source: fallback.length > 0 ? 'static' : 'unavailable',
    banks: fallback,
  }
}
