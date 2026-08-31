import { NextResponse, type NextRequest } from 'next/server'

/**
 * Content-Security-Policy, generated per-request so `script-src` can carry a
 * fresh nonce instead of `'unsafe-inline'`. This has to live in middleware,
 * not `next.config.mjs`'s `headers()` — that function runs once at build/
 * server-init time and can't mint a new random value per request. Next.js
 * reads the nonce back out of this header itself and applies it to the
 * inline bootstrap/hydration scripts it injects, so no `headers()` call (and
 * the opt-out of static rendering that comes with reading it) is needed
 * anywhere else in the app; there are no other custom inline `<script>` tags
 * to nonce today.
 *
 * The rest of the security headers (X-Frame-Options, etc.) stay in
 * next.config.mjs — they're static and don't need per-request generation.
 */

function generateNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return btoa(String.fromCharCode(...bytes))
}

/**
 * Builds Sentry's CSP report endpoint from the public DSN:
 * `https://<ingest-host>/api/<project-id>/security/?sentry_key=<public-key>`.
 * Returns null when no DSN is configured (e.g. local dev) so `report-uri` is
 * simply omitted rather than pointing at a broken URL.
 */
function sentryReportUri(dsn: string | undefined): string | null {
  if (!dsn) return null
  try {
    const parsed = new URL(dsn)
    const projectId = parsed.pathname.replace(/^\//, '')
    if (!parsed.username || !projectId) return null
    return `https://${parsed.host}/api/${projectId}/security/?sentry_key=${parsed.username}`
  } catch {
    return null
  }
}

export function middleware(request: NextRequest) {
  const nonce = generateNonce()

  const apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3000')
  const apiOrigin = `${apiUrl.protocol}//${apiUrl.host}`
  const reportUri = sentryReportUri(process.env.NEXT_PUBLIC_SENTRY_DSN)

  // Next.js dev mode wraps modules with eval() for Fast Refresh — that's
  // dev-tooling only (stripped out of `next build`), but without
  // 'unsafe-eval' here it throws on every edit and hot-reload never
  // recovers. Production keeps the strict nonce-only policy.
  const scriptSrc =
    process.env.NODE_ENV === 'development'
      ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`
      : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`

  const csp = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' ${apiOrigin} https://api.coingecko.com https://horizon.stellar.org https://horizon-testnet.stellar.org https://*.sentry.io https://*.ingest.us.sentry.io https://vitals.vercel-insights.com`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(reportUri ? [`report-uri ${reportUri}`] : []),
  ].join('; ')

  // Forward the nonce as a request header too, so a future Server Component
  // that needs to tag a custom inline script can read it via `headers()`.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })
  response.headers.set('Content-Security-Policy', csp)

  return response
}

export const config = {
  matcher: [
    // Everything except static assets and the PWA/image optimizer routes,
    // which don't render HTML and don't need a script nonce.
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
