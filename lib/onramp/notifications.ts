/**
 * lib/onramp/notifications.ts
 *
 * Sends transactional emails for onramp order lifecycle events via Resend.
 * Previously these were console.warn stubs — this module now delivers real
 * emails using the helpers in lib/email/resend-client.ts.
 *
 * Callers must supply a valid recipient email address.  The helper
 * `notifyOrderUpdate` is the recommended entry point for most use-cases.
 */

import { OnrampOrder } from '@/types/onramp'
import {
  sendOrderConfirmationEmail,
  sendPaymentReceivedEmail,
  sendTransferCompleteEmail,
  sendTransactionFailedEmail,
} from '@/lib/email/resend-client'

export interface NotificationData {
  orderId: string
  status: string
  amount?: number
  currency?: string
  cryptoAmount?: number
  cryptoAsset?: string
  transactionHash?: string
  /** Recipient email address — required for real delivery. */
  email?: string
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Sends a transactional email for the given order event type.
 *
 * @param type  - One of: 'order_created' | 'payment_received' | 'transfer_complete' | 'transaction_failed'
 * @param data  - Order data including recipient email
 */
export async function sendEmailNotification(type: string, data: NotificationData): Promise<void> {
  const {
    orderId,
    amount = 0,
    currency = 'NGN',
    cryptoAmount = 0,
    cryptoAsset = 'cNGN',
    transactionHash,
    email,
  } = data

  if (!email) {
    console.warn(
      `[notifications] sendEmailNotification(${type}): no recipient email provided — skipping.`
    )
    return
  }
  /** E.164 phone number of the recipient, e.g. "+234XXXXXXXXXX" */
  phoneNumber?: string
}

// ── Email ────────────────────────────────────────────────────────────────────

export function sendEmailNotification(type: string, data: NotificationData): Promise<void> {
  // This would integrate with your email service (SendGrid, Resend, etc.)
  const { subject, message } = getDetailedNotificationMessage(type, data)

  console.warn(`Email notification: ${type}`)
  console.warn(`Subject: ${subject}`)
  console.warn(`Message: ${message}`)

  // Simulate API call to email service
  return new Promise((resolve) => {
    setTimeout(() => {
      console.warn(`✅ Email sent for ${type}`)
      resolve()
    }, 1000)
  })
}

// ── SMS via Africa's Talking ──────────────────────────────────────────────────
//
// Africa's Talking is purpose-built for African markets and covers NG, KE, GH,
// ZA, and UG — exactly the currencies supported by AFRAMP.
//
// Required environment variables:
//   AT_API_KEY      — Africa's Talking API key (from their dashboard)
//   AT_USERNAME     — Africa's Talking username (use "sandbox" for testing)
//   AT_SENDER_ID    — Short-code or alphanumeric sender ID (optional)
//
// REST API docs: https://developers.africastalking.com/docs/sms/sending
// ---------------------------------------------------------------------------

const AT_BASE_URL = 'https://api.africastalking.com/version1/messaging'
const AT_SANDBOX_URL = 'https://api.sandbox.africastalking.com/version1/messaging'

/**
 * Send an SMS message to a phone number using Africa's Talking.
 *
 * SMS events wired up:
 *   order_created          — payment instructions
 *   payment_received       — payment confirmed, processing started
 *   transfer_complete      — funds credited to wallet
 *   transaction_failed     — failure notice with support contact
 *   offramp_initiated      — offramp settlement started
 */
export async function sendSMSNotification(
  type: string,
  data: NotificationData,
): Promise<void> {
  const apiKey = process.env.AT_API_KEY
  const username = process.env.AT_USERNAME
  const senderId = process.env.AT_SENDER_ID ?? ''
  const phoneNumber = data.phoneNumber

  if (!apiKey || !username) {
    console.warn('[SMS] AT_API_KEY or AT_USERNAME not set — skipping SMS for:', type)
    return
  }

  if (!phoneNumber) {
    console.warn('[SMS] No phone number provided — skipping SMS for:', type)
    return
  }

  const { message } = getDetailedNotificationMessage(type, data)
  // Africa's Talking caps standard SMS at 160 chars; longer messages are split
  // automatically, but we trim for cost predictability.
  const smsBody = message.replace(/\n+/g, ' ').trim().slice(0, 160)

  const isSandbox = username === 'sandbox'
  const url = isSandbox ? AT_SANDBOX_URL : AT_BASE_URL

  const params = new URLSearchParams({
    username,
    to: phoneNumber,
    message: smsBody,
  })
  if (senderId) params.set('from', senderId)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        apiKey,
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const json = (await res.json()) as {
      SMSMessageData?: { Message: string; Recipients?: { status: string; number: string }[] }
    }

    if (!res.ok) {
      console.error(`[SMS] Africa's Talking request failed (${res.status}):`, json)
      return
    }

    const recipients = json.SMSMessageData?.Recipients ?? []
    const failed = recipients.filter((r) => r.status !== 'Success')
    if (failed.length > 0) {
      console.error('[SMS] Delivery failures:', failed)
    } else {
      console.info(`[SMS] ✅ Sent "${type}" to ${phoneNumber}`)
    }
  } catch (err) {
    console.error("[SMS] Africa's Talking network error:", err)
  }
}

  const base = { to: email, orderId, amount, currency, cryptoAmount, cryptoAsset }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) {
    throw new Error(
      'NEXT_PUBLIC_APP_URL is not set. ' +
        'Add it to your .env.local file (e.g. NEXT_PUBLIC_APP_URL=http://localhost:3000) ' +
        'before sending email notifications.'
    )
  }

  switch (type) {
    case 'order_created':
      await sendOrderConfirmationEmail(base)
      break
      return {
        subject: `AFRAMP Order Created - #${orderId.slice(-8).toUpperCase()}`,
        message: `Your order #ONR-${orderId.slice(-8).toUpperCase()} is waiting for payment. 
        
Amount: ${amount?.toLocaleString()} ${currency}
Asset: ${cryptoAmount?.toFixed(2)} ${cryptoAsset}
Status: ${status.toUpperCase()}

Complete your payment to receive your ${cryptoAsset} tokens.

View order: ${appUrl}/onramp/payment?order=${orderId}`,
      }

    case 'payment_received':
      await sendPaymentReceivedEmail(base)
      break

    case 'transfer_complete':
      await sendTransferCompleteEmail({ ...base, transactionHash })
      break
      return {
        subject: `🎉 Transaction Complete - ${cryptoAmount?.toFixed(2)} ${cryptoAsset} Received!`,
        message: `Congratulations! Your transaction is complete.

✅ ${cryptoAmount?.toFixed(2)} ${cryptoAsset} sent to your wallet
💰 Amount paid: ${amount?.toLocaleString()} ${currency}
🔗 Transaction hash: ${transactionHash}
⏱️ Total time: 3 minutes 42 seconds

View on Stellar Explorer: https://stellar.expert/explorer/public/tx/${transactionHash}
Download receipt: ${appUrl}/onramp/success?order=${orderId}

Thank you for using AFRAMP!`,
      }

    case 'transaction_failed':
      await sendTransactionFailedEmail(base)
      break

    case 'offramp_initiated':
      return {
        subject: `Offramp Settlement Started - Order #${orderId.slice(-8).toUpperCase()}`,
        message: `Your offramp settlement has been initiated.

Order: #ONR-${orderId.slice(-8).toUpperCase()}
You will receive: ${amount?.toLocaleString()} ${currency}
Asset sold: ${cryptoAmount?.toFixed(2)} ${cryptoAsset}

Funds will arrive in your account within 1-2 business days.
Track your order: https://aframp.com/offramp/status?order=${orderId}`,
      }

    default:
      console.warn(`[notifications] Unknown notification type: ${type}`)
  }
}

/**
 * SMS notifications are handled by a separate provider (e.g. Twilio).
 * This stub is preserved to avoid breaking callers while SMS integration
 * is pending.
 */
export async function sendSMSNotification(type: string, data: NotificationData): Promise<void> {
  // TODO: integrate Twilio or Africa's Talking for SMS
  console.warn(`[notifications] SMS notification pending integration — type: ${type}`)
}

// ── Notification copy (used in push / in-app notifications) ─────────────────

export function getNotificationMessage(type: string, order: OnrampOrder): string {
  switch (type) {
    case 'order_created':
      return `Your order #${order.id.slice(-8).toUpperCase()} is waiting for payment`
    case 'payment_received':
      return `Payment confirmed! Processing your ${order.cryptoAsset}`
    case 'transfer_complete':
      return `${order.cryptoAmount.toFixed(2)} ${order.cryptoAsset} sent to your wallet`
    case 'transaction_failed':
      return `Payment issue with order #${order.id.slice(-8).toUpperCase()} — contact support`
    default:
      return 'AFRAMP transaction update'
  }
}

// ── Convenience wrapper ──────────────────────────────────────────────────────

/**
 * Sends email (and optionally SMS) notifications for an order lifecycle event.
 *
 * @param order  - The full OnrampOrder object
 * @param type   - Notification type key
 * @param email  - Recipient email address (fetched from auth session / user record by the caller)
 */
export async function notifyOrderUpdate(order: OnrampOrder, type: string, email?: string) {
  const data: NotificationData = {
    orderId: order.id,
    status: order.status,
    amount: order.amount,
    currency: order.fiatCurrency,
    cryptoAmount: order.cryptoAmount,
    cryptoAsset: order.cryptoAsset,
    transactionHash: order.transactionHash,
    email,
    // phoneNumber is not stored on OnrampOrder yet; populate from user profile
    // when that data is available:  phoneNumber: order.userPhoneNumber
  }

  try {
    await Promise.all([
      sendEmailNotification(type, data),
      // Uncomment to enable SMS once a provider is integrated:
      // sendSMSNotification(type, data),
      sendSMSNotification(type, data),
    ])
  } catch (error) {
    console.error('[notifications] Failed to send notifications:', error)
  }
}
