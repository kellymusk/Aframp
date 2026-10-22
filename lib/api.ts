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
