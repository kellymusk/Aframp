/**
 * M-Pesa Daraja API integration (STK Push / Lipa Na M-Pesa Online).
 *
 * Supported countries: Kenya (KE), Tanzania (TZ), Uganda (UG), Ghana (GH)
 *
 * Required env vars:
 *   MPESA_CONSUMER_KEY
 *   MPESA_CONSUMER_SECRET
 *   MPESA_SHORTCODE
 *   MPESA_PASSKEY
 *   MPESA_ENV  (sandbox | production)
 */

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
  const env = process.env.MPESA_ENV ?? 'sandbox'
  return env === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke'
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

  const consumerKey = process.env.MPESA_CONSUMER_KEY
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET

  if (!consumerKey || !consumerSecret) {
    throw new Error('MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET must be set')
  }

  const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')
  const url = `${getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${credentials}`,
    },
  })

  if (!response.ok) {
    throw new Error(`M-Pesa OAuth failed: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as { access_token: string; expires_in: string }

  tokenCache = {
    token: data.access_token,
    expiresAt: now + parseInt(data.expires_in, 10) * 1000,
  }

  return tokenCache.token
}

// ---------------------------------------------------------------------------
// STK Push
// ---------------------------------------------------------------------------

interface StkPushParams {
  phoneNumber: string // E.164, e.g. +254712345678
  amount: number
  accountReference: string
  transactionDesc: string
}

interface StkPushResponse {
  MerchantRequestID: string
  CheckoutRequestID: string
  ResponseCode: string
  ResponseDescription: string
  CustomerMessage: string
}

async function initiateStkPush(params: StkPushParams): Promise<StkPushResponse> {
  const token = await fetchAccessToken()
  const shortcode = process.env.MPESA_SHORTCODE
  const passkey = process.env.MPESA_PASSKEY

  if (!shortcode || !passkey) {
    throw new Error('MPESA_SHORTCODE and MPESA_PASSKEY must be set')
  }

  const timestamp = new Date()
    .toISOString()
    .replace(/[^0-9]/g, '')
    .slice(0, 14)

  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64')

  // Normalise phone: strip leading + and ensure it starts with country code
  const phone = params.phoneNumber.replace(/^\+/, '')

  const body = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.round(params.amount),
    PartyA: phone,
    PartyB: shortcode,
    PhoneNumber: phone,
    CallBackURL: `${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/payments/mobile-money/mpesa-callback`,
    AccountReference: params.accountReference,
    TransactionDesc: params.transactionDesc,
  }

  const response = await fetch(`${getBaseUrl()}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`STK Push request failed: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<StkPushResponse>
}

// ---------------------------------------------------------------------------
// Status polling
// ---------------------------------------------------------------------------

interface StkQueryResponse {
  ResponseCode: string
  ResponseDescription: string
  MerchantRequestID: string
  CheckoutRequestID: string
  ResultCode: string
  ResultDesc: string
}

async function queryStkStatus(checkoutRequestId: string): Promise<StkQueryResponse> {
  const token = await fetchAccessToken()
  const shortcode = process.env.MPESA_SHORTCODE
  const passkey = process.env.MPESA_PASSKEY

  if (!shortcode || !passkey) {
    throw new Error('MPESA_SHORTCODE and MPESA_PASSKEY must be set')
  }

  const timestamp = new Date()
    .toISOString()
    .replace(/[^0-9]/g, '')
    .slice(0, 14)

  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64')

  const body = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestId,
  }

  const response = await fetch(`${getBaseUrl()}/mpesa/stkpushquery/v1/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`STK Query failed: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<StkQueryResponse>
}

function mapResultCode(resultCode: string): PaymentStatus {
  switch (resultCode) {
    case '0':
      return 'SUCCESSFUL'
    case '1032':
      return 'CANCELLED'
    case '1':
      return 'INSUFFICIENT_FUNDS'
    default:
      return 'FAILED'
  }
}

// ---------------------------------------------------------------------------
// Poll until terminal state
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 3_000
const MAX_POLLS = 20 // ~60 seconds

async function pollForResult(checkoutRequestId: string): Promise<PaymentStatus> {
  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))

    const result = await queryStkStatus(checkoutRequestId)

    // ResponseCode 0 means the query itself succeeded; ResultCode is the payment outcome
    if (result.ResponseCode === '0') {
      const status = mapResultCode(result.ResultCode)
      if (status !== 'PENDING') {
        return status
      }
    }
  }

  return 'FAILED'
}

// ---------------------------------------------------------------------------
// MobileMoneyProvider implementation
// ---------------------------------------------------------------------------

export class MpesaProvider implements MobileMoneyProvider {
  async initiatePayment(params: PaymentParams): Promise<PaymentResult> {
    const stkResponse = await initiateStkPush({
      phoneNumber: params.phoneNumber,
      amount: params.amount,
      accountReference: params.accountReference,
      transactionDesc: params.transactionDesc,
    })

    if (stkResponse.ResponseCode !== '0') {
      throw new MobileMoneyError('FAILED', stkResponse.ResponseDescription)
    }

    // Poll for the final status in the background; return PENDING immediately
    // so the API route can respond quickly and the client can poll /status
    const transactionId = stkResponse.CheckoutRequestID

    // Kick off polling without awaiting — status endpoint will reflect result
    pollForResult(transactionId).catch(() => {
      // Polling errors are non-fatal; client will retry via status endpoint
    })

    return {
      transactionId,
      status: 'PENDING',
      provider: 'mpesa',
      raw: stkResponse,
    }
  }

  async getStatus(transactionId: string): Promise<PaymentStatus> {
    const result = await queryStkStatus(transactionId)

    if (result.ResponseCode !== '0') {
      return 'PENDING'
    }

    const status = mapResultCode(result.ResultCode)

    if (status === 'CANCELLED') {
      throw new MobileMoneyError('CANCELLED', result.ResultDesc)
    }
    if (status === 'INSUFFICIENT_FUNDS') {
      throw new MobileMoneyError('INSUFFICIENT_FUNDS', result.ResultDesc)
    }

    return status
  }
}

export const mpesaProvider = new MpesaProvider()

export function _resetTokenCache() {
  tokenCache = null
}
