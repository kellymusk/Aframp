'use client'

import { CheckCircle2, Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CryptoAsset {
  symbol: string
  name: string
  balance: string
  icon: string
  color: string
}

interface SendFormState {
  recipient: { address: string; name?: string; avatar?: string } | null
  amount: string
  asset: CryptoAsset
  note: string
}

interface TransactionConfirmationProps {
  form: SendFormState
  step: 'confirm' | 'success'
  isSending: boolean
  onBack: () => void
  onConfirm: () => Promise<void> | void
  onDone: () => void
}

export function TransactionConfirmation({
  form,
  step,
  isSending,
  onBack,
  onConfirm,
  onDone,
}: TransactionConfirmationProps) {
  if (step === 'success') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-5 pb-8 pt-8 text-center">
        <CheckCircle2 className="h-16 w-16 text-emerald-500" />
        <div>
          <h2 className="text-2xl font-semibold">Sent successfully</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {form.amount} {form.asset.symbol} was sent to {form.recipient?.name ?? form.recipient?.address}
          </p>
        </div>
        <Button onClick={onDone} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white">
          Back to dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-5 px-5 pb-8 pt-2">
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="rounded-2xl border border-border bg-muted/20 p-4">
        <div className="text-sm text-muted-foreground">Sending</div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xl font-semibold">{form.amount || '0'} {form.asset.symbol}</span>
          <span className="text-sm text-muted-foreground">{form.asset.name}</span>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          To: <span className="font-medium text-foreground">{form.recipient?.name ?? form.recipient?.address}</span>
        </div>
        {form.note && <div className="mt-2 text-sm text-muted-foreground">Note: {form.note}</div>}
      </div>

      <div className="mt-auto">
        <Button
          onClick={onConfirm}
          disabled={isSending}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
        >
          {isSending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            'Confirm send'
          )}
        </Button>
      </div>
    </div>
  )
}
