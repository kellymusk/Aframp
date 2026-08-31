import withPWAInit from 'next-pwa'
import defaultRuntimeCaching from 'next-pwa/cache.js'
import { withSentryConfig } from '@sentry/nextjs'

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
  headers() {
    const apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3000')
    const apiOrigin = `${apiUrl.protocol}//${apiUrl.host}`

    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      `connect-src 'self' ${apiOrigin} https://api.coingecko.com https://horizon.stellar.org https://horizon-testnet.stellar.org https://*.sentry.io https://*.ingest.us.sentry.io https://vitals.vercel-insights.com`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
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

// next-pwa is disabled due to incompatibility with Next.js 15 (see next.config.mjs).
// The PWA is not actively used in the current payment flow.
const withPWA = withPWAInit({
  dest: 'public',
  disable: true,
})

const configWithPWA = withPWA(nextConfig)

export default withSentryConfig(configWithPWA, {
  // Source maps are still uploaded to Sentry for stack-trace symbolication,
  // but removed from the production build output afterward so they're not
  // servable/fetchable from the browser. `hideSourceMaps` was the option
  // name pre-v8 of the SDK; this is its current equivalent. (#481)
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
})
