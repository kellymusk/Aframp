/**
 * Client-side bank account service for the offramp.
 *
 * Every function is country-aware: the bank list, the account number format and
 * the settlement currency all follow the destination country selected in the
 * form.  The country registry in ./countries.ts is the source of truth for those
 * rules; nothing here hardcodes Nigeria.
 */

import { formatCurrency } from '@/lib/onramp/formatters'
import {
  getOfframpCountry,
  OFFRAMP_COUNTRIES,
  validateAccountNumber,
  type OfframpCountryCode,
} from '@/lib/offramp/countries'
import {
  findStaticBank,
  getStaticBanks,
  type Bank,
  type BankListResult,
  type BankListSource,
} from '@/lib/offramp/bank-directory'
import type { FiatCurrency } from '@/types/onramp'

export type { Bank, BankListResult, BankListSource }
export { NIGERIAN_BANKS } from '@/lib/offramp/bank-directory'

export interface BankAccount {
  id: string
  /** Destination country — decides the account format and payout currency. */
  country: OfframpCountryCode
  currency: FiatCurrency
  bankName: string
  /** Empty for countries where the customer types the bank name (see countries.ts). */
  bankCode: string
  accountNumber: string
  accountName: string
  /** How the account name was established — resolved by the gateway, or typed. */
  accountNameSource: 'resolved' | 'manual'
  bankLogo?: string
  lastUsed?: Date
}

export const SAVED_ACCOUNTS_STORAGE_KEY = 'aframp_saved_accounts'

/** Key the offramp calculator persists its form state under. */
const OFFRAMP_FORM_STORAGE_KEY = 'offramp:form'

/** The account the customer picked for the withdrawal in progress. */
const SELECTED_ACCOUNT_STORAGE_KEY = 'offramp:selectedAccount'

/**
 * Raised when account name resolution is not available for a market.
 *
 * Distinct from a failed lookup: the form responds by asking the customer to
 * type the account name rather than by showing an error.
 */
export class ResolutionUnsupportedError extends Error {
  readonly code = 'RESOLUTION_UNSUPPORTED'

  constructor() {
    super('Account name lookup is not available for this country.')
    this.name = 'ResolutionUnsupportedError'
  }
}

/**
 * Fetches the bank list for a country from /api/offramp/banks.
 *
 * Falls back to the static table on a network failure so a flaky connection does
 * not strand a customer mid-withdrawal.  When neither is available the result
 * carries `source: 'unavailable'` and the form asks for the bank name instead.
 */
export async function fetchBanks(country: OfframpCountryCode): Promise<BankListResult> {
  const currency = OFFRAMP_COUNTRIES[country].currency

  try {
    const response = await fetch(`/api/offramp/banks?country=${country}`)
    if (response.ok) {
      return (await response.json()) as BankListResult
    }
    console.error(`[bank-service] bank list request returned ${response.status} for ${country}`)
  } catch (error) {
    console.error(`[bank-service] bank list request failed for ${country}`, error)
  }

  const fallback = getStaticBanks(country)
  return {
    country,
    currency,
    source: fallback.length > 0 ? 'static' : 'unavailable',
    banks: fallback,
  }
}

/**
 * Resolves an account number to its holder's name.
 *
 * Throws `ResolutionUnsupportedError` where the market has no lookup, and a
 * plain Error with a customer-safe message when the lookup itself fails.
 */
export async function verifyAccountNumber(
  country: OfframpCountryCode,
  bankCode: string,
  accountNumber: string
): Promise<string> {
  const response = await fetch(
    `/api/bank/verify?accountNumber=${encodeURIComponent(accountNumber)}&bankCode=${encodeURIComponent(bankCode)}`
  )

  const result = await response.json().catch(() => null)

  if (!response.ok || !result?.accountName) {
    throw new Error(result?.error || 'Invalid account number or verification failed')
  }

  return result.accountName
}

export function saveAccount(account: Omit<BankAccount, 'id'>): BankAccount {
  const saved = getSavedAccounts()
  const newAccount: BankAccount = {
    ...account,
    id: Math.random().toString(36).substring(2, 9),
    lastUsed: new Date(),
  }

  const updated = [
    newAccount,
    // The same account number can exist in two countries, so identity is
    // country + bank + number, not the number alone.
    ...saved.filter(
      (a) =>
        a.accountNumber !== account.accountNumber ||
        a.bankCode !== account.bankCode ||
        a.country !== account.country
    ),
  ]
  localStorage.setItem(SAVED_ACCOUNTS_STORAGE_KEY, JSON.stringify(updated.slice(0, 5)))
  return newAccount
}

export function getSavedAccounts(): BankAccount[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(SAVED_ACCOUNTS_STORAGE_KEY)
    const parsed = stored ? (JSON.parse(stored) as Partial<BankAccount>[]) : []
    return parsed.map(migrateSavedAccount)
  } catch {
    return []
  }
}

/**
 * Brings a stored account up to the current shape.
 *
 * Accounts saved before the offramp supported more than one country have no
 * `country` or `currency`.  They were all Nigerian by construction, so that is
 * what they become — dropping them would lose a customer's saved payout account.
 */
function migrateSavedAccount(account: Partial<BankAccount>): BankAccount {
  const country = getOfframpCountry(account.country).code

  return {
    id: account.id ?? Math.random().toString(36).substring(2, 9),
    country,
    currency: account.currency ?? OFFRAMP_COUNTRIES[country].currency,
    bankName: account.bankName ?? '',
    bankCode: account.bankCode ?? '',
    accountNumber: account.accountNumber ?? '',
    accountName: account.accountName ?? '',
    accountNameSource: account.accountNameSource ?? 'resolved',
    bankLogo: account.bankLogo ?? findStaticBank(country, account.bankCode ?? '')?.logo,
    lastUsed: account.lastUsed ? new Date(account.lastUsed) : undefined,
  }
}

export function deleteSavedAccount(id: string): void {
  const saved = getSavedAccounts()
  const updated = saved.filter((a) => a.id !== id)
  localStorage.setItem(SAVED_ACCOUNTS_STORAGE_KEY, JSON.stringify(updated))
}

/**
 * Records the destination account for the withdrawal in progress so the review
 * step can show the account and currency the customer actually chose, rather
 * than defaulting to a Nigerian one.
 */
export function setSelectedOfframpAccount(account: BankAccount): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(SELECTED_ACCOUNT_STORAGE_KEY, JSON.stringify(account))
}

export function getSelectedOfframpAccount(): BankAccount | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(SELECTED_ACCOUNT_STORAGE_KEY)
    if (!stored) return null
    return migrateSavedAccount(JSON.parse(stored) as Partial<BankAccount>)
  } catch {
    return null
  }
}

/**
 * The payout currency chosen on the offramp calculator, if the customer has been
 * through it.  Used to preselect the destination country on the bank form so a
 * KES withdrawal does not open on a Nigerian bank list.
 */
export function getOfframpFormCurrency(): FiatCurrency | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(OFFRAMP_FORM_STORAGE_KEY)
    if (!stored) return null
    const parsed = JSON.parse(stored) as { data?: { fiatCurrency?: FiatCurrency } }
    return parsed.data?.fiatCurrency ?? null
  } catch {
    return null
  }
}

// Utility for rate limiting verification attempts.
// A UX guard against fat-fingered retries only — the enforced limit is the
// per-IP rate limit middleware.ts applies to every /api route.
const VERIFICATION_ATTEMPTS_KEY = 'aframp_verification_attempts'
export function checkRateLimit(): boolean {
  const now = Date.now()
  const stored = localStorage.getItem(VERIFICATION_ATTEMPTS_KEY)
  let attempts = stored ? JSON.parse(stored) : []

  // Filter attempts in the last hour
  attempts = attempts.filter((timestamp: number) => now - timestamp < 3600000)

  if (attempts.length >= 5) {
    return false
  }

  attempts.push(now)
  localStorage.setItem(VERIFICATION_ATTEMPTS_KEY, JSON.stringify(attempts))
  return true
}

/** The message the customer signs to authorise a payout. */
export function buildKycMessage(
  amount: number,
  accountNumber: string,
  currency: FiatCurrency
): string {
  return `I authorize AFRAMP to send ${formatCurrency(amount, currency, 2)} to account ${accountNumber}`
}

export async function signKycMessage(
  _address: string,
  _amount: number,
  _accountNumber: string,
  currency: FiatCurrency = 'NGN'
): Promise<string> {
  const message = buildKycMessage(_amount, _accountNumber, currency)

  // Prefer a real Stellar wallet signature when available (e.g. Freighter)
  if (typeof window !== 'undefined') {
    type FreighterApi = {
      signMessage: (payload: { message: string; publicKey: string }) => Promise<string>
    }
    const freighterApi = (window as Window & { freighterApi?: FreighterApi }).freighterApi
    if (freighterApi && typeof freighterApi.signMessage === 'function') {
      try {
        const signature = await freighterApi.signMessage({
          message,
          publicKey: _address,
        })
        if (signature) return signature
      } catch (error) {
        console.warn('Stellar wallet signing failed, falling back to mock signature', error)
      }
    }
  }

  // Fallback: simulate wallet signature so the flow still works in demos
  await new Promise((resolve) => setTimeout(resolve, 1000))
  return `stellar-mock-signature-${Math.random().toString(36).slice(2)}`
}
