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

interface ConfirmWithdrawalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  amount: string
  asset: string
  submitting: boolean
  onConfirm: () => void
}

export function ConfirmWithdrawalDialog({
  open,
  onOpenChange,
  amount,
  asset,
  submitting,
  onConfirm,
}: ConfirmWithdrawalDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm cash out</AlertDialogTitle>
          <AlertDialogDescription>
            Cash out {amount} {asset}?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={submitting}
            onClick={(event) => {
              event.preventDefault()
              onConfirm()
            }}
          >
            {submitting ? 'Sending…' : 'Confirm cash out'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
