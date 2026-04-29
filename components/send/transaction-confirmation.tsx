'use client'

import { Loader2, ArrowUpRight, CheckCircle2, Copy, Check, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { SendFormState } from './send-page-client'

interface TransactionConfirmationProps {
  form: SendFormState
  step: 'confirm' | 'success'
  isSending: boolean
  onBack: () => void
  onConfirm: () => void
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
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [txId] = useState(() => 'AFR' + Math.random().toString(36).slice(2, 10).toUpperCase())

  const copy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const shortAddress = form.recipient?.address
    ? `${form.recipient.address.slice(0, 8)}...${form.recipient.address.slice(-6)}`
    : '—'

  // ── Success screen ──
  if (step === 'success') {
    return (
      <div className="flex-1 flex flex-col items-center justify-between px-5 pb-8 pt-4">
        {/* Animation ring */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/25 flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9 text-emerald-500" strokeWidth={2} />
              </div>
            </div>
            {/* Pulse rings */}
            <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-ping" />
          </div>

          <div className="text-center space-y-1.5">
            <h2 className="text-2xl font-bold">Sent!</h2>
            <p className="text-muted-foreground text-sm">Your transaction is on its way</p>
          </div>

          {/* Amount pill */}
          <div className="flex items-baseline gap-2 px-6 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-3xl font-bold text-emerald-500">{form.amount}</span>
            <span className="text-base font-medium text-emerald-400">{form.asset.symbol}</span>
          </div>

          {/* Details card */}
          <div className="w-full rounded-2xl border border-border/60 bg-card overflow-hidden">
            <div className="px-4 py-3 space-y-3">
              <DetailRow
                label="To"
                value={form.recipient?.name ?? shortAddress}
                sub={form.recipient?.name ? shortAddress : undefined}
              />
              <Separator className="opacity-50" />
              <DetailRow label="Asset" value={`${form.asset.name} (${form.asset.symbol})`} />
              {form.note && (
                <>
                  <Separator className="opacity-50" />
                  <DetailRow label="Note" value={form.note} />
                </>
              )}
              <Separator className="opacity-50" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Transaction ID</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono text-foreground">{txId}</span>
                  <button
                    onClick={() => copy(txId, 'txid')}
                    className="text-muted-foreground hover:text-emerald-500 transition-colors"
                  >
                    {copiedField === 'txid' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Done button */}
        <div className="w-full space-y-2.5">
          <Button
            onClick={onDone}
            className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
          >
            Back to Home
          </Button>
          <button className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2">
            View on Explorer
          </button>
        </div>
      </div>
    )
  }

  // ── Confirm screen ──
  const estimatedFee = (parseFloat(form.amount || '0') * 0.001).toFixed(6)
  const totalCost = (parseFloat(form.amount || '0') + parseFloat(estimatedFee)).toFixed(6)

  return (
    <div className="flex-1 flex flex-col px-5 pb-8 pt-2 gap-4">
      {/* Amount hero */}
      <div className="flex flex-col items-center py-6 gap-1.5">
        <div className="flex items-center gap-1.5 mb-1">
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm',
              form.asset.symbol === 'XLM'
                ? 'bg-sky-500'
                : form.asset.symbol === 'USDC'
                  ? 'bg-blue-500'
                  : form.asset.symbol === 'BTC'
                    ? 'bg-amber-500'
                    : 'bg-indigo-500'
            )}
          >
            {form.asset.icon}
          </div>
          <span className="text-sm font-medium text-muted-foreground">{form.asset.name}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-bold tabular-nums">{form.amount}</span>
          <span className="text-2xl font-medium text-muted-foreground">{form.asset.symbol}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span className="text-sm">
            to{' '}
            <span className="font-medium text-foreground">
              {form.recipient?.name ?? shortAddress}
            </span>
          </span>
        </div>
      </div>

      {/* Details card */}
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden divide-y divide-border/40">
        {/* Recipient row */}
        <div className="px-4 py-3.5 flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">Recipient</span>
          <div className="flex items-center gap-2 min-w-0">
            {form.recipient?.name && (
              <span className="text-sm font-medium truncate">{form.recipient.name}</span>
            )}
            <span className="text-xs font-mono text-muted-foreground truncate">{shortAddress}</span>
            <button
              onClick={() => copy(form.recipient?.address ?? '', 'addr')}
              className="text-muted-foreground hover:text-emerald-500 transition-colors shrink-0"
            >
              {copiedField === 'addr' ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Amount row */}
        <div className="px-4 py-3.5 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Amount</span>
          <span className="text-sm font-semibold">
            {form.amount} {form.asset.symbol}
          </span>
        </div>

        {/* Network fee */}
        <div className="px-4 py-3.5 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Network fee</span>
          <span className="text-sm text-muted-foreground">
            ~{estimatedFee} {form.asset.symbol}
          </span>
        </div>

        {/* Total */}
        <div className="px-4 py-3.5 flex items-center justify-between bg-muted/20">
          <span className="text-sm font-semibold">Total</span>
          <span className="text-sm font-bold">
            {totalCost} {form.asset.symbol}
          </span>
        </div>

        {/* Note */}
        {form.note && (
          <div className="px-4 py-3.5 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Note</span>
            <span className="text-sm italic text-muted-foreground max-w-[180px] truncate">
              &ldquo;{form.note}&rdquo;
            </span>
          </div>
        )}
      </div>

      {/* Security note */}
      <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-muted/30 border border-border/40">
        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Transactions on Stellar are irreversible. Please verify the recipient address before
          confirming.
        </p>
      </div>

      {/* CTAs */}
      <div className="mt-auto space-y-2.5">
        <Button
          onClick={onConfirm}
          disabled={isSending}
          className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold disabled:opacity-70 transition-all"
        >
          {isSending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending…
            </>
          ) : (
            <>
              Confirm & Send
              <ArrowUpRight className="w-4 h-4" />
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          onClick={onBack}
          disabled={isSending}
          className="w-full h-10 text-muted-foreground hover:text-foreground"
        >
          Go back
        </Button>
      </div>
    </div>
  )
}

function DetailRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <div className="text-right min-w-0">
        <p className="text-xs font-medium truncate">{value}</p>
        {sub && <p className="text-xs text-muted-foreground font-mono truncate">{sub}</p>}
      </div>
    </div>
  )
}
