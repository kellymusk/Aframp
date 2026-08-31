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
  // Content-Security-Policy lives in middleware.ts instead of here: it needs
  // a fresh nonce per request for script-src, and this headers() function
  // only runs once at build/server-init time. Setting a second, static CSP
  // here would give the browser two Content-Security-Policy headers, which
  // it intersects rather than overrides — that would silently break the
  // nonce-based policy middleware sets. The rest of the security headers are
  // static, so they stay here.
  headers() {
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

// next-pwa is disabled due to incompatibility with Next.js 15 (see next.config.mjs).
// The PWA is not actively used in the current payment flow.
const withPWA = withPWAInit({
  dest: 'public',
  disable: true,
})

const configWithPWA = withPWA(nextConfig)

export default withSentryConfig(configWithPWA)
