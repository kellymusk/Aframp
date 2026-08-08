/**
 * GET /api/offramp/banks?country=NG
 *
 * Returns the bank list for an offramp destination country.  Proxied rather than
 * called from the browser because Paystack's directory needs the secret key, and
 * because caching it once on the server keeps every form load off Paystack.
 *
 * 200 { country, currency, source, banks }
 *     `source` is "paystack" (live), "static" (offline fallback) or
 *     "unavailable" (no list — the form asks for the bank name instead).
 * 400 unsupported or missing country
 *
 * IP rate limiting is applied to every /api route by middleware.ts.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getBankList } from '@/lib/offramp/bank-directory'
import {
  isOfframpCountryCode,
  OFFRAMP_COUNTRY_CODES,
  type OfframpCountryCode,
} from '@/lib/offramp/countries'

export async function GET(request: NextRequest) {
  const country = request.nextUrl.searchParams.get('country')

  if (!isOfframpCountryCode(country)) {
    return NextResponse.json(
      {
        error: 'UNSUPPORTED_COUNTRY',
        message: `Offramp is available in: ${OFFRAMP_COUNTRY_CODES.join(', ')}.`,
      },
      { status: 400 }
    )
  }

  const result = await getBankList(country.toUpperCase() as OfframpCountryCode)

  return NextResponse.json(result, {
    headers: {
      // Safe to cache at the edge: the response depends only on the country.
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}
