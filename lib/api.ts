/**
 * Typed client for the Aframp Pay backend (Rust/Axum, see Aframp-backend).
 *
 * Every call goes through this app's own `/backend/*` rewrite (see
 * next.config.mjs), which forwards it server-side to the real backend origin
 * (`NEXT_API_URL`) — the browser never learns that origin directly.
 *
 * Errors always come back as `{ "error": "message" }`.
 */

/** Backend ids are UUIDs; aliased for readability, not validated here. */
type UUID = string

const BASE_URL = '/backend'

/**
 * Amount fields are `i64` on the wire. JSON.parse would silently round anything
 * past 2^53, so these keys are re-quoted before parsing and revived as bigint.
 */
const BIGINT_KEYS = new Set(['amount_stroops', 'available', 'pending', 'fee_stroops', 'network_fee_stroops', 'total_stroops'])

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

export interface AuthResponse {
  token: string
  user_id: UUID
  /**
   * Nullable by contract. Signup always creates a merchant today, but an
   * account without one gets 400 — not 401 — from every merchant-scoped call.
   */
  merchant_id: UUID | null
}

/**
 * What `/signup` always returns, and what `/login` returns for any account
 * with a verified phone (i.e. every account created since OTP shipped) —
 * neither endpoint issues a session directly anymore. `/verify-otp` is the
 * only call that ever turns this into an `AuthResponse`.
 */
export interface OtpChallengeResponse {
  challenge_id: UUID
  expires_in_secs: number
}

/**
 * `/login`'s response is conditional: a challenge for any phone-verified
 * account (the normal case), or a session directly for a legacy account
 * with no phone on file (only possible pre-OTP-rollout). Narrow with
 * `'challenge_id' in result`.
 */
export type LoginResult = AuthResponse | OtpChallengeResponse

export interface Me {
  user_id: UUID
  email: string
  name: string
  is_admin: boolean
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
  amount_paid_stroops?: bigint
  asset: string
  memo: string
  status: PaymentRequestStatus
  allow_partial?: boolean
  expires_at: string
  created_at: string
  /** null for any asset with no configured issuer — currently everything but XLM. */
  sep7_uri: string | null
}

export type RefundStatus = 'pending' | 'completed' | 'failed'

export interface Refund {
  id: UUID
  payment_id: UUID
  merchant_id: UUID
  amount_stroops: bigint
  asset: string
  status: RefundStatus
  recipient: string | null
  created_at: string
  updated_at: string
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

export interface FeeEstimate {
  fee_stroops: bigint
  network_fee_stroops: bigint
  total_stroops: bigint
}

export interface Remittance {
  id: UUID
  merchant_id: UUID
  destination_address: string
  amount_stroops: bigint
  asset: string
  memo: string | null
  status: 'pending' | 'submitted' | 'confirmed' | 'failed'
  tx_hash: string | null
  failure_reason: string | null
  created_at: string
  updated_at: string
}

export interface ApiKey {
  id: UUID
  merchant_id: UUID
  name: string
  key_preview: string // e.g. "ak_live_••••••••••••••••"
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
}

/** Platform-wide, not merchant-scoped — every `admin/*` call requires `Me.is_admin`. */
export interface AssetTotal {
  asset: string
  available: bigint
  pending: bigint
}

export interface StatusCount {
  status: string
  count: number
}

export interface AdminOverview {
  total_users: number
  total_merchants: number
  total_wallets: number
  balances_by_asset: AssetTotal[]
  payments_by_status: StatusCount[]
  withdrawals_by_status: StatusCount[]
  payment_requests_by_status: StatusCount[]
}

export interface AdminUserRow {
  id: UUID
  email: string
  name: string
  is_admin: boolean
  created_at: string
  merchant_id: UUID | null
  merchant_name: string | null
}

export interface AdminMerchantRow {
  id: UUID
  name: string
  owner_user_id: UUID
  owner_email: string
  created_at: string
  wallet_address: string | null
}

export interface AdminWalletRow {
  id: UUID
  merchant_id: UUID
  merchant_name: string
  address: string
  network: string
  created_at: string
}

export interface AdminTransactionRow {
  id: UUID
  merchant_id: UUID
  merchant_name: string
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

export interface AdminWithdrawalRow {
  id: UUID
  merchant_id: UUID
  merchant_name: string
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

export interface AdminPaymentRequestRow {
  id: UUID
  merchant_id: UUID
  merchant_name: string
  amount_stroops: bigint
  asset: string
  memo: string
  status: PaymentRequestStatus
  payment_id: UUID | null
  expires_at: string
  created_at: string
  updated_at: string
}

export interface UpdateProfileRequest {
  name?: string
  merchant_name?: string
}

export interface UpdateProfileResponse {
  user_id: UUID
  email: string
  name: string
  merchant_id: UUID | null
  merchant_name: string | null
}

export interface ChangeEmailRequest {
  new_email: string
}

export interface ChangeEmailResponse {
  message: string
}

export interface DeleteAccountResponse {
  message: string
}

export interface PushSubscriptionRequest {
  endpoint: string
  p256dh: string
  auth: string
}

export interface PushSubscriptionResponse {
  id: UUID
  merchant_id: UUID
  endpoint: string
  created_at: string
}

export interface PushSubscriptionStatus {
  enabled: boolean
}

export function parseWithBigInts<T>(text: string): T {
  const quoted = text.replace(/"(amount_stroops|available|pending)"\s*:\s*(-?\d+)/g, '"$1":"$2"')
  return JSON.parse(quoted, (key, value) =>
    BIGINT_KEYS.has(key) && typeof value === 'string' ? BigInt(value) : value
  ) as T
}

/**
 * JSON.stringify throws on bigint, and `Number(stroops)` would silently round
 * past 2^53. This emits bigints as unquoted JSON integers instead.
 */
export function stringifyWithBigInts(value: unknown): string {
  const marker = ' bigint '
  const json = JSON.stringify(value, (_key, raw) =>
    typeof raw === 'bigint' ? `${marker}${raw.toString()}${marker}` : raw
  )
  return json.replace(new RegExp(`"${marker}(-?\\d+)${marker}"`, 'g'), '$1')
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE'
  body?: unknown
  token?: string
  signal?: AbortSignal
}

/** Exported for tests: the single fetch wrapper every `api.*` call funnels through. */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
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
    // Also what a CORS rejection looks like from the browser's side. Every
    // page that doesn't special-case `status === 0` falls back to showing
    // this message as-is, so it stays generic — no backend URL, nothing
    // that reads like a stack trace.
    throw new ApiError("We can't reach the server right now. Check your connection and try again.", 0)
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
      if (parsed.error) message = parsed.error
      code = parsed.code
      field = parsed.field
    } catch {
      // Non-JSON body (proxy error page, panic); keep the status-code message.
    }
    throw new ApiError(message, response.status, code, field)
  }

  return text ? parseWithBigInts<T>(text) : (undefined as T)
}

export const api = {
  /** Never returns a session directly — always a challenge. The account is
   * only created once `verifyOtp` succeeds. */
  signup: (email: string, password: string, name: string, phoneNumber: string) =>
    request<OtpChallengeResponse>('/signup', {
      method: 'POST',
      body: { email, password, name, phone_number: phoneNumber },
    }),

  /** A challenge for any phone-verified account, or a session directly for
   * a legacy no-phone account — see `LoginResult`. */
  login: (email: string, password: string) =>
    request<LoginResult>('/login', { method: 'POST', body: { email, password } }),

  /** The only call that ever turns a challenge into a session. */
  verifyOtp: (challengeId: string, code: string) =>
    request<AuthResponse>('/verify-otp', {
      method: 'POST',
      body: { challenge_id: challengeId, code },
    }),

  logout: (token?: string) => request<void>('/logout', { method: 'POST', token }),

  /** The JWT carries only ids; this is how anything human-readable is rendered. */
  getMe: (token: string, signal?: AbortSignal) => request<Me>('/me', { token, signal }),

  createWallet: (token: string) =>
    request<Wallet>('/wallet/create', { method: 'POST', body: {}, token }),

  getWallet: (token: string) => request<Wallet>('/wallet', { token }),

  getBalances: (token: string, signal?: AbortSignal) =>
    request<Balance[]>('/balance', { token, signal }),

  listTransactions: (token: string, limit = 50, signal?: AbortSignal) =>
    request<Payment[]>(`/transactions?limit=${limit}`, { token, signal }),

  createPaymentRequest: (
    token: string,
    amountStroops: bigint,
    asset?: string,
    expiresInSecs?: number,
    allowPartial = false
  ) =>
    request<PaymentRequest>('/payment-requests', {
      method: 'POST',
      token,
      body: {
        amount_stroops: amountStroops,
        ...(asset ? { asset } : {}),
        ...(expiresInSecs ? { expires_in_secs: expiresInSecs } : {}),
        ...(allowPartial ? { allow_partial: true } : {}),
      },
    }),

  listPaymentRequests: (token: string, limit = 50, signal?: AbortSignal) =>
    request<PaymentRequest[]>(`/payment-requests?limit=${limit}`, { token, signal }),

  /** Deliberately public — a customer's wallet reads this without an account. */
  getPaymentRequest: (id: string, signal?: AbortSignal) =>
    request<PaymentRequest>(`/payment-requests/${id}`, { signal }),

  createRefund: (
    token: string,
    paymentId: string,
    amountStroops: bigint,
    recipientAddress: string,
    reason?: string
  ) =>
    request<Refund>(`/payments/${paymentId}/refund`, {
      method: 'POST',
      token,
      body: {
        amount_stroops: amountStroops,
        recipient: recipientAddress,
        ...(reason ? { reason } : {}),
      },
    }),

  listRefunds: (token: string, limit = 50, signal?: AbortSignal) =>
    request<Refund[]>(`/refunds?limit=${limit}`, { token, signal }),

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

  listApiKeys: (token: string, signal?: AbortSignal) =>
    request<ApiKey[]>('/api-keys', { token, signal }),

  createApiKey: (token: string, name: string) =>
    request<{ api_key: ApiKey; full_key: string }>('/api-keys', {
      method: 'POST',
      token,
      body: { name },
    }),

  revokeApiKey: (token: string, id: UUID) =>
    request<void>(`/api-keys/${id}`, { method: 'DELETE', token }),

  updateProfile: (token: string, body: UpdateProfileRequest) =>
    request<UpdateProfileResponse>('/me', { method: 'POST', token, body }),

  changeEmail: (token: string, newEmail: string) =>
    request<ChangeEmailResponse>('/me/email', {
      method: 'POST',
      token,
      body: { new_email: newEmail },
    }),

  deleteAccount: (token: string) =>
    request<DeleteAccountResponse>('/me', { method: 'DELETE', token }),

  registerPushSubscription: (token: string, subscription: PushSubscriptionRequest) =>
    request<PushSubscriptionResponse>('/push/subscribe', {
      method: 'POST',
      token,
      body: subscription,
    }),

  unregisterPushSubscription: (token: string) =>
    request<void>('/push/unsubscribe', { method: 'DELETE', token }),

  getPushSubscriptionStatus: (token: string, signal?: AbortSignal) =>
    request<PushSubscriptionStatus>('/push/status', { token, signal }),

  getRemittanceFeeEstimate: (
    token: string,
    amountStroops: bigint,
    asset = 'XLM',
    signal?: AbortSignal
  ) =>
    request<FeeEstimate>(`/remittance/estimate?amount_stroops=${amountStroops}&asset=${asset}`, {
      token,
      signal,
    }),

  createRemittance: (
    token: string,
    destinationAddress: string,
    amountStroops: bigint,
    asset = 'XLM',
    memo?: string
  ) =>
    request<Remittance>('/remittance', {
      method: 'POST',
      token,
      body: {
        destination_address: destinationAddress,
        amount_stroops: amountStroops,
        asset,
        ...(memo ? { memo } : {}),
      },
    }),

  listRemittances: (token: string, limit = 50, signal?: AbortSignal) =>
    request<Remittance[]>(`/remittances?limit=${limit}`, { token, signal }),

  // ZAR onramp via Ozow
  createOzowPayment: (token: string, amountZAR: number, bankCode: string, returnUrl: string) =>
    request<{ payment_url: string; transaction_id: string }>('/onramp/ozow/initiate', {
      method: 'POST',
      token,
      body: {
        amount: amountZAR,
        bank_code: bankCode,
        return_url: returnUrl,
      },
    }),

  verifyOzowPayment: (token: string, transactionId: string) =>
    request<{ status: 'pending' | 'completed' | 'failed'; tx_hash?: string }>(
      `/onramp/ozow/verify/${transactionId}`,
      { token }
    ),

  adminOverview: (token: string, signal?: AbortSignal) =>
    request<AdminOverview>('/admin/overview', { token, signal }),

  adminUsers: (token: string, limit = 100, signal?: AbortSignal) =>
    request<AdminUserRow[]>(`/admin/users?limit=${limit}`, { token, signal }),

  adminMerchants: (token: string, limit = 100, signal?: AbortSignal) =>
    request<AdminMerchantRow[]>(`/admin/merchants?limit=${limit}`, { token, signal }),

  adminWallets: (token: string, limit = 100, signal?: AbortSignal) =>
    request<AdminWalletRow[]>(`/admin/wallets?limit=${limit}`, { token, signal }),

  adminTransactions: (token: string, limit = 100, signal?: AbortSignal) =>
    request<AdminTransactionRow[]>(`/admin/transactions?limit=${limit}`, { token, signal }),

  adminWithdrawals: (token: string, limit = 100, signal?: AbortSignal) =>
    request<AdminWithdrawalRow[]>(`/admin/withdrawals?limit=${limit}`, { token, signal }),

  adminPaymentRequests: (token: string, limit = 100, signal?: AbortSignal) =>
    request<AdminPaymentRequestRow[]>(`/admin/payment-requests?limit=${limit}`, { token, signal }),
}
