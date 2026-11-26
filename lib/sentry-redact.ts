import type { Event } from '@sentry/nextjs'

/**
 * Shared Sentry PII / secret redaction rules.
 *
 * Imported by the server, edge and client Sentry configs so every runtime
 * redacts the same surfaces with the same rules. This module must stay
 * runtime-agnostic (no Node-only APIs) because it is bundled for the edge and
 * the browser too.
 */

export const REDACTED = '[REDACTED]'

/**
 * Key names (case-insensitive, substring match) whose values are always
 * replaced, wherever they appear in the event tree: extra, request headers /
 * cookies / query / body, contexts, breadcrumb data, user, tags.
 */
export const SENSITIVE_KEY_PARTS = [
  'secret',
  'mnemonic',
  'seed',
  'private[-_]?key',
  'passw(?:or)?d',
  'passphrase',
  'token',
  'authorization',
  'cookie',
  'api[-_]?key',
  'csrf',
  'email',
  'amount',
  'balance',
] as const

const SENSITIVE_KEY_SOURCE = SENSITIVE_KEY_PARTS.join('|')
const SENSITIVE_KEY_RE = new RegExp(SENSITIVE_KEY_SOURCE, 'i')

/** Stellar public address (G…) and secret seed (S…): 56 chars, base32. */
const STELLAR_PUBLIC_RE = /G[A-Z2-7]{55}/g
const STELLAR_SECRET_RE = /S[A-Z2-7]{55}/g
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
/** `token=abc`-style pairs inside query strings / URLs / free text. */
const SENSITIVE_QUERY_PARAM_RE = new RegExp(
  `(^|[?&])([\\w.\\-]*(?:${SENSITIVE_KEY_SOURCE})[\\w.\\-]*)=([^&#\\s]*)`,
  'gi',
)

const MAX_DEPTH = 10

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_RE.test(key)
}

/** Redact secrets / PII embedded in free-form strings. */
export function redactString(value: string): string {
  return value
    .replace(STELLAR_SECRET_RE, '[STELLAR_SECRET]')
    .replace(STELLAR_PUBLIC_RE, '[STELLAR_ADDR]')
    .replace(EMAIL_RE, '[EMAIL]')
    .replace(SENSITIVE_QUERY_PARAM_RE, `$1$2=${REDACTED}`)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/** Recursively redact a value; key names take precedence over content. */
export function redactValue(
  value: unknown,
  key?: string,
  depth = 0,
  seen: WeakSet<object> = new WeakSet(),
): unknown {
  if (value === null || value === undefined) return value
  if (key !== undefined && isSensitiveKey(key)) return REDACTED

  if (typeof value === 'string') return redactString(value)
  if (typeof value !== 'object') return value

  if (depth >= MAX_DEPTH) return '[Truncated]'
  if (seen.has(value)) return '[Circular]'
  seen.add(value)

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, undefined, depth + 1, seen))
  }

  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      out[k] = redactValue(v, k, depth + 1, seen)
    }
    return out
  }

  return value
}

/**
 * Scrub a Sentry event in place of shipping it. Covers extra, request
 * (headers, cookies, query, url, body), contexts, breadcrumbs, user, tags,
 * and the free-text message / exception values.
 */
export function redactSentryEvent<T extends Event>(event: T): T {
  const e = event as Record<string, any>

  for (const field of ['extra', 'contexts', 'breadcrumbs', 'user', 'tags'] as const) {
    if (e[field] !== undefined) e[field] = redactValue(e[field])
  }

  if (e.request) {
    const request = redactValue(e.request) as Record<string, any>
    // Cookie names are arbitrary, so drop every cookie value outright.
    if (isPlainObject(e.request.cookies)) {
      request.cookies = Object.fromEntries(
        Object.keys(e.request.cookies).map((name) => [name, REDACTED]),
      )
    } else if (typeof e.request.cookies === 'string') {
      request.cookies = REDACTED
    }
    e.request = request
  }

  if (typeof e.message === 'string') e.message = redactString(e.message)
  if (Array.isArray(e.exception?.values)) {
    for (const ex of e.exception.values) {
      if (typeof ex?.value === 'string') ex.value = redactString(ex.value)
    }
  }

  return event
}
