'use client'

import * as React from 'react'
import { ShieldCheck, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { BankSelect } from './bank-select'
import {
  Bank,
  verifyAccountNumber,
  checkRateLimit,
  saveAccount,
  BankAccount,
} from '@/lib/offramp/bank-service'
import { toast } from 'sonner'

interface BankAccountFormProps {
  onVerified: (details: BankAccount) => void
}

export function BankAccountForm({ onVerified }: BankAccountFormProps) {
  const [selectedBank, setSelectedBank] = React.useState<Bank | null>(null)
  const [accountNumber, setAccountNumber] = React.useState('')
  const [isVerifying, setIsVerifying] = React.useState(false)
  const [verifiedName, setVerifiedName] = React.useState<string | null>(null)

  const handleVerify = async () => {
    if (!selectedBank || accountNumber.length !== 10) {
      toast.error('Please select a bank and enter a valid 10-digit account number')
      return
    }

    if (!checkRateLimit()) {
      toast.error('Maximum verification attempts reached. Please try again in an hour.')
      return
    }

    setIsVerifying(true)
    try {
      const name = await verifyAccountNumber(selectedBank.code, accountNumber)
      setVerifiedName(name)
      toast.success('Account verified successfully')
    } catch {
      toast.error('Verification failed. Please check the details and try again.')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleConfirm = () => {
    if (selectedBank && verifiedName) {
      const account: Omit<BankAccount, 'id'> = {
        bankName: selectedBank.name,
        bankCode: selectedBank.code,
        accountNumber: accountNumber,
        accountName: verifiedName,
        lastUsed: new Date(),
      }
      const saved = saveAccount(account)
      onVerified(saved)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="bank" className="text-sm font-medium text-foreground ml-1">
            Select Bank
          </Label>
          <BankSelect
            value={selectedBank?.code}
            onSelect={(bank) => {
              setSelectedBank(bank)
              setVerifiedName(null)
            }}
            disabled={isVerifying}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="accountNumber" className="text-sm font-medium text-foreground ml-1">
            Account Number (10 Digits)
          </Label>
          <div className="relative group">
            <Input
              id="accountNumber"
              placeholder="0123456789"
              value={accountNumber}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 10)
                setAccountNumber(val)
                setVerifiedName(null)
              }}
              className="h-14 px-4 bg-background border-border hover:border-primary/50 focus:border-primary rounded-xl transition-all duration-200"
              disabled={isVerifying}
            />
          </div>
        </div>

        {!verifiedName ? (
          <Button
            className="w-full h-14 rounded-xl text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all bg-primary text-primary-foreground"
            onClick={handleVerify}
            disabled={isVerifying || accountNumber.length !== 10 || !selectedBank}
          >
            {isVerifying ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verifying...
              </div>
            ) : (
              'Verify Account'
            )}
          </Button>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <Alert className="bg-primary/5 border-primary/20 rounded-xl py-4">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <AlertTitle className="text-sm font-semibold text-primary">
                Account Verified
              </AlertTitle>
              <AlertDescription className="mt-1">
                <span className="block text-base font-bold text-foreground uppercase tracking-wide">
                  {verifiedName}
                </span>
                <span className="text-xs text-muted-foreground mt-1 block">
                  Is this your account? Please confirm to proceed.
                </span>
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-12 rounded-xl border-border hover:bg-accent/50 text-foreground"
                onClick={() => setVerifiedName(null)}
              >
                No, Re-enter
              </Button>
              <Button
                className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/10"
                onClick={handleConfirm}
              >
                Yes, Continue
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-accent/30 p-3 rounded-lg">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span>Your bank details are encrypted and secure</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
          <div className="flex items-center gap-1">
            <Info className="h-3 w-3" />
            <span>We never store your account passwords</span>
          </div>
          <button className="underline hover:text-foreground">Privacy Policy</button>
        </div>
      </div>
    </div>
  )
}
