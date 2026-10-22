import { withSentryConfig } from '@sentry/nextjs/config'
import withBundleAnalyzer from '@next/bundle-analyzer'

/**
 * Validate NEXT_API_URL at startup.
 *
 * The rewrite below forwards every `/backend/*` request to this host, so an
 * attacker-controlled value would turn the proxy into an SSRF vector and leak
 * auth tokens. We therefore require an absolute http(s) URL and refuse to
 * start otherwise.
 *
 * @param {string | undefined} raw
 * @returns {string} normalized backend URL without a trailing slash
 */
export function resolveBackendUrl(raw) {
  const value = raw ?? 'http://127.0.0.1:3000'
  let parsed
  try {
    parsed = new URL(value)
  } catch {
    throw new Error(
      `Invalid NEXT_API_URL: "${value}" is not an absolute URL. ` +
        'Expected format: http(s)://host[:port] (e.g. https://api.example.com).',
    )
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(
      `Invalid NEXT_API_URL: "${value}" must use http or https, got "${parsed.protocol}". ` +
        'Expected format: http(s)://host[:port] (e.g. https://api.example.com).',
    )
  }
  return value.replace(/\/$/, '')
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Limit concurrency only in resource-constrained CI environments.
    // Set CI_LOW_RESOURCES=1 in your CI pipeline to enable these caps;
    // leave it unset for normal development and production builds so they
    // use all available CPU cores.
    ...(process.env.CI_LOW_RESOURCES
      ? {
          cpus: 1,
          staticGenerationMaxConcurrency: 1,
          staticGenerationMinPagesPerWorker: 1,
        }
      : {}),
  },
  images: {
    unoptimized: false,
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  output: 'standalone',
  // The browser only ever calls this app's own origin at `/backend/*`; this
  // forwards those requests server-side to the real backend. NEXT_API_URL
  // (deliberately not NEXT_PUBLIC_*) never reaches client-side code — it
  // can't leak via devtools, a bundle diff, or CSP `connect-src`.
  // See docs/adr-001-backend-proxy.md for the rationale and consequences.
  rewrites() {
    const backendUrl = resolveBackendUrl(process.env.NEXT_API_URL)
    return [
      {
        source: '/backend/:path*',
        destination: `${backendUrl}/:path*`,
      },
    ]
  },
  headers() {
    // NOTE: The Content-Security-Policy header with per-request nonce is now
    // set by proxy.ts (#632, formerly middleware.ts). The static-file entries below apply only to
    // assets that bypass proxy.ts (e.g. _next/static) and therefore do NOT
    // include script-src so they don't clobber the nonce injected by the
    // proxy on page routes.
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false,
})

export default withSentryConfig(withAnalyzer(nextConfig))
