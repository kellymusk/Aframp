import type { PaymentStatus, WithdrawalStatus } from '@/lib/api'
import type { Remittance } from '@/lib/api'

export type StatusVariant = 'default' | 'secondary' | 'destructive'

export interface StatusConfig<Status extends string> {
  label: Record<Status, string>
  variant: Record<Status, StatusVariant>
}

/**
 * One label and badge colour per status, shared by every page that shows a
 * payment so merchants and admins never see the same status worded or
 * coloured differently (#932).
 */
export const PAYMENT_STATUS: StatusConfig<PaymentStatus> = {
  label: {
    detected: 'Incoming',
    verified: 'Confirming',
    confirmed: 'Paid',
    failed: 'Failed',
  },
  variant: {
    detected: 'secondary',
    verified: 'secondary',
    confirmed: 'default',
    failed: 'destructive',
  },
}

export const WITHDRAWAL_STATUS: StatusConfig<WithdrawalStatus> = {
  label: {
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Paid out',
    failed: 'Failed',
  },
  variant: {
    pending: 'secondary',
    processing: 'secondary',
    completed: 'default',
    failed: 'destructive',
  },
}

export const REMITTANCE_STATUS: StatusConfig<Remittance['status']> = {
  label: {
    pending: 'Pending',
    submitted: 'Submitted',
    confirmed: 'Confirmed',
    failed: 'Failed',
  },
  variant: {
    pending: 'secondary',
    submitted: 'secondary',
    confirmed: 'default',
    failed: 'destructive',
  },
}
