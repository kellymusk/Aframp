/**
 * Notification trigger helpers.
 *
 * Call these from API route handlers (server-side) to create notifications
 * when business events occur. They write directly to the store so the SSE
 * stream picks them up on the next 5-second poll.
 *
 * For client-side triggers (e.g. KYC context, order hook) use
 * `useNotifications().push()` instead.
 */

import { createNotification } from './notifications-store'

export async function notifyPaymentReceived(
  userId: string,
  amount: string,
  asset: string,
  txHash?: string
) {
  return createNotification({
    userId,
    title: 'Payment received',
    message: `You received ${amount} ${asset}.`,
    category: 'payment',
    priority: 'high',
    metadata: { amount, asset, txHash },
  })
}

export async function notifyOnrampStatusChange(
  userId: string,
  orderId: string,
  status: string
) {
  const messages: Record<string, { title: string; message: string }> = {
    pending:    { title: 'Onramp order pending',    message: `Order ${orderId} is awaiting your bank transfer.` },
    processing: { title: 'Onramp order processing', message: `Order ${orderId} is being processed.` },
    completed:  { title: 'Onramp order completed',  message: `Order ${orderId} completed — funds sent to your wallet.` },
    failed:     { title: 'Onramp order failed',     message: `Order ${orderId} could not be completed. Please try again.` },
  }
  const copy = messages[status] ?? {
    title: 'Onramp order update',
    message: `Order ${orderId} status: ${status}.`,
  }
  return createNotification({
    userId,
    ...copy,
    category: 'onramp',
    priority: status === 'completed' ? 'high' : 'normal',
    metadata: { orderId, status },
  })
}

export async function notifyOfframpSettled(
  userId: string,
  orderId: string,
  amount: string,
  currency: string
) {
  return createNotification({
    userId,
    title: 'Offramp settlement complete',
    message: `${amount} ${currency} has been sent to your bank account.`,
    category: 'offramp',
    priority: 'high',
    metadata: { orderId, amount, currency },
  })
}

export async function notifyPriceAlert(
  userId: string,
  asset: string,
  price: string,
  direction: 'above' | 'below',
  target: string
) {
  return createNotification({
    userId,
    title: `Price alert: ${asset}`,
    message: `${asset} is now ${direction === 'above' ? 'above' : 'below'} your target of ${target} (current: ${price}).`,
    category: 'price_alert',
    priority: 'normal',
    metadata: { asset, price, direction, target },
  })
}

export async function notifyKycStatusChange(userId: string, status: string) {
  const messages: Record<string, { title: string; message: string; priority: 'low' | 'normal' | 'high' }> = {
    submitted: { title: 'KYC submitted',       message: 'Your identity documents have been submitted for review.',  priority: 'normal' },
    pending:   { title: 'KYC under review',    message: 'Your KYC submission is being reviewed.',                   priority: 'normal' },
    approved:  { title: 'KYC approved ✓',      message: 'Your identity has been verified. You can now trade.',      priority: 'high' },
    rejected:  { title: 'KYC rejected',        message: 'Your KYC was not approved. Please resubmit with valid documents.', priority: 'high' },
    expired:   { title: 'KYC expired',         message: 'Your KYC verification has expired. Please resubmit.',     priority: 'normal' },
  }
  const copy = messages[status] ?? {
    title: 'KYC status update',
    message: `Your KYC status changed to: ${status}.`,
    priority: 'normal' as const,
  }
  return createNotification({
    userId,
    title: copy.title,
    message: copy.message,
    category: 'kyc',
    priority: copy.priority,
    metadata: { status },
  })
}
