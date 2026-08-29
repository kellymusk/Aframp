/**
 * Typed client for the Aframp Pay backend (Rust/Axum, see Aframp-backend).
 *
 * The backend is a separate origin, so every call goes straight from the browser
 * to it with a bearer token — there is no Next.js API layer in between.
 *
 * Errors always come back as `{ "error": "message" }`.
 */

import type { KycInitiateRequest, KycInitiateResponse, KycStatusResponse } from '@/types/kyc'
import type { OfframpFeeBreakdown, OfframpOrder } from '@/types/offramp'

/** Backend ids are UUIDs; aliased for readability, not validated here. */
type UUID = string

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '')

/**
 * Amount fields are `i64` on the wire. JSON.parse would silently round anything
 * past 2^53, so these keys are re-quoted before parsing and revived as bigint.
 */
const BIGINT_KEYS = new Set(['amount_stroops', 'available', 'pending'])

/**
 * There are no refresh tokens — a 24h expiry just starts returning 401. The
 * session provider registers here so any expired call lands the user back on
 * the login screen instead of showing a bare error.
 */
let onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export interface AuthResponse {
  token: string
  user_id: UUID
  /**
   * Nullable by contract. Signup always creates a merchant today, but an
   * account without one gets 400 — not 401 — from every merchant-scoped call.
   */
  merchant_id: UUID | null
}

export interface Session {
  token: string
  userId: string
  merchantId: string | null
/** SEP-0010 challenge transaction, ready to be signed client-side. */
export interface Sep10Challenge {
  transaction: string
  network_passphrase: string
}

export interface Me {
  user_id: UUID
  email: string
  name: string
  created_at: string
  merchant_id: UUID | null
  merchant_name: string | null
}

export interface Wallet {
  id: UUID
  merchant_id: UUID
  address: string
  network: string
  created_at: string
}

export interface Balance {
  merchant_id: UUID
  asset: string
  available: bigint
  pending: bigint
  updated_at: string
}

export type PaymentStatus = 'detected' | 'verified' | 'confirmed' | 'failed'

export interface Payment {
  id: UUID
  merchant_id: UUID
  wallet_id: UUID
  wallet_address: string
  tx_hash: string
  amount_stroops: bigint
  asset: string
  network: string
  status: PaymentStatus
  confirmations: number
  created_at: string
  updated_at: string
}

export type PaymentRequestStatus = 'pending' | 'paid' | 'expired'

export interface PaymentRequest {
  id: UUID
  merchant_id: UUID
  address: string
  network: string
  amount_stroops: bigint
  asset: string
  memo: string
  status: PaymentRequestStatus
  expires_at: string
  created_at: string
  /** null for any asset with no configured issuer — currently everything but XLM. */
  sep7_uri: string | null
}

export interface ResolvedAccount {
  account_number: string
  account_name: string
  bank_code: string
}

export type WithdrawalStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface Withdrawal {
  id: UUID
  merchant_id: UUID
  amount_stroops: bigint
  asset: string
  status: WithdrawalStatus
  provider: string | null
  provider_reference: string | null
  bank_code: string | null
  account_number: string | null
  failure_reason: string | null
  created_at: string
  updated_at: string
}

function parseWithBigInts<T>(text: string): T {
  const quoted = text.replace(/"(amount_stroops|available|pending)"\s*:\s*(-?\d+)/g, '"$1":"$2"')
  try {
    return JSON.parse(quoted, (key, value) =>
      BIGINT_KEYS.has(key) && typeof value === 'string' ? BigInt(value) : value
    ) as T
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof RangeError) {
      throw new ApiError(`Invalid JSON response: ${error.message}`, 500)
    }
    throw error
  }
}

/**
 * JSON.stringify throws on bigint, and `Number(stroops)` would silently round
 * past 2^53. This emits bigints as quoted strings, which parseWithBigInts revives.
 */
function stringifyWithBigInts(value: unknown): string {
  return JSON.stringify(value, (_key, raw) =>
    typeof raw === 'bigint' ? raw.toString() : raw
  )
}

interface RequestOptions {
  method?: 'GET' | 'POST'
  body?: unknown
  token?: string
  signal?: AbortSignal
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, signal } = options

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      signal,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : stringifyWithBigInts(body),
    })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    // Also what a CORS rejection looks like from the browser's side.
    throw new ApiError(`Can't reach the payment server at ${BASE_URL}.`, 0)
  }

  const text = await response.text()

  if (!response.ok) {
    // Only for calls that actually carried a token — a 401 from /login is a
    // wrong password, not an expired session.
    if (response.status === 401 && token) onUnauthorized?.()

    let message = `Request failed (${response.status})`
    try {
      const parsed = JSON.parse(text) as { error?: string }
      if (parsed.error) message = parsed.error
    } catch {
      // Non-JSON body (proxy error page, panic); keep the status-code message.
    }
    throw new ApiError(message, response.status)
  }

  return text ? parseWithBigInts<T>(text) : (undefined as T)
}

/**
 * Calls through Next.js API route to set httpOnly cookie
 */
async function requestWithCookie<T>(
  path: string,
  options: { method?: 'GET' | 'POST'; body?: unknown } = {}
): Promise<T> {
  const { method = 'GET', body } = options

  const response = await fetch(path, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const text = await response.text()

  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const parsed = JSON.parse(text) as { error?: string }
      if (parsed.error) message = parsed.error
    } catch {}
    throw new ApiError(message, response.status)
  }

  return text ? JSON.parse(text) : (undefined as T)
}

export const api = {
  signup: (email: string, password: string, name: string) =>
    requestWithCookie<AuthResponse>('/api/auth/signup', {
      method: 'POST',
      body: { email, password, name },
    }),

  login: (email: string, password: string) =>
    requestWithCookie<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    }),

  getSession: () => fetch('/api/auth/session').then(r => r.json() as Promise<{ session: Session | null }>),

  logout: () =>
    requestWithCookie<{ success: boolean }>('/api/auth/logout', {
      method: 'POST',
    }),

  resetPasswordRequest: (email: string) =>
    request<{ message: string }>('/password-reset/request', { method: 'POST', body: { email } }),

  resetPassword: (token: string, password: string) =>
    request<{ message: string }>('/password-reset/confirm', { method: 'POST', body: { token, password } }),

  /** SEP-0010 step 1: fetch a challenge transaction for a Stellar address to sign. */
  getStellarChallenge: (address: string) =>
    request<Sep10Challenge>(`/auth/stellar/challenge?address=${encodeURIComponent(address)}`),

  /** SEP-0010 step 2: hand back the wallet-signed challenge, receive a session JWT. */
  verifyStellarChallenge: (signedTransaction: string) =>
    request<AuthResponse>('/auth/stellar/verify', {
      method: 'POST',
      body: { transaction: signedTransaction },
    }),

  /** The JWT carries only ids; this is how anything human-readable is rendered. */
  getMe: (token: string, signal?: AbortSignal) => request<Me>('/me', { token, signal }),

  createWallet: (token: string) =>
    request<Wallet>('/wallet/create', { method: 'POST', body: {}, token }),

  getWallet: (token: string) => request<Wallet>('/wallet', { token }),

  getBalances: (token: string, signal?: AbortSignal) =>
    request<Balance[]>('/balance', { token, signal }),

  /**
   * The backend paginates by offset, not cursor — there is no `next_cursor`
   * in the response, just a flat array. Callers infer `hasMore` by comparing
   * the returned length against `limit`.
   */
  listTransactions: (token: string, limit = 50, offset = 0, signal?: AbortSignal) =>
    request<Payment[]>(`/transactions?limit=${limit}&offset=${offset}`, { token, signal }),

  createPaymentRequest: (
    token: string,
    amountStroops: bigint,
    asset?: string,
    expiresInSecs?: number,
    memo?: string
  ) =>
    request<PaymentRequest>('/payment-requests', {
      method: 'POST',
      token,
      body: {
        amount_stroops: amountStroops,
        ...(asset ? { asset } : {}),
        ...(expiresInSecs ? { expires_in_secs: expiresInSecs } : {}),
        ...(memo ? { memo } : {}),
      },
    }),

  listPaymentRequests: (token: string, limit = 50, signal?: AbortSignal) =>
    request<PaymentRequest[]>(`/payment-requests?limit=${limit}`, { token, signal }),

  /** Deliberately public — a customer's wallet reads this without an account. */
  getPaymentRequest: (id: string, signal?: AbortSignal) =>
    request<PaymentRequest>(`/payment-requests/${id}`, { signal }),

  /**
   * Proxies to Paystack's account resolution API server-side so the Paystack
   * secret key never touches the browser. Rejects with a 404 ApiError when
   * the account number/bank code pair doesn't resolve to a real account.
   */
  resolveAccount: (
    token: string,
    bankCode: string,
    accountNumber: string,
    signal?: AbortSignal
  ) =>
    request<ResolvedAccount>('/accounts/resolve', {
      method: 'POST',
      token,
      signal,
      body: { bank_code: bankCode, account_number: accountNumber },
    }),

  createWithdrawal: (
    token: string,
    amountStroops: bigint,
    bankCode: string,
    accountNumber: string,
    asset = 'cNGN'
  ) =>
    request<Withdrawal>('/withdraw', {
      method: 'POST',
      token,
      body: {
        amount_stroops: amountStroops,
        asset,
        bank_code: bankCode,
        account_number: accountNumber,
      },
    }),

  listWithdrawals: (token: string, limit = 50, signal?: AbortSignal) =>
    request<Withdrawal[]>(`/withdrawals?limit=${limit}`, { token, signal }),

  /** Dedicated status endpoint so the gate can be checked without pulling the full profile. */
  getKycStatus: (token: string, signal?: AbortSignal) =>
    request<KycStatusResponse>('/kyc-status', { token, signal }),

  initiateKyc: (token: string, body: KycInitiateRequest) =>
    request<KycInitiateResponse>('/kyc/initiate', { method: 'POST', token, body }),

  getOfframpRate: (token: string, asset: string, fiatCurrency: string, signal?: AbortSignal) =>
    request<{ rate: number; lastUpdated: number }>(
      `/offramp/rate?asset=${asset}&fiat=${fiatCurrency}`,
      { token, signal }
    ),

  getOfframpFees: (
    token: string,
    asset: string,
    fiatCurrency: string,
    amount: number,
    signal?: AbortSignal
  ) =>
    request<OfframpFeeBreakdown>(
      `/offramp/fees?asset=${asset}&fiat=${fiatCurrency}&amount=${amount}`,
      { token, signal }
    ),

  createOfframpOrder: (token: string, assetId: string, amount: number, fiatCurrency: string) =>
    request<OfframpOrder>('/offramp/orders', {
      method: 'POST',
      token,
      body: { asset_id: assetId, amount, fiat_currency: fiatCurrency },
    }),

  getOfframpOrder: (token: string, id: string, signal?: AbortSignal) =>
    request<OfframpOrder>(`/offramp/orders/${id}`, { token, signal }),

  submitOfframpBankDetails: (
    token: string,
    orderId: string,
    details: { bankCode?: string; accountNumber: string }
  ) =>
    request<OfframpOrder>(`/offramp/orders/${orderId}/bank-details`, {
      method: 'POST',
      token,
      body: { bank_code: details.bankCode, account_number: details.accountNumber },
    }),

  /** Re-queues a failed payout without making the user re-enter bank details. */
  retryOfframpOrder: (token: string, orderId: string) =>
    request<OfframpOrder>(`/offramp/orders/${orderId}/retry`, { method: 'POST', token, body: {} }),
  /** SEP-0024: kicks off the anchor's interactive deposit flow. */
  startSep24Deposit: (token: string, asset = 'cNGN') =>
    request<Sep24Interactive>('/sep24/deposit', { method: 'POST', token, body: { asset } }),

  /** SEP-0024: kicks off the anchor's interactive withdrawal flow. */
  startSep24Withdrawal: (token: string, asset = 'cNGN') =>
    request<Sep24Interactive>('/sep24/withdraw', { method: 'POST', token, body: { asset } }),
}
