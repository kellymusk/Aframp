/**
 * Shared API infrastructure, types, serialization, and request handling for Aframp Pay.
 */

/** Backend ids are UUIDs; aliased for readability, not validated here. */
export type UUID = string

export const BASE_URL = '/backend'

/**
 * Amount fields are `i64` on the wire. JSON.parse would silently round anything
 * past 2^53, so these keys are re-quoted before parsing and revived as bigint.
 */
export const BIGINT_KEYS = new Set([
  'amount_stroops',
  'available',
  'pending',
  'fee_stroops',
  'network_fee_stroops',
  'total_stroops',
])

/**
 * There are no refresh tokens — a 24h expiry just starts returning 401. The
 * session provider registers here so any expired call lands the user back on
 * the login screen instead of showing a bare error.
 */
let onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Machine-readable error code from the backend, e.g. `OTP_EXPIRED`. */
    readonly code?: string,
    /** Which request field the error applies to, for field-level validation errors. */
    readonly field?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * True for a network failure or CORS rejection (see `request()`'s catch
 * block) — as opposed to a real validation/auth error the backend actually
 * responded to. Callers use this to pick a calmer, non-alarming
 * presentation: it's a connectivity blip, not something the user did wrong.
 */
export function isOffline(cause: unknown): boolean {
  return cause instanceof ApiError && cause.status === 0
}

const BIGINT_KEYS_PATTERN = Array.from(BIGINT_KEYS).join('|')
const BIGINT_MARKER = ' bigint '

// Hoisted to module scope: parseWithBigInts/stringifyWithBigInts run on every
// request/response, so these must not be recompiled per call. Safe to share —
// String.prototype.replace resets lastIndex on global regexes.
const BIGINT_FIELD_RE = new RegExp(`"(${BIGINT_KEYS_PATTERN})"\\s*:\\s*(-?\\d+)`, 'g')
const BIGINT_MARKER_RE = new RegExp(`"${BIGINT_MARKER}(-?\\d+)${BIGINT_MARKER}"`, 'g')

/**
 * Re-quotes large integer values before JSON.parse can round them, then revives
 * BIGINT_KEYS fields as bigint. The field-name pattern is derived from BIGINT_KEYS.
 */
export function parseWithBigInts<T>(text: string): T {
  const quoted = text.replace(BIGINT_FIELD_RE, '"$1":"$2"')
  return JSON.parse(quoted, (key, value) =>
    BIGINT_KEYS.has(key) && typeof value === 'string' ? BigInt(value) : value
  ) as T
}

/**
 * JSON.stringify throws on bigint, and `Number(stroops)` would silently round
 * past 2^53. This emits bigints as unquoted JSON integers instead.
 */
export function stringifyWithBigInts(value: unknown): string {
  const json = JSON.stringify(value, (_key, raw) =>
    typeof raw === 'bigint' ? `${BIGINT_MARKER}${raw.toString()}${BIGINT_MARKER}` : raw
  )
  return json.replace(BIGINT_MARKER_RE, '$1')
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  token?: string
  signal?: AbortSignal
  /** Sent as `Idempotency-Key` so the backend can dedupe retries of one intent. */
  idempotencyKey?: string
}

/**
 * User-facing message for 5xx responses. Backend error text on a server error
 * can leak internals (SQL errors, panics), so it is never shown verbatim.
 */
const SERVER_ERROR_MESSAGE = 'Something went wrong on our end. Please try again in a moment.'

function newIdempotencyKey(): string {
  const webCrypto = globalThis.crypto
  if (typeof webCrypto?.randomUUID === 'function') return webCrypto.randomUUID()
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`
}

/** Keys of intents whose last attempt may or may not have reached the backend. */
const unsettledIntents = new Map<string, string>()

/**
 * Runs a money-moving request with an idempotency key tied to the user's
 * intent (endpoint + account + payload). While an attempt ends without a
 * definite answer (network error or 5xx) the same key is reused on retry, so the
 * backend can dedupe; after a success or a definite rejection it is dropped.
 */
export async function withIdempotencyKey<T>(
  scope: string,
  token: string,
  body: unknown,
  send: (idempotencyKey: string) => Promise<T>
): Promise<T> {
  const intent = `${scope}|${token}|${stringifyWithBigInts(body)}`
  const idempotencyKey = unsettledIntents.get(intent) ?? newIdempotencyKey()
  unsettledIntents.set(intent, idempotencyKey)
  try {
    const result = await send(idempotencyKey)
    unsettledIntents.delete(intent)
    return result
  } catch (cause) {
    const outcomeUnknown = !(cause instanceof ApiError) || cause.status === 0 || cause.status >= 500
    if (!outcomeUnknown) unsettledIntents.delete(intent)
    throw cause
  }
}

/** Exported for tests: the single fetch wrapper every `api.*` call funnels through. */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, signal, idempotencyKey } = options

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      signal,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body: body === undefined ? undefined : stringifyWithBigInts(body),
    })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    // Also what a CORS rejection looks like from the browser's side. Every
    // page that doesn't special-case `status === 0` falls back to showing
    // this message as-is, so it stays generic — no backend URL, nothing
    // that reads like a stack trace.
    throw new ApiError(
      "We can't reach the server right now. Check your connection and try again.",
      0
    )
  }

  const text = await response.text()

  if (!response.ok) {
    // Only for calls that actually carried a token — a 401 from /login is a
    // wrong password, not an expired session.
    if (response.status === 401 && token) onUnauthorized?.()

    let message = `Request failed (${response.status})`
    let code: string | undefined
    let field: string | undefined
    try {
      const parsed = JSON.parse(text) as { error?: string; code?: string; field?: string }
      // Only 4xx responses carry messages meant for the user (validation,
      // auth). A 5xx body may contain internal details, so it is never shown.
      if (parsed.error && response.status < 500) message = parsed.error
      code = parsed.code
      field = parsed.field
    } catch {
      // Non-JSON body (proxy error page, panic); keep the status-code message.
    }

    if (response.status >= 500) message = SERVER_ERROR_MESSAGE
    throw new ApiError(message, response.status, code, field)
  }

  return text ? parseWithBigInts<T>(text) : (undefined as T)
}
