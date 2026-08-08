import withPWAInit from 'next-pwa'
import defaultRuntimeCaching from 'next-pwa/cache.js'
import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // PWA configuration (next-pwa v2 reads options from the `pwa` key)
  pwa: {
    dest: 'public',
    register: true,
    // skipWaiting: false — do NOT force immediate service worker updates.
    // A waiting SW activates only after the user dismisses the update banner
    // (see components/pwa-update-banner.tsx), preventing in-flight payment
    // flows from being interrupted.
    skipWaiting: false,
    disable: process.env.NODE_ENV === 'development',
  },
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
  async redirects() {
    return [
      // /login and signup are the same flow (phone + OTP). Redirect /login to
      // /signup so that 401-page CTAs and any external links don't dead-end on
      // a 404 (issue #272).
      {
        source: '/login',
        destination: '/signup',
        permanent: false,
      },
    ]
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.coingecko.com https://horizon.stellar.org https://horizon-testnet.stellar.org https://*.sentry.io https://*.ingest.us.sentry.io https://vitals.vercel-insights.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')

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

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  reloadOnOnline: false,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /\/api\/(?:exchange-rate|rates)(?:\/)?(?:\?.*)?$/,
      handler: 'StaleWhileRevalidate',
      method: 'GET',
      options: {
        cacheName: 'exchange-rates',
        cacheableResponse: {
          statuses: [0, 200],
        },
        expiration: {
          maxEntries: 8,
          maxAgeSeconds: 24 * 60 * 60,
          purgeOnQuotaError: true,
        },
      },
    },
    ...defaultRuntimeCaching,
  ],
})

const configWithPWA = withPWA(nextConfig)

export default withSentryConfig(configWithPWA)
