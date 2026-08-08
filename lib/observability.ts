/**
 * lib/observability.ts
 *
 * Central observability helpers for AFRAMP:
 *   - Sentry: structured error capture with contextual extras
 *   - Axiom: structured log ingestion via the official Next.js SDK
 *
 * Usage (server-side / API routes):
 *
 *   import { log, captureError, withRouteObservability } from '@/lib/observability'
 *
 *   // Structured log (forwarded to Axiom in production)
 *   log.info('payment.initiated', { provider: 'mpesa', amount: 100, currency: 'KES' })
 *
 *   // Forward an error to Sentry with extra context
 *   captureError(err, { tags: { domain: 'stellar' }, extra: { txHash } })
 *
 *   // Wrap an entire route handler (logs duration + captures unhandled throws)
 *   export const POST = withRouteObservability('payments/initiate', handler)
 */

import * as Sentry from '@sentry/nextjs'

// ─── Types ────────────────────────────────────────────────────────────────────

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogFields {
  [key: string]: unknown
}

export interface SentryCaptureOptions {
  /** Key/value tags for fast filtering in Sentry. */
  tags?: Record<string, string>
  /** Arbitrary extra data attached to the Sentry event. */
  extra?: Record<string, unknown>
  /** Sentry user context. */
  user?: { id?: string; email?: string; walletAddress?: string }
  /** Sentry severity level override (defaults to 'error'). */
  level?: Sentry.SeverityLevel
}

// ─── Axiom logger ─────────────────────────────────────────────────────────────

/**
 * Thin wrapper around Axiom's `@axiomhq/nextjs` client.
 *
 * When AXIOM_TOKEN and AXIOM_DATASET are set the logs are forwarded to Axiom.
 * In development, or when the vars are absent, the calls fall back to the
 * standard console so local development is unaffected.
 */
class AxiomLogger {
  private readonly dataset: string
  private readonly token: string
  private readonly enabled: boolean

  constructor() {
    this.token = process.env.AXIOM_TOKEN ?? ''
    this.dataset = process.env.AXIOM_DATASET ?? 'aframp'
    this.enabled = Boolean(this.token) && process.env.NODE_ENV === 'production'
  }

  private async send(level: LogLevel, event: string, fields: LogFields): Promise<void> {
    const payload = {
      _time: new Date().toISOString(),
      level,
      event,
      service: 'aframp-frontend',
      env: process.env.NODE_ENV,
      ...fields,
    }

    if (!this.enabled) {
      // eslint-disable-next-line no-console
      const consoleFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
      consoleFn(`[${level.toUpperCase()}] ${event}`, fields)
      return
    }

    try {
      await fetch(`https://api.axiom.co/v1/datasets/${this.dataset}/ingest`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([payload]),
      })
    } catch {
      // Never let logging failures crash the application.
      // eslint-disable-next-line no-console
      console.error('[observability] Failed to send log to Axiom', { event, level })
    }
  }

  debug(event: string, fields: LogFields = {}): void {
    void this.send('debug', event, fields)
  }

  info(event: string, fields: LogFields = {}): void {
    void this.send('info', event, fields)
  }

  warn(event: string, fields: LogFields = {}): void {
    void this.send('warn', event, fields)
  }

  error(event: string, fields: LogFields = {}): void {
    void this.send('error', event, fields)
  }
}

/** Singleton Axiom logger – import `log` throughout the app. */
export const log = new AxiomLogger()

// ─── Sentry helpers ───────────────────────────────────────────────────────────

/**
 * Capture an error in Sentry with rich structured context.
 *
 * @example
 * captureError(err, {
 *   tags: { domain: 'stellar', operation: 'p2p-transfer' },
 *   extra: { sourcePublicKey, destination, amount },
 * })
 */
export function captureError(
  error: unknown,
  options: SentryCaptureOptions = {}
): string {
  return Sentry.withScope((scope) => {
    if (options.tags) {
      Object.entries(options.tags).forEach(([k, v]) => scope.setTag(k, v))
    }
    if (options.extra) {
      Object.entries(options.extra).forEach(([k, v]) => scope.setExtra(k, v))
    }
    if (options.user) {
      scope.setUser(options.user)
    }
    if (options.level) {
      scope.setLevel(options.level)
    }

    return Sentry.captureException(error)
  })
}

/**
 * Set user context for Sentry – call after wallet/auth is established.
 */
export function identifyUser(user: { id?: string; email?: string; walletAddress?: string }): void {
  Sentry.setUser(user)
}

/**
 * Add a breadcrumb (lightweight event trace) to Sentry.
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>
): void {
  Sentry.addBreadcrumb({ message, category, data, level: 'info' })
}

// ─── Route-level HOF ─────────────────────────────────────────────────────────

type RouteHandler<T> = (req: Request, ctx?: unknown) => Promise<T>

/**
 * Higher-order function that wraps a Next.js App Router handler with:
 *   1. Request duration logging to Axiom
 *   2. Automatic Sentry capture for unhandled errors
 *   3. Re-throw so Next.js error boundaries still apply
 *
 * @example
 * export const POST = withRouteObservability('onramp/create-order', async (req) => {
 *   // ... your handler logic
 * })
 */
export function withRouteObservability<T>(
  routeName: string,
  handler: RouteHandler<T>
): RouteHandler<T> {
  return async (req: Request, ctx?: unknown): Promise<T> => {
    const start = Date.now()
    try {
      const result = await handler(req, ctx)
      const duration = Date.now() - start
      log.info('route.success', { route: routeName, duration_ms: duration, method: req.method })
      return result
    } catch (error) {
      const duration = Date.now() - start
      captureError(error, {
        tags: { domain: 'api', route: routeName },
        extra: { method: req.method, url: req.url, duration_ms: duration },
      })
      log.error('route.error', {
        route: routeName,
        duration_ms: duration,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }
}
