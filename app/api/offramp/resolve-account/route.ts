/**
 * POST /api/offramp/resolve-account
 *
 * Resolves a destination account number to its holder's name so the customer can
 * confirm they are paying out to the right account.
 *
 * POST rather than GET: the account number is customer PII and query strings end
 * up in access logs and browser history.
 *
 * Request body (JSON):
 *   { country: "NG" | "GH" | "KE" | "ZA" | "UG", bankCode: string, accountNumber: string }
 *
 * 200 { accountName, source }   source is "paystack" or "mock" (see below)
 * 400 invalid body / account number fails the country's format
 * 422 RESOLUTION_UNSUPPORTED — no name lookup for this market.  Not an error the
 *     customer needs to see: the form asks them to type the account name and
 *     confirm it instead.
 * 502 RESOLUTION_FAILED — Paystack could not resolve the account.
 *
 * The account number is never logged, and no result is persisted here.  The
 * resolved name is screened against sanctions and PEP lists later, when the
 * withdrawal itself is submitted to /api/withdrawals.
 *
 * IP rate limiting is applied to every /api route by middleware.ts.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  OFFRAMP_COUNTRIES,
  validateAccountNumber,
  type OfframpCountryCode,
} from '@/lib/offramp/countries'

const RequestSchema = z.object({
  country: z.enum(['NG', 'GH', 'KE', 'ZA', 'UG']),
  bankCode: z.string().trim().min(1).max(32),
  accountNumber: z.string().trim().min(1).max(32),
})

const UNSUPPORTED = NextResponse.json(
  {
    error: 'RESOLUTION_UNSUPPORTED',
    message: 'Account name lookup is not available for this country.',
  },
  { status: 422 }
)

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { country, bankCode, accountNumber } = parsed.data

  // Re-validate server-side. The form validates too, but the form is not a
  // control — anything reaching Paystack is billed and rate limited.
  const formatError = validateAccountNumber(country as OfframpCountryCode, accountNumber)
  if (formatError) {
    return NextResponse.json(
      { error: 'INVALID_ACCOUNT_NUMBER', message: formatError },
      { status: 400 }
    )
  }

  if (!OFFRAMP_COUNTRIES[country].supportsNameResolution) {
    return UNSUPPORTED
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey) {
    /*
     * Without a gateway key there is nothing to resolve against.  In
     * development the mock keeps the offramp flow walkable; in production we
     * report the lookup as unavailable so the form falls back to the customer
     * typing and confirming the name.  Returning an invented name in
     * production would be worse than no name at all — it is the one piece of
     * information the customer uses to check where their money is going.
     */
    if (process.env.NODE_ENV === 'production') return UNSUPPORTED
    return NextResponse.json({ accountName: mockAccountName(accountNumber), source: 'mock' })
  }

  const url = new URL('https://api.paystack.co/bank/resolve')
  url.searchParams.set('account_number', accountNumber)
  url.searchParams.set('bank_code', bankCode)

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${secretKey}` },
      cache: 'no-store',
    })

    const payload = (await response.json().catch(() => null)) as {
      status?: boolean
      data?: { account_name?: string }
    } | null

    if (!response.ok || !payload?.status || !payload.data?.account_name) {
      return NextResponse.json(
        {
          error: 'RESOLUTION_FAILED',
          message: 'We could not verify that account. Check the bank and account number.',
        },
        { status: 502 }
      )
    }

    return NextResponse.json({ accountName: payload.data.account_name.trim(), source: 'paystack' })
  } catch (error) {
    // Logged without the account number.
    console.error(`[offramp/resolve-account] lookup failed for ${country}`, error)
    return NextResponse.json(
      {
        error: 'RESOLUTION_FAILED',
        message: 'Account verification is temporarily unavailable. Please try again shortly.',
      },
      { status: 502 }
    )
  }
}

/** Development-only stand-in, preserving the demo account the flow was built on. */
function mockAccountName(accountNumber: string): string {
  return accountNumber === '0123456789' ? 'CHUKWUEMEKA OKAFOR' : 'JOHN DOE'
}
