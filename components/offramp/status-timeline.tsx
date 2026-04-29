'use client'

import { motion } from 'framer-motion'
import { Check, Loader2, Clock, XCircle, ExternalLink, Copy, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export type StepStatus = 'complete' | 'in-progress' | 'waiting' | 'failed'

interface Step {
  id: number
  title: string
  description: string | React.ReactNode
  status: StepStatus
  details?: React.ReactNode
}

interface StatusTimelineProps {
  currentStep: number
  steps: Step[]
}

export function StatusTimeline({ steps }: StatusTimelineProps) {
  return (
    <div className="space-y-8">
      {steps.map((step, index) => (
        <div key={step.id} className="relative" suppressHydrationWarning>
          {index !== steps.length - 1 && (
            <div
              className={cn(
                'absolute left-4 top-10 bottom-0 w-0.5 -ml-px transition-colors duration-500',
                step.status === 'complete' ? 'bg-emerald-500' : 'bg-muted'
              )}
            />
          )}

          <div className="flex items-start group">
            <div className="relative flex items-center justify-center flex-shrink-0">
              <motion.div
                initial={false}
                animate={{
                  scale: step.status === 'in-progress' ? 1.1 : 1,
                  backgroundColor:
                    step.status === 'complete'
                      ? '#10b981'
                      : step.status === 'in-progress'
                        ? '#3b82f6'
                        : step.status === 'failed'
                          ? '#ef4444'
                          : '#1f2937',
                }}
                className={cn(
                  'h-8 w-8 rounded-full border-2 flex items-center justify-center z-10 transition-colors',
                  step.status === 'complete'
                    ? 'border-emerald-500'
                    : step.status === 'in-progress'
                      ? 'border-blue-500'
                      : step.status === 'failed'
                        ? 'border-red-500'
                        : 'border-muted-foreground/30'
                )}
              >
                {step.status === 'complete' && <Check className="h-4 w-4 text-white" />}
                {step.status === 'in-progress' && (
                  <Loader2 className="h-4 w-4 text-white animate-spin" />
                )}
                {step.status === 'waiting' && <Clock className="h-4 w-4 text-muted-foreground" />}
                {step.status === 'failed' && <XCircle className="h-4 w-4 text-white" />}
              </motion.div>
            </div>

            <div className="ml-4 min-w-0 flex-1 py-0.5">
              <div className="flex items-center justify-between">
                <h3
                  className={cn(
                    'text-sm font-semibold transition-colors',
                    step.status === 'waiting' ? 'text-muted-foreground' : 'text-foreground'
                  )}
                >
                  {step.title}
                </h3>
                {step.status === 'in-progress' && (
                  <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                )}
              </div>
              <div className="mt-1">
                <div
                  className={cn(
                    'text-sm',
                    step.status === 'waiting' ? 'text-muted-foreground/60' : 'text-muted-foreground'
                  )}
                >
                  {step.description}
                </div>
                {step.details && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 p-4 rounded-xl bg-muted/50 border border-border/50 overflow-hidden"
                  >
                    {step.details}
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Sub-components for specific step details

export function WaitingForCryptoDetails({
  address,
  memo,
  timeLeft,
}: {
  amount: string
  address: string
  memo: string
  timeLeft: number
}) {
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  return (
    <div className="space-y-4" suppressHydrationWarning>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
            Send to Address
          </label>
          <div className="flex items-center gap-2 group cursor-pointer">
            <code className="text-xs font-mono truncate">{address}</code>
            <Copy className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
            Memo
          </label>
          <div className="flex items-center gap-2 group cursor-pointer">
            <code className="text-xs font-mono">{memo}</code>
            <Copy className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <div className="flex items-center gap-2 text-xs text-amber-500 font-medium">
          <Clock className="h-3 w-3" />
          Time remaining: {minutes}:{seconds.toString().padStart(2, '0')}
        </div>
        <Button variant="link" size="sm" className="h-auto p-0 text-blue-500 text-xs gap-1">
          <HelpCircle className="h-3 w-3" />
          View Instructions
        </Button>
      </div>
    </div>
  )
}

export function CryptoReceivedDetails({
  amount,
  time,
  txHash,
  confirmations,
}: {
  amount: string
  time: string
  txHash: string
  confirmations: string
}) {
  return (
    <div className="space-y-3" suppressHydrationWarning>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Amount Received</span>
        <span className="font-medium text-emerald-500">{amount}</span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Confirmed at</span>
        <span>{time}</span>
      </div>
      <div className="flex items-center justify-between text-xs pt-2 border-t border-border/50">
        <span className="text-muted-foreground">Transaction Hash</span>
        <a href="#" className="text-blue-500 flex items-center gap-1 hover:underline">
          {txHash} <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 w-full" />
        </div>
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
          {confirmations} confirmations
        </span>
      </div>
    </div>
  )
}

export function ConversionDetails({
  targetAmount,
  rate,
}: {
  amount: string
  targetAmount: string
  rate: string
}) {
  return (
    <div className="space-y-2" suppressHydrationWarning>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Exchange Rate</span>
        <span className="font-mono">1 cNGN = {rate}</span>
      </div>
      <div className="flex items-center justify-between text-sm font-semibold pt-1">
        <span className="text-foreground">Converting</span>
        <span className="text-emerald-500">{targetAmount}</span>
      </div>
      <div className="text-[10px] text-muted-foreground flex items-center gap-1">
        <Clock className="h-3 w-3 animate-pulse text-blue-500" />
        Est. time: 2-3 minutes
      </div>
    </div>
  )
}

export function BankTransferDetails({
  account,
  name,
  reference,
}: {
  amount: string
  account: string
  name: string
  reference: string
}) {
  return (
    <div className="space-y-2" suppressHydrationWarning>
      <div className="p-3 bg-background/50 rounded-lg border border-border/50 space-y-1">
        <div className="text-[10px] uppercase text-muted-foreground font-bold tracking-tight">
          Receiving Bank Account
        </div>
        <div className="text-xs font-semibold">{name}</div>
        <div className="text-xs text-muted-foreground font-mono">{account} • Access Bank</div>
      </div>
      <div className="flex items-center justify-between text-xs pt-1">
        <span className="text-muted-foreground">Reference</span>
        <span className="font-mono">{reference}</span>
      </div>
      <div className="text-[10px] text-muted-foreground flex items-center gap-1">
        <Clock className="h-3 w-3 animate-pulse text-blue-500" />
        Est. arrival: 2-6 hours
      </div>
    </div>
  )
}

export function CompletionDetails({
  amount,
  duration,
  reference,
}: {
  amount: string
  duration: string
  reference: string
}) {
  return (
    <div className="space-y-3" suppressHydrationWarning>
      <div className="flex items-center justify-between text-sm font-bold">
        <span className="text-foreground">Total Sent</span>
        <span className="text-emerald-500">{amount}</span>
      </div>
      <div className="grid grid-cols-2 gap-4 pb-1">
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">Settlement Time</label>
          <div className="text-xs font-medium">{duration}</div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">Reference ID</label>
          <div className="text-xs font-mono">{reference}</div>
        </div>
      </div>
      <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20">
        Download Receipt
      </Button>
    </div>
  )
}
