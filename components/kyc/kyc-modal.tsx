'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { KycForm } from './kyc-form'

interface KycModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete?: () => void
}

export function KycModal({ open, onOpenChange, onComplete }: KycModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Complete Your KYC Verification</DialogTitle>
          <DialogDescription>
            We need to verify your identity to unlock all features. This process takes just a few minutes.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6">
          <KycForm
            onComplete={() => {
              onComplete?.()
              // Keep modal open to show completion status
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
