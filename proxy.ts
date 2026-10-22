import { NextResponse, type NextRequest } from 'next/server'

/**
 * Per-request CSP nonce proxy (#632, migrated from middleware.ts for Next.js 16).
 *
 * Generates a cryptographically random nonce for every request and embeds it
 * in the Content-Security-Policy header, replacing the broad 'unsafe-inline'
 * directive with 'nonce-{nonce}'. The nonce is forwarded to the page via the
 * `x-nonce` response header so that layout.tsx can read it with `headers()`
 * and apply it to inline <script> tags.
 *
 * This proxy runs on every non-static, non-API-internal route.
 */
export function proxy(request: NextRequest) {
  // 16 random bytes → 22-character base64url string (no padding).
  const nonceBytes = crypto.getRandomValues(new Uint8Array(16))
  const nonce = Buffer.from(nonceBytes).toString('base64url')

  // React's dev tooling evaluates strings; production stays nonce-only.
  const devEval = process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${devEval}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.coingecko.com https://horizon.stellar.org https://horizon-testnet.stellar.org https://status.stellar.org https://*.sentry.io https://*.ingest.us.sentry.io https://vitals.vercel-insights.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  // Next.js reads the nonce from the *request* CSP header to stamp it on its own
  // inline scripts, and layout.tsx reads x-nonce via headers(). Without these
  // the CSP blocks Next's bootstrap scripts and the app never hydrates.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  response.headers.set('x-nonce', nonce)
  response.headers.set('Content-Security-Policy', csp)
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()')

  return response
}

export const config = {
  /**
   * Run on all routes except Next.js internals and static file serving.
   * This ensures every HTML page response carries a fresh nonce.
   */
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js|workbox-|manifest).*)'],
}
