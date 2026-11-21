import { NextResponse, type NextRequest } from 'next/server'

/**
 * Per-request CSP nonce middleware (#632).
 *
 * Generates a cryptographically random nonce for every request and embeds it
 * in the Content-Security-Policy header, replacing the broad 'unsafe-inline'
 * directive with 'nonce-{nonce}'. The nonce is forwarded to the page via the
 * `x-nonce` response header so that layout.tsx can read it with `headers()`
 * and apply it to inline <script> tags.
 *
 * This middleware runs on every non-static, non-API-internal route.
 */
export function middleware(request: NextRequest) {
  // 16 random bytes → 22-character base64url string (no padding).
  const nonceBytes = crypto.getRandomValues(new Uint8Array(16))
  const nonce = Buffer.from(nonceBytes).toString('base64url')

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.coingecko.com https://horizon.stellar.org https://horizon-testnet.stellar.org https://*.sentry.io https://*.ingest.us.sentry.io https://vitals.vercel-insights.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  const response = NextResponse.next({
    request: {
      headers: new Headers(request.headers),
    },
  })

  // Make the nonce available to RSC/layout via headers().
  response.headers.set('x-nonce', nonce)
  response.headers.set('Content-Security-Policy', csp)
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  )
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  return response
}

export const config = {
  /**
   * Run on all routes except Next.js internals and static file serving.
   * This ensures every HTML page response carries a fresh nonce.
   */
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw.js|workbox-|manifest).*)',
  ],
}
