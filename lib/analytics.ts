/**
 * lib/analytics.ts
 *
 * Unified analytics wrapper for Aframp.
 *
 * - Page-level tracking: Vercel Analytics (`@vercel/analytics`) handles this
 *   automatically via the <Analytics /> component already placed in app/layout.tsx.
 *
 * - Event-level tracking: PostHog.  Initialised once on the client side.
 *   Requires the following env vars (add to .env.local):
 *     NEXT_PUBLIC_POSTHOG_KEY   — your PostHog project API key
 *     NEXT_PUBLIC_POSTHOG_HOST  — defaults to https://app.posthog.com
 *
 * Usage:
 *   import { analytics } from '@/lib/analytics'
 *   analytics.track('onramp_initiated', { amount: 5000, currency: 'NGN' })
 *
 * The module gracefully no-ops in every case where:
 *   - The code runs on the server (no window)
 *   - NEXT_PUBLIC_POSTHOG_KEY is not configured
 *   - PostHog fails to initialise for any reason
 */

import type { PostHog } from 'posthog-js'

// ── Initialisation ────────────────────────────────────────────────────────────

let _posthog: PostHog | null = null
let _initialised = false

function getPostHog(): PostHog | null {
  // Only run on the client
  if (typeof window === 'undefined') return null

  if (_initialised) return _posthog

  _initialised = true

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) {
    // Non-fatal: analytics silently no-ops when no key is configured (e.g. local dev)
    return null
  }

  try {
    // Lazy-require so the module is never imported on the server
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const posthogJs = require('posthog-js') as { default: PostHog }
    const ph: PostHog = posthogJs.default

    ph.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com',
      // Capture pageviews manually to avoid double-counting with Vercel Analytics
      capture_pageview: false,
      // Respect cookie consent — disable persistence until user consents
      persistence: 'memory',
      // Don't send data about third-party scripts loaded on the page
      capture_performance: false,
    })

    _posthog = ph
  } catch (err) {
    console.warn('[analytics] PostHog failed to initialise:', err)
  }

  return _posthog
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface AnalyticsProperties {
  [key: string]: string | number | boolean | null | undefined
}

/**
 * Track a custom analytics event.
 *
 * @param event      Snake_case event name  e.g. 'onramp_initiated'
 * @param properties Optional key/value properties to attach to the event
 */
function track(event: string, properties?: AnalyticsProperties): void {
  const ph = getPostHog()
  if (!ph) return

  try {
    ph.capture(event, properties)
  } catch (err) {
    console.warn(`[analytics] Failed to track event "${event}":`, err)
  }
}

/**
 * Identify the current user.
 * Call this after login/signup with a stable user ID.
 */
function identify(userId: string, traits?: AnalyticsProperties): void {
  const ph = getPostHog()
  if (!ph) return

  try {
    ph.identify(userId, traits)
  } catch (err) {
    console.warn('[analytics] Failed to identify user:', err)
  }
}

/**
 * Reset identity — call on logout.
 */
function reset(): void {
  const ph = getPostHog()
  if (!ph) return

  try {
    ph.reset()
  } catch (err) {
    console.warn('[analytics] Failed to reset identity:', err)
  }
}

export const analytics = { track, identify, reset }
