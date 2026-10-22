/**
 * Typed client for the Aframp Pay backend (Rust/Axum, see Aframp-backend).
 *
 * Every call goes through this app's own `/backend/*` rewrite (see
 * next.config.mjs), which forwards it server-side to the real backend origin
 * (`NEXT_API_URL`) — the browser never learns that origin directly.
 *
 * Errors always come back as `{ "error": "message" }`.
 *
 * This barrel module preserves backwards compatibility for all existing imports.
 */

import { adminApi } from './api/admin'
import { authApi } from './api/auth'
import { paymentsApi } from './api/payments'
import { remittanceApi } from './api/remittance'

export * from './api/shared'
export * from './api/auth'
export * from './api/payments'
export * from './api/admin'
export * from './api/remittance'

export const api = {
  ...authApi,
  ...paymentsApi,
  ...remittanceApi,
  ...adminApi,
}

/**
 * Await a promise but never block longer than `timeoutMs`.
 *
 * Resolves (never rejects) once the promise settles or the timeout elapses,
 * whichever comes first. Used by sign-out so a hanging logout request cannot
 * keep the local session alive indefinitely.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T | undefined> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(undefined), timeoutMs)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      () => {
        clearTimeout(timer)
        resolve(undefined)
      },
    )
  })
}
