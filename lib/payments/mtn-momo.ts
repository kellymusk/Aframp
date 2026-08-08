/**
 * MTN Mobile Money (MoMo) Collections API integration.
 *
 * Supported countries: Ghana (GH), Uganda (UG), Cameroon (CM),
 *                      Côte d'Ivoire (CI), Rwanda (RW), Zambia (ZM)
 *
 * Required env vars:
 *   MTN_MOMO_SUBSCRIPTION_KEY
 *   MTN_MOMO_API_USER   (UUID v4 — provision once, store here)
 *   MTN_MOMO_API_KEY
 *   MTN_MOMO_ENV        (sandbox | production)
 */

import crypto from 'crypto'
import {
  MobileMoneyError,
  MobileMoneyProvider,
  PaymentParams,
  PaymentResult,
  PaymentStatus,
} from './types'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function getBaseUrl(): string {
  const env = process.env.MTN_MOMO_ENV ?? 'sandbox'
  return env === 'production'
    ? 'https://proxy.momoapi.mtn.com'
    : 'https://sandbox.momodeveloper.mtn.com'
}

// ---------------------------------------------------------------------------
// OAuth token cache
// ---------------------------------------------------------------------------

interface TokenCache {
  token: string
  expiresAt: number // epoch ms
}

let tokenCache: TokenCache | null = null

async function fetchAccessToken(): Promise<string> {
  const now = Date.now()
  if (tokenCache && tokenCache.expiresAt > now + 30_000) {
    return tokenCache.token
  }

  const apiUser = process.env.MTN_MOMO_API_USER
  const apiKey = process.env.MTN_MOMO_API_KEY
  const subscriptionKey = process.env.MTN_MOMO_SUBSCRIPTION_KEY

  if (!apiUser || !apiKey || !subscriptionKey) {
    throw new Error('MTN_MOMO_API_USER, MTN_MOMO_API_KEY, and MTN_MOMO_SUBSCRIPTION_KEY must be set')
  }

  const credentials = Buffer.from(`${apiUser}:${apiKey}`).toString('base64')

  const response = await fetch(`${getBaseUrl()}/collection/token/`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Ocp-Apim-Subscription-Key': subscriptionKey,
    },
  })

  if (!response.ok) {
    throw new Error(`MTN MoMo token fetch failed: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as { access_token: string; expires_in: number }

  tokenCache = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  }

  return tokenCache.token
}

// ---------------------------------------------------------------------------
// Request to Pay
// ---------------------------------------------------------------------------

interface RequestToPayBody {
  amount: string
  currency: string
  externalId: string
  payer: {
    partyIdType: 'MSISDN'
    partyId: string
  }
  payerMessage: string
  payeeNote: string
}

async function requestToPay(params: {
  phoneNumber: string
  amount: number
  currency: string
  externalId: string
  payerMessage: string
  payeeNote: string
}): Promise<string> {
  const token = await fetchAccessToken()
  const subscriptionKey = process.env.MTN_MOMO_SUBSCRIPTION_KEY

  if (!subscriptionKey) {
    throw new Error('MTN_MOMO_SUBSCRIPTION_KEY must be set')
  }

  // Strip leading + for MSISDN
  const msisdn = params.phoneNumber.replace(/^\+/, '')

  const referenceId = crypto.randomUUID()

  const body: RequestToPayBody = {
    amount: String(Math.round(params.amount)),
    currency: params.currency,
    externalId: params.externalId,
    payer: {
      partyIdType: 'MSISDN',
      partyId: msisdn,
    },
    payerMessage: params.payerMessage,
    payeeNote: params.payeeNote,
  }

  const response = await fetch(`${getBaseUrl()}/collection/v1_0/requesttopay`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Reference-Id': referenceId,
      'X-Target-Environment': process.env.MTN_MOMO_ENV ?? 'sandbox',
      'Ocp-Apim-Subscription-Key': subscriptionKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  // 202 Accepted is the success response for this endpoint
  if (response.status !== 202) {
    throw new Error(`MTN MoMo requestToPay failed: ${response.status} ${response.statusText}`)
  }

  return referenceId
}

// ---------------------------------------------------------------------------
// Status polling
// ---------------------------------------------------------------------------

interface RequestToPayResult {
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED'
  reason?: {
    code: string
    message: string
  }
}

async function getRequestToPayStatus(referenceId: string): Promise<RequestToPayResult> {
  const token = await fetchAccessToken()
  const subscriptionKey = process.env.MTN_MOMO_SUBSCRIPTION_KEY

  if (!subscriptionKey) {
    throw new Error('MTN_MOMO_SUBSCRIPTION_KEY must be set')
  }

  const response = await fetch(
    `${getBaseUrl()}/collection/v1_0/requesttopay/${referenceId}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Target-Environment': process.env.MTN_MOMO_ENV ?? 'sandbox',
        'Ocp-Apim-Subscription-Key': subscriptionKey,
      },
    }
  )

  if (!response.ok) {
    throw new Error(`MTN MoMo status check failed: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<RequestToPayResult>
}

function mapMtnStatus(status: RequestToPayResult['status']): PaymentStatus {
  switch (status) {
    case 'SUCCESSFUL':
      return 'SUCCESSFUL'
    case 'FAILED':
      return 'FAILED'
    default:
      return 'PENDING'
  }
}

// ---------------------------------------------------------------------------
// MobileMoneyProvider implementation
// ---------------------------------------------------------------------------

export class MtnMomoProvider implements MobileMoneyProvider {
  async initiatePayment(params: PaymentParams): Promise<PaymentResult> {
    const referenceId = await requestToPay({
      phoneNumber: params.phoneNumber,
      amount: params.amount,
      currency: params.currency,
      externalId: params.externalId,
      payerMessage: params.transactionDesc,
      payeeNote: params.accountReference,
    })

    return {
      transactionId: referenceId,
      status: 'PENDING',
      provider: 'mtn_momo',
    }
  }

  async getStatus(transactionId: string): Promise<PaymentStatus> {
    const result = await getRequestToPayStatus(transactionId)
    const status = mapMtnStatus(result.status)

    if (status === 'FAILED') {
      throw new MobileMoneyError('FAILED', result.reason?.message ?? 'Payment failed')
    }

    return status
  }
}

export const mtnMomoProvider = new MtnMomoProvider()

export function _resetTokenCache() {
  tokenCache = null
}
