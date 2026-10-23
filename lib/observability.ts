import * as Sentry from '@sentry/nextjs'

type LogLevel = 'info' | 'warning' | 'error'

/**
 * Report an error to Sentry while keeping a local console trace in development.
 * Use this instead of raw `console.error` so failures reach observability.
 */
export function captureError(error: unknown, context?: Record<string, unknown>): void {
  Sentry.captureException(error, context ? { extra: context } : undefined)

  if (process.env.NODE_ENV !== 'production') {
    console.error(error, context ?? '')
  }
}

/**
 * Structured log helper. Errors are forwarded to Sentry, warnings go to the
 * console, and info-level events are recorded as Sentry breadcrumbs.
 */
export function log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  if (level === 'error') {
    captureError(new Error(message), context)
    return
  }

  if (level === 'warning') {
    console.warn(message, context ?? '')
    return
  }

  // Info-level events become breadcrumbs: they add context to the next
  // reported error without printing to the console.
  Sentry.addBreadcrumb({ level: 'info', message, data: context })
}
