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

  // Nonce-locked styles (#1176). Next.js stamps the nonce from the request CSP
  // header onto the <style> elements it injects, and next-themes already
  // receives it via layout.tsx. React `style={{}}` props render as inline style
  // *attributes*, which a nonce can't cover, so they are allowed separately via
  // `style-src-attr` while injected <style> elements stay nonce-only.
  // Gated behind CSP_STRICT_STYLES until the build is verified to still hydrate;
  // the default keeps the previous 'unsafe-inline' behaviour.
  const strictStyles = process.env.CSP_STRICT_STYLES === 'true'
  const styleDirectives = strictStyles
    ? [`style-src 'self' 'nonce-${nonce}'`, "style-src-attr 'unsafe-inline'"]
    : ["style-src 'self' 'unsafe-inline'"]

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    ...styleDirectives,
    // All images are served from our own origin (or inlined as data:/blob:);
    // no bare `https:` so injected markup can't load beacons from arbitrary hosts.
    "img-src 'self' data: blob:",
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
  response.headers.set('X-XSS-Protection', '1; mode=block')
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
