'use client'

import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface PaymentInstructionsProps {
  amount: string
  reference: string
  expiresIn: number
}

export function PaymentInstructions({ amount, reference, expiresIn }: PaymentInstructionsProps) {
  const steps = [
    'Open your bank app or USSD banking',
    `Transfer exactly ${amount} to the account above`,
    `Include reference code "${reference}" in the narration`,
    'Wait for confirmation (usually 2-5 minutes)',
  ]

  const warnings = [
    `Transfer EXACT amount (${amount})`,
    'Include reference code in narration',
    `Payment expires in ${expiresIn} minutes`,
    'Do not reuse this account for future payments',
  ]

  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-semibold text-foreground mb-3">Payment Steps</h4>
        <ol className="space-y-3">
          {steps.map((step, index) => (
            <li key={index} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                {index + 1}
              </span>
              <span className="text-sm text-muted-foreground pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <Alert className="border-warning/50 bg-warning/10">
        <AlertTriangle className="h-4 w-4 text-warning-foreground" />
        <AlertTitle className="text-warning-foreground">Important Notes</AlertTitle>
        <AlertDescription>
          <ul className="mt-2 space-y-1">
            {warnings.map((warning, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-warning-foreground">•</span>
                {warning}
              </li>
            ))}
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  )
}
