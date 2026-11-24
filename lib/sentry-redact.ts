import type { Event } from '@sentry/nextjs'

// Single source of truth for Sentry PII redaction, shared by the client,
// server and edge configs.

const REDACTED = '[REDACTED]'

// Any key whose name contains one of these is redacted, at any depth.
const SENSITIVE_KEY =
  /secret|mnemonic|private|seed|password|passwd|token|authorization|cookie|api[-_]?key|signature/i

const STELLAR_PUBLIC_KEY = /G[A-Z2-7]{55}/g
const STELLAR_SECRET_KEY = /S[A-Z2-7]{55}/g
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi

const MAX_DEPTH = 8

export function redactString(value: string): string {
  return value
    .replace(STELLAR_SECRET_KEY, REDACTED)
    .replace(STELLAR_PUBLIC_KEY, '[STELLAR_ADDR]')
    .replace(EMAIL, '[EMAIL]')
}

export function redactValue(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') return redactString(value)
  if (value === null || typeof value !== 'object') return value
  if (depth >= MAX_DEPTH) return REDACTED
  if (Array.isArray(value)) return value.map((item) => redactValue(item, depth + 1))

  const out: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SENSITIVE_KEY.test(key) ? REDACTED : redactValue(val, depth + 1)
  }
  return out
}

// Redacts extra, request (headers, cookies, query, body), contexts, user and
// breadcrumbs (message + data) on an outgoing event.
export function redactEvent<T extends Event>(event: T): T {
  const target = event as unknown as Record<string, unknown>
  for (const field of ['extra', 'request', 'contexts', 'user', 'breadcrumbs'] as const) {
    if (target[field] !== undefined) {
      target[field] = redactValue(target[field])
    }
  }
  return event
}
