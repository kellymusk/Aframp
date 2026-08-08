/**
 * Shared types and interfaces for mobile money payment providers.
 */

export interface PaymentParams {
  phoneNumber: string // E.164 format, e.g. +254712345678
  amount: number
  currency: string // ISO 4217
  accountReference: string
  transactionDesc: string
  externalId: string
  email?: string // required by some providers (e.g. Flutterwave); synthesized from phone if omitted
}

export interface PaymentResult {
  transactionId: string
  status: PaymentStatus
  provider: MobileMoneyProviderName
  raw?: unknown
}

export type PaymentStatus = 'PENDING' | 'SUCCESSFUL' | 'FAILED' | 'CANCELLED' | 'INSUFFICIENT_FUNDS'

export type MobileMoneyProviderName = 'mpesa' | 'mtn_momo' | 'flutterwave'

export interface MobileMoneyProvider {
  initiatePayment(params: PaymentParams): Promise<PaymentResult>
  getStatus(transactionId: string): Promise<PaymentStatus>
}

/** Typed errors surfaced by providers */
export class MobileMoneyError extends Error {
  constructor(
    public readonly code: PaymentStatus,
    message: string
  ) {
    super(message)
    this.name = 'MobileMoneyError'
  }
}
