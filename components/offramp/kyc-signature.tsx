'use client'

import * as React from 'react'
import { ShieldCheck, Wallet, ChevronRight, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BankAccount, signKycMessage } from '@/lib/offramp/bank-service'
import { toast } from 'sonner'
import { useWallet } from '@/hooks/useWallet'

interface KYCSignatureProps {
  account: BankAccount
  amount: number
  onSigned: (signature: string) => void
  onBack: () => void
}

export function KYCSignature({ account, amount, onSigned, onBack }: KYCSignatureProps) {
  const [isSigning, setIsSigning] = React.useState(false)
  const { publicKey, isConnected } = useWallet()

  const handleSign = async () => {
    setIsSigning(true)
    try {
      if (!isConnected || !publicKey) {
        toast.error('Please connect your Stellar wallet first')
        return
      }

      const signature = await signKycMessage(publicKey, amount, account.accountNumber)
      onSigned(signature)
      toast.success('Message signed successfully')
    } catch {
      toast.error('Signing failed. Please try again.')
    } finally {
      setIsSigning(false)
    }
  }

  const message = `I authorize AFRAMP to send ₦${amount.toLocaleString()} to account ${account.accountNumber}`

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">KYC-Free Verification</h2>
        <p className="text-sm text-muted-foreground leading-relaxed px-4">
          To comply with regulations while keeping your privacy, please sign this message with your
          wallet to prove ownership.
        </p>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-border bg-accent/30 p-4 pt-8">
        <div className="absolute top-0 left-0 right-0 bg-accent/50 px-4 py-1 flex items-center gap-2 border-b border-border">
          <Lock className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
            Signed Message Content
          </span>
        </div>
        <div className="font-mono text-sm leading-relaxed text-foreground/80 wrap-break-word italic">
          &ldquo;{message}&rdquo;
        </div>
      </div>

      <div className="bg-primary/5 rounded-xl border border-primary/20 p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/10">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-muted-foreground uppercase font-semibold">
              Signing Wallet
            </p>
            <p className="text-sm font-mono truncate text-foreground">
              {isConnected && publicKey ? publicKey : 'No wallet connected'}
            </p>
          </div>
          {isConnected && publicKey && (
            <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
          )}
        </div>
      </div>

      <div className="space-y-3 pt-4">
        <Button
          className="w-full h-14 rounded-xl text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all bg-primary text-primary-foreground group"
          onClick={handleSign}
          disabled={isSigning || !isConnected}
        >
          {isSigning ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Signing...
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <span>Continue to Confirmation</span>
              <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          )}
        </Button>
        <Button
          variant="ghost"
          className="w-full h-12 rounded-xl text-muted-foreground hover:text-foreground transition-colors"
          onClick={onBack}
          disabled={isSigning}
        >
          Change Bank Details
        </Button>
      </div>

      <div className="text-center">
        <p className="text-[11px] text-muted-foreground">
          By signing, you agree to our{' '}
          <button className="underline hover:text-foreground">Terms of Service</button>
        </p>
      </div>
    </div>
  )
}
