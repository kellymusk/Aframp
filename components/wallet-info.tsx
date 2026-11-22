'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { BadgeCheck, Check, Copy, ExternalLink, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getStellarAccountUrl } from '@/lib/stellar-network'

import { getStellarAccountUrl } from '@/lib/stellar-network'

interface WalletInfoProps {
  walletName: string
  walletAddress: string
  /** True once the address has actually received a payment on-chain. */
  active?: boolean
  loading?: boolean
}

function shortenAddress(address: string) {
  return address.length <= 12 ? address : `${address.slice(0, 6)}…${address.slice(-4)}`
}

export function WalletInfo({
  walletName,
  walletAddress,
  active = false,
  loading = false,
}: WalletInfoProps) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(walletAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="bg-card space-y-3 rounded-2xl border p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <Skeleton className="size-12 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-44" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card space-y-4 rounded-2xl border p-5 shadow-sm"
    >
      <div className="flex items-center gap-4">
        <div className="bg-primary/10 flex size-12 shrink-0 items-center justify-center rounded-xl">
          <Wallet className="text-primary size-6" aria-hidden />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-lg font-semibold">{walletName}</h2>
            {active && (
              <BadgeCheck
                className="text-primary size-5 shrink-0"
                aria-label="Has received payments"
              />
            )}
          </div>
          <div className="mt-1 flex items-center gap-1">
            <span className="font-heading text-muted-foreground text-sm">
              {shortenAddress(walletAddress)}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={copy}
              aria-label={copied ? 'Address copied' : 'Copy address'}
            >
              {copied ? (
                <Check className="text-primary size-4" aria-hidden />
              ) : (
                <Copy className="text-muted-foreground size-4" aria-hidden />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* The original rendered this button with no href, so it did nothing. */}
      <Button asChild variant="outline" size="sm" className="w-full">
        <a href={getStellarAccountUrl(walletAddress)} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="size-4" aria-hidden />
          View on explorer
        </a>
      </Button>
    </motion.div>
  )
}
