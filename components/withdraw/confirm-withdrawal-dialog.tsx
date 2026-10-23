'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { formatStroops } from '@/lib/money'
import type { WithdrawalAsset } from '@/lib/withdraw'

export interface WithdrawalConfirmation {
  amount: bigint
  asset: WithdrawalAsset
  bankCode: string
  bankName: string
  accountNumber: string
}

interface ConfirmWithdrawalDialogProps {
  confirmation: WithdrawalConfirmation | null
  submitting: boolean
  onCancel: () => void
  onConfirm: () => void
}

/**
 * Loaded with next/dynamic from the Withdraw page so the Radix alert-dialog
 * code stays out of the route's initial JavaScript until a cash-out is
 * actually being confirmed.
 */
export function ConfirmWithdrawalDialog({
  confirmation,
  submitting,
  onCancel,
  onConfirm,
}: ConfirmWithdrawalDialogProps) {
  return (
    <AlertDialog
      open={confirmation !== null}
      onOpenChange={(open) => {
        if (!open) onCancel()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm cash-out</AlertDialogTitle>
          <AlertDialogDescription>
            Review the details before sending your withdrawal.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {confirmation && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Amount</dt>
            <dd className="font-medium">
              {formatStroops(confirmation.amount)} {confirmation.asset}
            </dd>
            <dt className="text-muted-foreground">Asset</dt>
            <dd>{confirmation.asset}</dd>
            <dt className="text-muted-foreground">Bank</dt>
            <dd>{confirmation.bankName}</dd>
            <dt className="text-muted-foreground">Account</dt>
            <dd>••••••{confirmation.accountNumber.slice(-4)}</dd>
          </dl>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={submitting} onClick={onConfirm}>
            {submitting ? 'Sending…' : 'Confirm cash out'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
