'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, QrCode, ChevronRight, Wallet, StickyNote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { RecentRecipients } from './recent-recipients'
import { QRScanner } from './qr-scanner'
import { TransactionConfirmation } from './transaction-confirmation'

type Step = 'recipient' | 'amount' | 'confirm' | 'success'

export interface CryptoAsset {
  symbol: string
  name: string
  balance: string
  icon: string
  color: string
}

export interface SendFormState {
  recipient: { address: string; name?: string; avatar?: string } | null
  amount: string
  asset: CryptoAsset
  note: string
}

export const ASSETS: CryptoAsset[] = [
  { symbol: 'XLM', name: 'Stellar Lumens', balance: '1,245.00', icon: '✦', color: 'text-sky-400' },
  { symbol: 'USDC', name: 'USD Coin', balance: '500.00', icon: '$', color: 'text-blue-400' },
  { symbol: 'BTC', name: 'Bitcoin', balance: '0.0021', icon: '₿', color: 'text-amber-400' },
  { symbol: 'ETH', name: 'Ethereum', balance: '0.142', icon: 'Ξ', color: 'text-indigo-400' },
]

const NUMPAD_KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', '⌫'],
]

export function SendPageClient() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('recipient')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [recipientInput, setRecipientInput] = useState('')
  const [form, setForm] = useState<SendFormState>({
    recipient: null,
    amount: '',
    asset: ASSETS[0],
    note: '',
  })

  const steps: Step[] = ['recipient', 'amount', 'confirm']
  const currentStepIdx = steps.indexOf(step)

  const handleBack = () => {
    if (step === 'recipient') {
      router.back()
    } else if (step === 'amount') {
      setStep('recipient')
    } else if (step === 'confirm') {
      setStep('amount')
    } else {
      router.push('/dashboard')
    }
  }

  const handleRecipientSelect = (address: string, name?: string, avatar?: string) => {
    setRecipientInput(address)
    setForm((prev) => ({ ...prev, recipient: { address, name, avatar } }))
  }

  const handleContinueRecipient = () => {
    if (!recipientInput.trim()) return
    setForm((prev) => ({
      ...prev,
      recipient:
        prev.recipient?.address === recipientInput ? prev.recipient : { address: recipientInput },
    }))
    setStep('amount')
  }

  const handleNumpad = (key: string) => {
    if (key === '⌫') {
      setForm((prev) => ({ ...prev, amount: prev.amount.slice(0, -1) }))
      return
    }
    if (key === '.' && form.amount.includes('.')) return
    if (key === '.' && form.amount === '') {
      setForm((prev) => ({ ...prev, amount: '0.' }))
      return
    }
    const parts = form.amount.split('.')
    if (parts[1]?.length >= 6) return
    if (form.amount === '0' && key !== '.') {
      setForm((prev) => ({ ...prev, amount: key }))
      return
    }
    setForm((prev) => ({ ...prev, amount: prev.amount + key }))
  }

  const handleSend = async () => {
    setIsSending(true)
    await new Promise((resolve) => setTimeout(resolve, 2200))
    setIsSending(false)
    setStep('success')
  }

  const isRecipientValid = recipientInput.trim().length > 5
  const isAmountValid = parseFloat(form.amount) > 0

  return (
    <div className="min-h-screen bg-background flex flex-col items-center">
      <div className="w-full max-w-md flex flex-col min-h-screen relative">
        {/* ── Header ── */}
        <header className="flex items-center gap-3 px-5 pt-6 pb-3">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <h1 className="text-base font-semibold tracking-tight">
            {step === 'recipient' && 'Send to'}
            {step === 'amount' && 'Enter amount'}
            {step === 'confirm' && 'Confirm send'}
            {step === 'success' && 'Sent!'}
          </h1>

          {/* Progress dots */}
          {step !== 'success' && (
            <div className="ml-auto flex items-center gap-1.5">
              {steps.map((s, i) => (
                <div
                  key={s}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300',
                    i <= currentStepIdx ? 'bg-emerald-500 w-5' : 'bg-muted w-3'
                  )}
                />
              ))}
            </div>
          )}
        </header>

        {/* ── Recipient Step ── */}
        {step === 'recipient' && (
          <div className="flex flex-col flex-1 px-5 gap-5 pb-8">
            {/* Address input */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Wallet address or username
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Wallet className="w-4 h-4" />
                </div>
                <Input
                  value={recipientInput}
                  onChange={(e) => setRecipientInput(e.target.value)}
                  placeholder="G... or @username"
                  className="pl-9 pr-12 font-mono text-sm h-12 bg-muted/40 border-border/60 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/60"
                />
                <button
                  onClick={() => setScannerOpen(true)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-emerald-500 transition-colors"
                  title="Scan QR code"
                >
                  <QrCode className="w-5 h-5" />
                </button>
              </div>
              {recipientInput && !isRecipientValid && (
                <p className="text-xs text-muted-foreground">
                  Enter a valid Stellar address (starts with G)
                </p>
              )}
            </div>

            {/* Recent recipients */}
            <RecentRecipients onSelect={handleRecipientSelect} />

            {/* CTA */}
            <div className="mt-auto">
              <Button
                onClick={handleContinueRecipient}
                disabled={!isRecipientValid}
                className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold disabled:opacity-40 transition-all"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Amount Step ── */}
        {step === 'amount' && (
          <div className="flex flex-col flex-1 px-5 pb-6 gap-4">
            {/* Recipient pill */}
            <button
              onClick={() => setStep('recipient')}
              className="flex items-center gap-2.5 w-fit px-3 py-2 rounded-full bg-muted/50 border border-border/50 hover:border-emerald-500/40 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <span className="text-emerald-500 text-xs font-bold">
                  {form.recipient?.name?.[0]?.toUpperCase() ??
                    form.recipient?.address?.[0]?.toUpperCase() ??
                    'G'}
                </span>
              </div>
              <span className="text-sm font-medium truncate max-w-[160px]">
                {form.recipient?.name ??
                  `${form.recipient?.address?.slice(0, 8)}...${form.recipient?.address?.slice(-4)}`}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
            </button>

            {/* Amount display */}
            <div className="flex-1 flex flex-col items-center justify-center gap-2 min-h-[140px]">
              <div className="flex items-baseline gap-2">
                <span
                  className={cn(
                    'font-bold tabular-nums transition-all duration-150',
                    form.amount.length > 8
                      ? 'text-3xl'
                      : form.amount.length > 5
                        ? 'text-5xl'
                        : 'text-6xl'
                  )}
                >
                  {form.amount || '0'}
                </span>
                <span className="text-xl font-medium text-muted-foreground">
                  {form.asset.symbol}
                </span>
              </div>

              {/* Asset selector */}
              <div className="flex gap-2 mt-1">
                {ASSETS.map((asset) => (
                  <button
                    key={asset.symbol}
                    onClick={() => setForm((prev) => ({ ...prev, asset }))}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-150',
                      form.asset.symbol === asset.symbol
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'bg-muted/40 border-border/50 text-muted-foreground hover:border-emerald-500/40'
                    )}
                  >
                    {asset.symbol}
                  </button>
                ))}
              </div>

              <p className="text-xs text-muted-foreground mt-0.5">
                Balance: {form.asset.balance} {form.asset.symbol}
              </p>
            </div>

            {/* Note field */}
            <div className="relative">
              <StickyNote className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={form.note}
                onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                placeholder="Add a note (optional)"
                className="pl-9 h-10 text-sm bg-muted/30 border-border/50 focus-visible:ring-emerald-500/30"
                maxLength={80}
              />
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-1.5">
              {NUMPAD_KEYS.flat().map((key) => (
                <button
                  key={key}
                  onClick={() => handleNumpad(key)}
                  className={cn(
                    'h-14 rounded-xl font-semibold text-lg transition-all duration-100 active:scale-95',
                    key === '⌫'
                      ? 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                      : 'bg-muted/50 hover:bg-muted/80 active:bg-muted'
                  )}
                >
                  {key}
                </button>
              ))}
            </div>

            {/* CTA */}
            <Button
              onClick={() => setStep('confirm')}
              disabled={!isAmountValid}
              className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold disabled:opacity-40"
            >
              Review
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* ── Confirm & Success Steps ── */}
        {(step === 'confirm' || step === 'success') && (
          <TransactionConfirmation
            form={form}
            step={step}
            isSending={isSending}
            onBack={() => setStep('amount')}
            onConfirm={handleSend}
            onDone={() => router.push('/dashboard')}
          />
        )}
      </div>

      {/* QR Scanner overlay */}
      {scannerOpen && (
        <QRScanner
          onScan={(address) => {
            handleRecipientSelect(address)
            setScannerOpen(false)
          }}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </div>
  )
}
