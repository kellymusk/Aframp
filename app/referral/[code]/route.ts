import { NextResponse } from 'next/server'
import { trackClick } from '@/lib/referral/analytics'

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params
  const normalizedCode = code.toUpperCase()

  // Validate the referral code format
  if (!normalizedCode.startsWith('AFR-')) {
    return NextResponse.redirect(new URL('/onramp', _request.url))
  }

  // Track the click event
  trackClick(normalizedCode)

  // Redirect to the onramp page with the referral code
  const redirectUrl = new URL('/onramp', _request.url)
  redirectUrl.searchParams.set('ref', normalizedCode)
  return NextResponse.redirect(redirectUrl)
}
