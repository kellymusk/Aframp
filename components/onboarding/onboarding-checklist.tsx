'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, CheckCircle2, Circle } from 'lucide-react'
import { walletSession } from '@/lib/wallet/session'

type StepKey = 'wallet' | 'charge' | 'payment' | 'cashout'

interface ChecklistState {
  wallet: boolean
  charge: boolean
  payment: boolean
  cashout: boolean
}

const STORAGE_KEY = 'aframp-merchant-checklist'

const defaultChecklist: ChecklistState = {
  wallet: false,
  charge: false,
  payment: false,
  cashout: false,
}

const stepConfig = [
  { key: 'wallet' as const, label: 'Create wallet', href: '/wallet-setup' },
  { key: 'charge' as const, label: 'Create first charge', href: '/bills' },
  { key: 'payment' as const, label: 'Receive first payment', href: '/receive' },
  { key: 'cashout' as const, label: 'Cash out', href: '/offramp' },
]

function readChecklist(): ChecklistState {
  if (typeof window === 'undefined') {
    return defaultChecklist
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return defaultChecklist

    const parsed = JSON.parse(stored) as Partial<ChecklistState>
    return { ...defaultChecklist, ...parsed }
  } catch {
    return defaultChecklist
  }
}

export function OnboardingChecklist() {
  const [checklist, setChecklist] = useState<ChecklistState>(defaultChecklist)
  const [hasWallet, setHasWallet] = useState(false)

  useEffect(() => {
    const nextChecklist = readChecklist()
    const walletAddress = walletSession.getAddress() || window.localStorage.getItem('walletAddress') || ''

    setChecklist(nextChecklist)
    setHasWallet(Boolean(walletAddress))
  }, [])

  const allComplete = Object.values(checklist).every(Boolean)

  if (hasWallet || allComplete) {
    return null
  }

  const markStepComplete = (key: StepKey) => {
    const next = { ...checklist, [key]: true }
    setChecklist(next)

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    }
  }

  return (
    <section className="w-full max-w-2xl rounded-2xl border border-emerald-500/20 bg-card p-5 shadow-sm md:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400">
            Getting started
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-foreground">
            Get started with your first Aframp wallet
          </h2>
        </div>
      </div>

      <div className="space-y-3">
        {stepConfig.map((step, index) => {
          const completed = checklist[step.key]

          return (
            <Link
              key={step.key}
              href={step.href}
              onClick={() => markStepComplete(step.key)}
              className="group flex items-center gap-3 rounded-xl border border-border bg-background/70 p-3 text-left transition hover:border-emerald-500/50 hover:bg-emerald-500/5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-sm font-semibold text-emerald-300">
                {completed ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-base font-medium text-foreground">{step.label}</span>
                  {completed ? (
                    <span className="text-xs font-medium text-emerald-400">Done</span>
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {completed ? 'Completed' : 'Continue this step'}
                </p>
              </div>

              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-emerald-300" />
            </Link>
          )
        })}
      </div>
    </section>
  )
}
