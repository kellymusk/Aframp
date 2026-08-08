'use client'

import { useState } from 'react'
import { Copy, Share2, Check, Gift, MousePointerClick, Users, Coins } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useReferral, REFERRAL_DISCOUNT_PCT } from '@/hooks/use-referral'
import { toast } from 'sonner'

interface ReferralCardProps {
  walletAddress: string
}

export function ReferralCard({ walletAddress }: ReferralCardProps) {
  const { myCode, record, stats, appliedCode, discountActive, applyCode, loading } =
    useReferral(walletAddress)
  const [codeInput, setCodeInput] = useState('')
  const [applying, setApplying] = useState(false)
  const [copied, setCopied] = useState(false)

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/referral/${myCode}`
      : ''

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl || myCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
    toast.success('Referral link copied!')
  }

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: 'Join Aframp', text: `Use my code ${myCode} for ${REFERRAL_DISCOUNT_PCT}% off your first ramp!`, url: shareUrl })
    } else {
      handleCopy()
    }
  }

  const handleApply = async () => {
    setApplying(true)
    const err = await applyCode(codeInput)
    setApplying(false)
    if (err) {
      toast.error(err)
    } else {
      toast.success(`Code applied! You get ${REFERRAL_DISCOUNT_PCT}% off your first ramp.`)
      setCodeInput('')
    }
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Gift className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Refer & Earn</h3>
          <p className="text-xs text-muted-foreground">
            Share your code — your friend gets {REFERRAL_DISCOUNT_PCT}% off their first ramp
          </p>
        </div>
      </div>

      {/* Your code */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your referral code</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 px-4 py-3 rounded-xl bg-muted font-mono text-sm font-semibold text-foreground select-all">
            {myCode || '—'}
          </div>
          <Button size="icon" variant="outline" onClick={handleCopy} disabled={!myCode} aria-label="Copy referral code">
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </Button>
          <Button size="icon" variant="outline" onClick={handleShare} disabled={!myCode} aria-label="Share referral link">
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Analytics Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-muted/40 p-3 text-center">
          <MousePointerClick className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
          <p className="text-lg font-bold text-foreground">{stats?.clickCount ?? 0}</p>
          <p className="text-[10px] text-muted-foreground">Link clicks</p>
        </div>
        <div className="rounded-xl bg-muted/40 p-3 text-center">
          <Users className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
          <p className="text-lg font-bold text-foreground">{stats?.conversionCount ?? 0}</p>
          <p className="text-[10px] text-muted-foreground">Conversions</p>
        </div>
        <div className="rounded-xl bg-muted/40 p-3 text-center">
          <Coins className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
          <p className="text-lg font-bold text-primary">
            {stats && stats.totalRebatesEarned > 0
              ? `₦${stats.totalRebatesEarned.toLocaleString()}`
              : '—'}
          </p>
          <p className="text-[10px] text-muted-foreground">Rebates earned</p>
        </div>
      </div>

      {/* Legacy stats (referees count from original record) */}
      {record && record.referees.length > 0 && (
        <div className="text-xs text-muted-foreground text-center">
          {record.referees.length} friend{record.referees.length !== 1 ? 's' : ''} applied your code
        </div>
      )}

      {/* Apply a code */}
      <div className="space-y-2 border-t border-border pt-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {discountActive ? '✅ Referral discount active' : 'Have a referral code?'}
        </p>
        {discountActive ? (
          <p className="text-sm text-green-600 dark:text-green-400">
            {REFERRAL_DISCOUNT_PCT}% off your first ramp fees is applied with code <span className="font-mono font-semibold">{appliedCode}</span>.
          </p>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="AFR-XXXX-0000"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button
              onClick={handleApply}
              disabled={!codeInput || applying || loading}
              size="sm"
            >
              {applying ? 'Applying…' : 'Apply'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
