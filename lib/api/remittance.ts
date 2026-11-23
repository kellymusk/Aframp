import { request, withIdempotencyKey, type UUID } from './shared'

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

export function getRemittanceFeeEstimate(
  token: string,
  amountStroops: bigint,
  asset = 'XLM',
  signal?: AbortSignal
): Promise<FeeEstimate> {
  return request<FeeEstimate>(
    `/remittance/estimate?amount_stroops=${amountStroops}&asset=${asset}`,
    {
      token,
      signal,
    }
  )
}

export function createRemittance(
  token: string,
  destinationAddress: string,
  amountStroops: bigint,
  asset = 'XLM',
  memo?: string
): Promise<Remittance> {
  const body = {
    destination_address: destinationAddress,
    amount_stroops: amountStroops,
    asset,
    ...(memo ? { memo } : {}),
  }
  return withIdempotencyKey('/remittance', token, body, (idempotencyKey) =>
    request<Remittance>('/remittance', { method: 'POST', token, body, idempotencyKey })
  )
}

export function listRemittances(
  token: string,
  limit = 50,
  signal?: AbortSignal
): Promise<Remittance[]> {
  return request<Remittance[]>(`/remittances?limit=${limit}`, { token, signal })
}

export const remittanceApi = {
  getRemittanceFeeEstimate,
  createRemittance,
  listRemittances,
}
