'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, Landmark, ShieldCheck, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BankAccount } from '@/lib/offramp/bank-service'
import { BankAccountForm } from '@/components/offramp/bank-account-form'
import { KYCSignature } from '@/components/offramp/kyc-signature'
import { SavedAccounts } from '@/components/offramp/saved-accounts'
import { MOCK_ORDER } from '@/lib/offramp/mock-api'
import { useRouter } from 'next/navigation'

export function OfframpBankDetailsClient() {
  const [step, setStep] = React.useState<'select' | 'verify' | 'sign'>('select')
  const [selectedAccount, setSelectedAccount] = React.useState<BankAccount | null>(null)
  const router = useRouter()

  const handleAccountSelect = (account: BankAccount) => {
    setSelectedAccount(account)
    setStep('sign')
  }

  const handleVerified = (account: BankAccount) => {
    setSelectedAccount(account)
    setStep('sign')
  }

  const handleSigned = (_signature: string) => {
    // In a real app, we would store this signature with the order
    router.push('/offramp/review')
  }

  return (
    <div className="min-h-screen bg-[#050505] text-foreground font-sans selection:bg-primary/30">
      <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
        {/* Header Section */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-white/5 text-muted-foreground hover:text-foreground"
          >
            <Link href="/offramp">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Bank Details</h1>
            <p className="text-sm text-muted-foreground font-medium">Step 2 of 4: Verification</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-white/5 rounded-full mb-10 overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out shadow-[0_0_12px_rgba(16,185,129,0.5)]"
            style={{ width: step === 'sign' ? '75%' : '50%' }}
          />
        </div>

        <div className="bg-[#0A0A0A] rounded-[2.5rem] border border-white/[0.05] p-6 md:p-8 shadow-2xl relative overflow-hidden group">
          {/* Subtle Background Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-primary/5 blur-[100px] pointer-events-none" />

          {step === 'select' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-2">
                  <Landmark className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-xl font-bold">Select Bank Account</h2>
                <p className="text-sm text-muted-foreground max-w-[280px] mx-auto leading-relaxed">
                  Choose a previously used account or add a new one for your settlement.
                </p>
              </div>

              <div className="space-y-8">
                <SavedAccounts onSelect={handleAccountSelect} onAddNew={() => setStep('verify')} />

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-white/[0.05]" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
                    <span className="bg-[#0A0A0A] px-4 text-muted-foreground/50">OR</span>
                  </div>
                </div>

                <Button
                  onClick={() => setStep('verify')}
                  variant="outline"
                  className="w-full h-14 rounded-2xl border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 text-foreground font-semibold group transition-all"
                >
                  <PlusIcon className="h-5 w-5 mr-2 text-primary group-hover:scale-110 transition-transform" />
                  Add New Bank Account
                  <ChevronRight className="ml-auto h-4 w-4 opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </Button>
              </div>
            </div>
          )}

          {step === 'verify' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-2">
                  <Landmark className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-xl font-bold">New Bank Account</h2>
                <p className="text-sm text-muted-foreground">
                  Enter your Nigerian bank account details.
                </p>
              </div>

              <BankAccountForm onVerified={handleVerified} />

              <Button
                variant="ghost"
                onClick={() => setStep('select')}
                className="w-full h-12 rounded-xl text-muted-foreground hover:text-foreground"
              >
                Back to saved accounts
              </Button>
            </div>
          )}

          {step === 'sign' && selectedAccount && (
            <KYCSignature
              account={selectedAccount}
              amount={MOCK_ORDER.fiatAmount}
              onSigned={handleSigned}
              onBack={() => setStep('verify')}
            />
          )}
        </div>

        {/* Security Badge Footer */}
        <div className="mt-12 flex flex-col items-center gap-6">
          <div className="flex items-center gap-8 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://nigerianbanks.xyz/logo/paystack.png"
              className="h-5 object-contain"
              alt="Paystack"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://nigerianbanks.xyz/logo/flutterwave.png"
              className="h-5 object-contain"
              alt="Flutterwave"
            />
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 text-[11px] font-bold text-primary/80 uppercase tracking-widest">
            <ShieldCheck className="h-3.5 w-3.5" />
            Military-Grade Encryption (AES-256)
          </div>
        </div>
      </div>
    </div>
  )
}

function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  )
}
