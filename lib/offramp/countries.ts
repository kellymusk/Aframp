/**
 * Offramp destination countries.
 *
 * The offramp used to be Nigeria-only: a NUBAN-shaped account field, a hardcoded
 * list of Nigerian banks, and a naira sign baked into the KYC message.  This
 * module is the single place that describes a payout market, so the form, the
 * API routes and the validation all read the same table.
 *
 * Scope is the five markets the platform already models a fiat currency for
 * (see `FiatCurrency` in types/onramp.ts and the `jurisdiction` enum in
 * app/api/withdrawals/route.ts).  The remaining mobile-money markets in
 * lib/payments/regions.ts have no offramp currency, rate or withdrawal limit
 * yet, so a bank form for them would have nothing to settle in.
 */

import type { FiatCurrency } from '@/types/onramp'

export type OfframpCountryCode = 'NG' | 'GH' | 'KE' | 'ZA' | 'UG'

/**
 * Where the bank list for a country comes from.
 *
 * `paystack` — Paystack publishes a bank directory for this country, fetched
 *              server-side by /api/offramp/banks.
 * `manual`   — no directory we can trust, so the customer types the bank name.
 *              Guessing bank codes is worse than asking: a wrong code routes
 *              money to the wrong institution.
 */
export type BankDirectorySource = 'paystack' | 'manual'

export interface AccountNumberRule {
  /** Field label, e.g. "Account Number (10 digits)". */
  label: string
  placeholder: string
  minLength: number
  maxLength: number
  /** Whether letters are permitted alongside digits. */
  allowsLetters: boolean
  /** Help text shown under the field. */
  hint: string
}

export interface OfframpCountry {
  code: OfframpCountryCode
  name: string
  /** Demonym used in customer-facing copy, e.g. "Nigerian bank account". */
  adjective: string
  currency: FiatCurrency
  bankDirectory: BankDirectorySource
  /**
   * The `country` query value Paystack's GET /bank expects.  Null when the
   * directory is manual.
   */
  paystackSlug: string | null
  /**
   * Whether Paystack can resolve an account number to its holder's name for
   * this country.  Where it cannot, the customer types the name and confirms it
   * — the transfer is still screened downstream by /api/withdrawals.
   */
  supportsNameResolution: boolean
  account: AccountNumberRule
}

/**
 * Account number shapes.
 *
 * Only Nigeria has a single fixed national format (NUBAN, exactly 10 digits).
 * Elsewhere the length varies by bank, so these are deliberately permissive
 * length/charset guards: they catch typos and obviously wrong input without
 * rejecting a valid account from a bank whose format we did not enumerate.
 * The real check on the destination is the account holder name — resolved where
 * Paystack supports it, confirmed by the customer where it does not.
 */
export const OFFRAMP_COUNTRIES: Record<OfframpCountryCode, OfframpCountry> = {
  NG: {
    code: 'NG',
    name: 'Nigeria',
    adjective: 'Nigerian',
    currency: 'NGN',
    bankDirectory: 'paystack',
    paystackSlug: 'nigeria',
    supportsNameResolution: true,
    account: {
      label: 'Account Number (10 digits)',
      placeholder: '0123456789',
      minLength: 10,
      maxLength: 10,
      allowsLetters: false,
      hint: 'Your 10-digit NUBAN account number.',
    },
  },
  GH: {
    code: 'GH',
    name: 'Ghana',
    adjective: 'Ghanaian',
    currency: 'GHS',
    bankDirectory: 'paystack',
    paystackSlug: 'ghana',
    supportsNameResolution: true,
    account: {
      label: 'Account Number',
      placeholder: '1234567890123',
      minLength: 8,
      maxLength: 17,
      allowsLetters: false,
      hint: 'Ghanaian account numbers are usually 13 digits, but vary by bank.',
    },
  },
  KE: {
    code: 'KE',
    name: 'Kenya',
    adjective: 'Kenyan',
    currency: 'KES',
    bankDirectory: 'paystack',
    paystackSlug: 'kenya',
    // Paystack's resolve endpoint does not cover Kenyan banks.
    supportsNameResolution: false,
    account: {
      label: 'Account Number',
      placeholder: '01234567890',
      minLength: 6,
      maxLength: 20,
      allowsLetters: true,
      hint: 'Length varies by bank. Some Kenyan account numbers include letters.',
    },
  },
  ZA: {
    code: 'ZA',
    name: 'South Africa',
    adjective: 'South African',
    currency: 'ZAR',
    bankDirectory: 'paystack',
    paystackSlug: 'south africa',
    supportsNameResolution: false,
    account: {
      label: 'Account Number',
      placeholder: '1234567890',
      minLength: 6,
      maxLength: 13,
      allowsLetters: false,
      // The bank's universal branch code comes from the selected bank, so
      // there is no separate branch-code field to fill in.
      hint: 'Between 6 and 13 digits. The branch code is taken from your bank.',
    },
  },
  UG: {
    code: 'UG',
    name: 'Uganda',
    adjective: 'Ugandan',
    currency: 'UGX',
    // Paystack publishes no Ugandan bank directory.
    bankDirectory: 'manual',
    paystackSlug: null,
    supportsNameResolution: false,
    account: {
      label: 'Account Number',
      placeholder: '1234567890123',
      minLength: 8,
      maxLength: 20,
      allowsLetters: true,
      hint: 'Ugandan account numbers are usually 13 digits, but vary by bank.',
    },
  },
}

/** Country codes in the order they should be offered. */
export const OFFRAMP_COUNTRY_CODES = Object.keys(OFFRAMP_COUNTRIES) as OfframpCountryCode[]

export const DEFAULT_OFFRAMP_COUNTRY: OfframpCountryCode = 'NG'

export function isOfframpCountryCode(value: unknown): value is OfframpCountryCode {
  return typeof value === 'string' && value.toUpperCase() in OFFRAMP_COUNTRIES
}

/**
 * Looks up a country, falling back to the default.
 *
 * Callers deal in strings from localStorage and query params, and a missing
 * country should degrade to Nigeria rather than crash a form mid-flow.  Use
 * `isOfframpCountryCode` first where an unknown value must be rejected — the
 * API routes do.
 */
export function getOfframpCountry(code: string | null | undefined): OfframpCountry {
  if (!code || !isOfframpCountryCode(code)) return OFFRAMP_COUNTRIES[DEFAULT_OFFRAMP_COUNTRY]
  return OFFRAMP_COUNTRIES[code.toUpperCase() as OfframpCountryCode]
}

/** The country that settles in `currency`, or null if none does. */
export function countryForCurrency(currency: FiatCurrency): OfframpCountry | null {
  return (
    OFFRAMP_COUNTRY_CODES.map((code) => OFFRAMP_COUNTRIES[code]).find(
      (country) => country.currency === currency
    ) ?? null
  )
}

/**
 * Strips characters the country's format does not allow and caps the length.
 *
 * Runs on every keystroke so the field cannot hold input that could never
 * validate.  Letters are upper-cased where they are allowed, because bank
 * account references are conventionally upper-case and it keeps the saved value
 * comparable.
 */
export function sanitizeAccountNumber(code: OfframpCountryCode, raw: string): string {
  const { allowsLetters, maxLength } = OFFRAMP_COUNTRIES[code].account
  const pattern = allowsLetters ? /[^0-9a-zA-Z]/g : /\D/g
  return raw.replace(pattern, '').toUpperCase().slice(0, maxLength)
}

/**
 * Validates an account number against its country's format.
 *
 * Returns null when valid, otherwise a message safe to show the customer.
 */
export function validateAccountNumber(code: OfframpCountryCode, value: string): string | null {
  const { account, name } = OFFRAMP_COUNTRIES[code]
  const trimmed = value.trim()

  if (!trimmed) return 'Enter your account number.'

  const allowed = account.allowsLetters ? /^[0-9A-Za-z]+$/ : /^\d+$/
  if (!allowed.test(trimmed)) {
    return account.allowsLetters
      ? 'Account numbers can only contain letters and digits.'
      : `${name} account numbers can only contain digits.`
  }

  if (account.minLength === account.maxLength) {
    if (trimmed.length !== account.minLength) {
      return `${name} account numbers are ${account.minLength} digits.`
    }
    return null
  }

  if (trimmed.length < account.minLength) {
    return `Account number must be at least ${account.minLength} characters.`
  }
  if (trimmed.length > account.maxLength) {
    return `Account number must be at most ${account.maxLength} characters.`
  }

  return null
}

/** Whether `value` is a complete, well-formed account number for `code`. */
export function isValidAccountNumber(code: OfframpCountryCode, value: string): boolean {
  return validateAccountNumber(code, value) === null
}
