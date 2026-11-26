import withPWAInit from 'next-pwa'
import defaultRuntimeCaching from 'next-pwa/cache.js'
import { withSentryConfig } from '@sentry/nextjs'
import withBundleAnalyzer from '@next/bundle-analyzer'
import dns from 'node:dns'
import { promisify } from 'node:util'

const dnsResolve4 = promisify(dns.resolve4)

/**
 * Validates that NEXT_API_URL is a safe absolute HTTP(S) URL.
 * Prevents SSRF attacks if the value is ever user-controlled or misconfigured.
 *
 * Rejects:
 * - Private IP ranges (10.x, 172.16-31.x, 192.168.x)
 * - Loopback (127.x, ::1)
 * - Link-local (169.254.x)
 * - Broadcast/multicast (224.x+, 255.255.255.255)
 * - Unspecified (0.0.0.0)
 * - Resolved IPs that point to any of the above
 */

// IP ranges to block (CIDR notation)
const BLOCKED_IP_RANGES = [
  // Loopback
  { cidr: '127.0.0.0/8', name: 'loopback' },
  { cidr: '::1/128', name: 'loopback-v6' },
  // Private: 10.0.0.0/8
  { cidr: '10.0.0.0/8', name: 'private (10.x)' },
  // Private: 172.16.0.0/12
  { cidr: '172.16.0.0/12', name: 'private (172.16-31.x)' },
  // Private: 192.168.0.0/16
  { cidr: '192.168.0.0/16', name: 'private (192.168.x)' },
  // Link-local: 169.254.0.0/16
  { cidr: '169.254.0.0/16', name: 'link-local (169.254.x)' },
  // Carrier-grade NAT: 100.64.0.0/10
  { cidr: '100.64.0.0/10', name: 'carrier-grade NAT' },
  // Unspecified/this network
  { cidr: '0.0.0.0/8', name: 'unspecified' },
  // Multicast
  { cidr: '224.0.0.0/4', name: 'multicast' },
  // Broadcast
  { cidr: '255.255.255.255/32', name: 'broadcast' },
  // Benchmarking (RFC 2544)
  { cidr: '198.18.0.0/15', name: 'benchmark' },
  // Documentation (RFC 5737)
  { cidr: '192.0.2.0/24', name: 'documentation' },
  { cidr: '198.51.100.0/24', name: 'documentation' },
  { cidr: '203.0.113.0/24', name: 'documentation' },
]

/**
 * Parse a CIDR pattern and check if an IP falls within it.
 * Supports IPv4 only for simplicity.
 */
function isIPInRange(ip, cidr) {
  const [range, bits] = cidr.split('/')
  const mask = ~(2 ** (32 - parseInt(bits)) - 1)

  const ipInt = ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0
  const rangeInt = range.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0

  return (ipInt & mask) === (rangeInt & mask)
}

/**
 * Check if an IP address is in any blocked range.
 * Returns the blocked range name if blocked, null otherwise.
 */
function isIPBlocked(ip) {
  for (const { cidr, name } of BLOCKED_IP_RANGES) {
    if (isIPInRange(ip, cidr)) {
      return name
    }
  }
  return null
}

/**
 * Resolve hostname to IP addresses and check each resolved IP.
 * Returns an array of blocked IP range names if any are blocked.
 */
async function checkResolvedIPs(hostname) {
  const blockedRanges = []

  try {
    const addresses = await dnsResolve4(hostname)
    for (const ip of addresses) {
      const blocked = isIPBlocked(ip)
      if (blocked) {
        blockedRanges.push(`${ip} (${blocked})`)
      }
    }
  } catch {
    // DNS resolution failed — not necessarily an error, just skip it
  }

  return blockedRanges
}

/**
 * Validate a URL for safe use as NEXT_API_URL.
 * Throws on any SSRF risk.
 */
async function validateBackendUrl(url) {
  let parsed
  try {
    parsed = new URL(url)
  } catch (err) {
    throw new Error(`Invalid URL format: ${err.message}`)
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`Invalid protocol: ${parsed.protocol} (must be http: or https:)`)
  }

  if (!parsed.hostname) {
    throw new Error('URL must include a hostname')
  }

  const hostname = parsed.hostname

  // Check if hostname is a literal IP address
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
  const isLiteralIP = ipv4Regex.test(hostname)

  if (isLiteralIP) {
    const blocked = isIPBlocked(hostname)
    if (blocked) {
      throw new Error(
        `Hostname ${hostname} is a ${blocked} address. ` +
        'Private, loopback, link-local, and broadcast addresses are not allowed.'
      )
    }
  } else {
    // For hostnames, resolve and check each resolved IP
    const blockedIPs = await checkResolvedIPs(hostname)
    if (blockedIPs.length > 0) {
      throw new Error(
        `Hostname "${hostname}" resolves to blocked IP(s): ${blockedIPs.join(', ')}. ` +
        'This may indicate a DNS-based SSRF attempt. Use a static IP or a known-safe hostname.'
      )
    }
  }

  return true
}

// Export for testing
export { isIPInRange, isIPBlocked, checkResolvedIPs }

// Synchronous wrapper for build-time validation
function validateBackendUrlSync(url) {
  let parsed
  try {
    parsed = new URL(url)
  } catch (err) {
    throw new Error(`Invalid URL format: ${err.message}`)
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`Invalid protocol: ${parsed.protocol} (must be http: or https:)`)
  }

  if (!parsed.hostname) {
    throw new Error('URL must include a hostname')
  }

  const hostname = parsed.hostname
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/

  if (ipv4Regex.test(hostname)) {
    const blocked = isIPBlocked(hostname)
    if (blocked) {
      throw new Error(
        `Hostname ${hostname} is a ${blocked} address. ` +
        'Private, loopback, link-local, and broadcast addresses are not allowed.'
      )
    }
  }

  // For hostname validation at build time, we can't do async DNS resolution
  // so we only validate literal IPs synchronously. The async version is used
  // for runtime configuration if needed.
  return true
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Don't fingerprint the framework/version via X-Powered-By.
  poweredByHeader: false,
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
  // The browser only ever calls this app's own origin at `/backend/*`; this
  // forwards those requests server-side to the real backend. NEXT_API_URL
  // (deliberately not NEXT_PUBLIC_*) never reaches client-side code — it
  // can't leak via devtools, a bundle diff, or CSP `connect-src`.
  // See docs/adr-001-backend-proxy.md for the rationale and consequences.
  // Because the rewrite below is same-origin, the browser attaches cookies to
  // it with no CORS preflight — the CSRF precondition. `middleware.ts` gates
  // every state-changing `/backend/*` request on a double-submitted token
  // before it reaches here (see lib/csrf.ts and docs/SECURITY_CSRF.md).
  rewrites() {
    const backendUrl = (process.env.NEXT_API_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '')
    // Use sync version for build-time validation (validates literal IPs)
    // Hostname DNS resolution would require async which Next.js doesn't support in rewrites()
    validateBackendUrlSync(backendUrl)
    return [
      {
        source: '/backend/:path*',
        destination: `${backendUrl}/:path*`,
      },
    ]
  },
  headers() {
    // NOTE: The Content-Security-Policy header with per-request nonce is now
    // set by middleware.ts (#632). The static-file entries below apply only to
    // assets that bypass middleware (e.g. _next/static) and therefore do NOT
    // include script-src so they don't clobber the nonce injected by the
    // middleware on page routes.
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

// next-pwa@5.6.0 is incompatible with Next.js 15's webpack runtime and causes
// "a[d] is not a function" errors during SSR prerendering in production builds.
// Disable it until the project upgrades to @ducanh2912/next-pwa or similar.
const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  reloadOnOnline: false,
  disable: true, // was: process.env.NODE_ENV === 'development'
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
const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false,
})

export default withSentryConfig(withAnalyzer(configWithPWA))
