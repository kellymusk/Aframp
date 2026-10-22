import type { PaymentStatus } from '@/lib/api'

/** Merchant-facing names for each payment status. */
export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  detected: 'Incoming',
  verified: 'Confirming',
  confirmed: 'Paid',
  failed: 'Failed',
}

export function paymentStatusVariant(status: PaymentStatus) {
  if (status === 'confirmed') return 'default' as const
  if (status === 'failed') return 'destructive' as const
  return 'secondary' as const
}
