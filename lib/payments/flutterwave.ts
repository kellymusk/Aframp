/**
 * Flutterwave Mobile Money Collections API integration.
 *
 * Supported countries (via mobile money charge types): Ghana (GH), Kenya (KE),
 * Uganda (UG), Zambia (ZM), Rwanda (RW), Cameroon (CM), Côte d'Ivoire (CI).
 * Charge type mapping is keyed by currency — verify current values against
 * https://developer.flutterwave.com/docs/collecting-payments/mobile-money
 * before enabling in production.
 *
 * Required env vars:
 *   FLUTTERWAVE_SECRET_KEY
 */

import {
  MobileMoneyError,
  MobileMoneyProvider,
  PaymentParams,
  PaymentResult,
  PaymentStatus,
} from './types'

const BASE_URL = 'https://api.flutterwave.com/v3'

const CHARGE_TYPE_BY_CURRENCY: Record<string, string> = {
  GHS: 'mobile_money_ghana',
  UGX: 'mobile_money_uganda',
  ZMW: 'mobile_money_zambia',
  RWF: 'mobile_money_rwanda',
  KES: 'mpesa',
  XOF: 'mobile_money_franco',
  XAF: 'mobile_money_franco',
}

function getChargeType(currency: string): string {
  const chargeType = CHARGE_TYPE_BY_CURRENCY[currency.toUpperCase()]
  if (!chargeType) {
    throw new Error(`Flutterwave mobile money is not configured for currency: ${currency}`)
  }
  return chargeType
}

function getSecretKey(): string {
  const secretKey = process.env.FLUTTERWAVE_SECRET_KEY
  if (!secretKey) {
    throw new Error('FLUTTERWAVE_SECRET_KEY must be set')
  }
  return secretKey
}

interface FlutterwaveChargeResponse {
  status: 'success' | 'error'
  message: string
  data?: {
    id: number
    tx_ref: string
    status: 'pending' | 'successful' | 'failed'
  }
}

async function initiateCharge(params: PaymentParams): Promise<FlutterwaveChargeResponse> {
  const chargeType = getChargeType(params.currency)
  const phone = params.phoneNumber.replace(/^\+/, '')

  const response = await fetch(`${BASE_URL}/charges?type=${chargeType}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tx_ref: params.externalId,
      amount: params.amount,
      currency: params.currency.toUpperCase(),
      email: params.email ?? `${phone}@aframp.local`,
      phone_number: phone,
      fullname: params.accountReference,
    }),
  })

  if (!response.ok) {
    throw new Error(`Flutterwave charge request failed: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<FlutterwaveChargeResponse>
}

interface FlutterwaveVerifyResponse {
  status: 'success' | 'error'
  data?: {
    status: 'successful' | 'failed' | 'pending'
  }
}

async function verifyCharge(transactionId: string): Promise<FlutterwaveVerifyResponse> {
  const response = await fetch(`${BASE_URL}/transactions/${transactionId}/verify`, {
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Flutterwave verify request failed: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<FlutterwaveVerifyResponse>
}

function mapStatus(status: string | undefined): PaymentStatus {
  switch (status) {
    case 'successful':
      return 'SUCCESSFUL'
    case 'failed':
      return 'FAILED'
    default:
      return 'PENDING'
  }
}

export class FlutterwaveMobileMoneyProvider implements MobileMoneyProvider {
  async initiatePayment(params: PaymentParams): Promise<PaymentResult> {
    const charge = await initiateCharge(params)

    if (charge.status !== 'success' || !charge.data) {
      throw new MobileMoneyError('FAILED', charge.message ?? 'Flutterwave charge failed')
    }

    return {
      transactionId: String(charge.data.id),
      status: mapStatus(charge.data.status),
      provider: 'flutterwave',
      raw: charge,
    }
  }

  async getStatus(transactionId: string): Promise<PaymentStatus> {
    const result = await verifyCharge(transactionId)

    if (result.status !== 'success' || !result.data) {
      return 'PENDING'
    }

    const status = mapStatus(result.data.status)

    if (status === 'FAILED') {
      throw new MobileMoneyError('FAILED', 'Flutterwave payment failed')
    }

    return status
  }
}

export const flutterwaveProvider = new FlutterwaveMobileMoneyProvider()
