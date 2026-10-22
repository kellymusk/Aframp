import { request, type UUID } from './shared'

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

/** What an API key may do: read data, take charges, or cash out. */
export type ApiKeyScope = 'read' | 'charges' | 'payouts'

export interface ApiKey {
  id: UUID
  merchant_id: UUID
  name: string
  key_preview: string // e.g. "ak_live_••••••••••••••••"
  /** Empty or missing on keys created before scopes existed — those have full access. */
  scopes?: ApiKeyScope[]
  /** null when the key never expires. */
  expires_at?: string | null
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
}

export interface CreateApiKeyOptions {
  scopes?: ApiKeyScope[]
  /** ISO timestamp; omit or null for a key that never expires. */
  expiresAt?: string | null
}

export function createWallet(token: string, signal?: AbortSignal): Promise<Wallet> {
  return request<Wallet>('/wallet/create', { method: 'POST', body: {}, token, signal })
}

export function getWallet(token: string, signal?: AbortSignal): Promise<Wallet> {
  return request<Wallet>('/wallet', { token, signal })
}

export function getBalances(token: string, signal?: AbortSignal): Promise<Balance[]> {
  return request<Balance[]>('/balance', { token, signal })
}

export function listTransactions(
  token: string,
  limit = 50,
  signal?: AbortSignal
): Promise<Payment[]> {
  return request<Payment[]>(`/transactions?limit=${limit}`, { token, signal })
}

export function createPaymentRequest(
  token: string,
  amountStroops: bigint,
  asset?: string,
  expiresInSecs?: number,
  allowPartial = false
): Promise<PaymentRequest> {
  return request<PaymentRequest>('/payment-requests', {
    method: 'POST',
    token,
    body: {
      amount_stroops: amountStroops,
      ...(asset ? { asset } : {}),
      ...(expiresInSecs ? { expires_in_secs: expiresInSecs } : {}),
      ...(allowPartial ? { allow_partial: true } : {}),
    },
  })
}

export function listPaymentRequests(
  token: string,
  limit = 50,
  signal?: AbortSignal
): Promise<PaymentRequest[]> {
  return request<PaymentRequest[]>(`/payment-requests?limit=${limit}`, { token, signal })
}

/** Deliberately public — a customer's wallet reads this without an account. */
export function getPaymentRequest(id: string, signal?: AbortSignal): Promise<PaymentRequest> {
  return request<PaymentRequest>(`/payment-requests/${id}`, { signal })
}

export function createRefund(
  token: string,
  paymentId: string,
  amountStroops: bigint,
  recipientAddress: string,
  reason?: string
): Promise<Refund> {
  return request<Refund>(`/payments/${paymentId}/refund`, {
    method: 'POST',
    token,
    body: {
      amount_stroops: amountStroops,
      recipient: recipientAddress,
      ...(reason ? { reason } : {}),
    },
  })
}

export function listRefunds(token: string, limit = 50, signal?: AbortSignal): Promise<Refund[]> {
  return request<Refund[]>(`/refunds?limit=${limit}`, { token, signal })
}

export function createWithdrawal(
  token: string,
  amountStroops: bigint,
  bankCode: string,
  accountNumber: string,
  asset = 'cNGN'
): Promise<Withdrawal> {
  return request<Withdrawal>('/withdraw', {
    method: 'POST',
    token,
    body: {
      amount_stroops: amountStroops,
      asset,
      bank_code: bankCode,
      account_number: accountNumber,
    },
  })
}

export function listWithdrawals(
  token: string,
  limit = 50,
  signal?: AbortSignal
): Promise<Withdrawal[]> {
  return request<Withdrawal[]>(`/withdrawals?limit=${limit}`, { token, signal })
}

export function listApiKeys(token: string, signal?: AbortSignal): Promise<ApiKey[]> {
  return request<ApiKey[]>('/api-keys', { token, signal })
}

export function createApiKey(
  token: string,
  name: string,
  { scopes, expiresAt }: CreateApiKeyOptions = {}
): Promise<{ api_key: ApiKey; full_key: string }> {
  return request<{ api_key: ApiKey; full_key: string }>('/api-keys', {
    method: 'POST',
    token,
    body: {
      name,
      ...(scopes ? { scopes } : {}),
      ...(expiresAt ? { expires_at: expiresAt } : {}),
    },
  })
}

export function revokeApiKey(token: string, id: UUID): Promise<void> {
  return request<void>(`/api-keys/${id}`, { method: 'DELETE', token })
}

export function createOzowPayment(
  token: string,
  amountZAR: number,
  bankCode: string,
  returnUrl: string
): Promise<{ payment_url: string; transaction_id: string }> {
  return request<{ payment_url: string; transaction_id: string }>('/onramp/ozow/initiate', {
    method: 'POST',
    token,
    body: {
      amount: amountZAR,
      bank_code: bankCode,
      return_url: returnUrl,
    },
  })
}

export function verifyOzowPayment(
  token: string,
  transactionId: string
): Promise<{ status: 'pending' | 'completed' | 'failed'; tx_hash?: string }> {
  return request<{ status: 'pending' | 'completed' | 'failed'; tx_hash?: string }>(
    `/onramp/ozow/verify/${transactionId}`,
    { token }
  )
}

export const paymentsApi = {
  createWallet,
  getWallet,
  getBalances,
  listTransactions,
  createPaymentRequest,
  listPaymentRequests,
  getPaymentRequest,
  createRefund,
  listRefunds,
  createWithdrawal,
  listWithdrawals,
  listApiKeys,
  createApiKey,
  revokeApiKey,
  createOzowPayment,
  verifyOzowPayment,
}
