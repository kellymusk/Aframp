import { withSentryConfig } from '@sentry/nextjs/config'
import withBundleAnalyzer from '@next/bundle-analyzer'
import { resolveBackendUrl } from './lib/config/backend-url.mjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next 16 blocks cross-origin requests to dev-only resources (HMR, dev
  // chunks). The E2E suite browses http://127.0.0.1:3001, so allow it; this has
  // no effect on production builds.
  allowedDevOrigins: ['127.0.0.1'],
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
    //
    // Permissions-Policy: `camera=(self)` is required by the QR scanner in
    // components/send/qr-scanner.tsx, which calls getUserMedia. `camera=()`
    // would silently block it in production (#636). proxy.ts sets the same
    // value on page routes.
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
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
