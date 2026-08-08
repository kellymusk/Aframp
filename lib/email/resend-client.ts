/**
 * lib/email/resend-client.ts
 *
 * Singleton Resend client and typed helpers used throughout the app to send
 * transactional emails.  All sends are server-side only (Node.js / Edge
 * runtime).
 *
 * Required env vars:
 *   RESEND_API_KEY   – secret key from resend.com
 *   RESEND_FROM_EMAIL – verified sender address, e.g. "AFRAMP <no-reply@aframp.com>"
 */

import { Resend } from 'resend'
import * as React from 'react'

import { OrderConfirmation } from '@/emails/OrderConfirmation'
import { PaymentReceived } from '@/emails/PaymentReceived'
import { TransferComplete } from '@/emails/TransferComplete'
import { TransactionFailed } from '@/emails/TransactionFailed'
import { PriceAlertEmail } from '@/emails/PriceAlertEmail'
import type { PriceAlertDirection } from '@/emails/PriceAlertEmail'

// ── Singleton ────────────────────────────────────────────────────────────────

let _resend: Resend | null = null

function getResendClient(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error(
        'RESEND_API_KEY environment variable is not set. ' +
          'Add it to .env.local (development) or your hosting environment (production).'
      )
    }
    _resend = new Resend(apiKey)
  }
  return _resend
}

/** Default verified sender.  Override per-call if needed. */
function getFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL ?? 'AFRAMP <no-reply@aframp.com>'
}

// ── Generic send helper ──────────────────────────────────────────────────────

export interface SendEmailOptions {
  to: string
  subject: string
  /** Rendered React element produced by one of the emails/ components. */
  react: React.ReactElement
}

export interface SendEmailResult {
  id: string
}

/**
 * Sends a single transactional email and returns the Resend message id.
 * Throws on API error — callers should handle accordingly.
 */
export async function sendEmail({ to, subject, react }: SendEmailOptions): Promise<SendEmailResult> {
  const resend = getResendClient()
  const from = getFromAddress()

  const { data, error } = await resend.emails.send({ from, to, subject, react })

  if (error) {
    throw new Error(`Resend API error [${error.name}]: ${error.message}`)
  }

  if (!data?.id) {
    throw new Error('Resend API returned no message id')
  }

  return { id: data.id }
}

// ── Domain-specific helpers ───────────────────────────────────────────────────

export interface OrderEmailPayload {
  to: string
  orderId: string
  amount: number
  currency: string
  cryptoAmount: number
  cryptoAsset: string
  transactionHash?: string
}

/**
 * Order created — user needs to complete their payment.
 */
export async function sendOrderConfirmationEmail(payload: OrderEmailPayload): Promise<SendEmailResult> {
  const { to, orderId, amount, currency, cryptoAmount, cryptoAsset } = payload
  const shortId = orderId.slice(-8).toUpperCase()

  return sendEmail({
    to,
    subject: `AFRAMP Order Created – #ONR-${shortId}`,
    react: React.createElement(OrderConfirmation, {
      orderId,
      amount,
      currency,
      cryptoAmount,
      cryptoAsset,
    }),
  })
}

/**
 * Payment confirmed — processing the crypto transfer.
 */
export async function sendPaymentReceivedEmail(payload: OrderEmailPayload): Promise<SendEmailResult> {
  const { to, orderId, amount, currency, cryptoAsset } = payload
  const shortId = orderId.slice(-8).toUpperCase()

  return sendEmail({
    to,
    subject: `Payment Confirmed – Processing Your ${cryptoAsset} (#ONR-${shortId})`,
    react: React.createElement(PaymentReceived, {
      orderId,
      amount,
      currency,
      cryptoAsset,
      cryptoAmount: payload.cryptoAmount,
    }),
  })
}

/**
 * Transfer complete — crypto has arrived in the user's wallet.
 */
export async function sendTransferCompleteEmail(payload: OrderEmailPayload): Promise<SendEmailResult> {
  const { to, orderId, amount, currency, cryptoAmount, cryptoAsset, transactionHash } = payload

  if (!transactionHash) {
    throw new Error('transactionHash is required for sendTransferCompleteEmail')
  }

  const shortId = orderId.slice(-8).toUpperCase()

  return sendEmail({
    to,
    subject: `🎉 Transfer Complete – ${cryptoAmount.toFixed(6)} ${cryptoAsset} Received (#ONR-${shortId})`,
    react: React.createElement(TransferComplete, {
      orderId,
      amount,
      currency,
      cryptoAmount,
      cryptoAsset,
      transactionHash,
    }),
  })
}

/**
 * Transaction failed — payment or processing error.
 */
export async function sendTransactionFailedEmail(payload: OrderEmailPayload): Promise<SendEmailResult> {
  const { to, orderId, amount, currency } = payload
  const shortId = orderId.slice(-8).toUpperCase()

  return sendEmail({
    to,
    subject: `Transaction Failed – Order #ONR-${shortId}`,
    react: React.createElement(TransactionFailed, {
      orderId,
      amount,
      currency,
    }),
  })
}

export interface PriceAlertEmailPayload {
  to: string
  asset: string
  direction: PriceAlertDirection
  threshold: number
  actualValue: number
}

/**
 * Price alert triggered — threshold crossed.
 */
export async function sendPriceAlertEmail(payload: PriceAlertEmailPayload): Promise<SendEmailResult> {
  const { to, asset, direction, threshold, actualValue } = payload
  const directionLabel = direction === 'below' ? 'dropped below' : 'risen above'

  return sendEmail({
    to,
    subject: `Price Alert: ${asset} ${directionLabel} ₦${threshold.toLocaleString()}`,
    react: React.createElement(PriceAlertEmail, {
      asset,
      direction,
      threshold,
      actualValue,
    }),
  })
}
