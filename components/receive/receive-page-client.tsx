'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Copy,
  Check,
  Share2,
  Download,
  Link2,
  MessageCircle,
  Twitter,
  ChevronDown,
} from 'lucide-react'
import QRCode from 'react-qr-code'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Asset {
  symbol: string
  name: string
  color: string
  bgColor: string
  icon: string
}

const ASSETS: Asset[] = [
  {
    symbol: 'XLM',
    name: 'Stellar Lumens',
    color: 'text-sky-500',
    bgColor: 'bg-sky-500/10 border-sky-500/30',
    icon: '✦',
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10 border-blue-500/30',
    icon: '$',
  },
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10 border-amber-500/30',
    icon: '₿',
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10 border-indigo-500/30',
    icon: 'Ξ',
  },
]

// Mock wallet address — in production, pull from wallet context
const WALLET_ADDRESS = 'GBSN2ZJBRFWTQHWRJQE4GKDJJDSGPVTLQNQCQX7QR5W5VKHNHQH'

interface ReceivePageClientProps {
  walletAddress?: string
}

export function ReceivePageClient({ walletAddress = WALLET_ADDRESS }: ReceivePageClientProps) {
  const router = useRouter()
  const [selectedAsset, setSelectedAsset] = useState<Asset>(ASSETS[0])
  const [assetDropdownOpen, setAssetDropdownOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const qrValue = `${selectedAsset.symbol.toLowerCase()}:${walletAddress}`
  const shareUrl = `https://aframp.io/pay/${walletAddress}`

  const handleCopyAddress = async () => {
    await navigator.clipboard.writeText(walletAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareUrl)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Send me crypto on Aframp',
          text: `Send ${selectedAsset.symbol} to my Aframp wallet`,
          url: shareUrl,
        })
        return
      } catch {
        // fall through to sheet
      }
    }
    setShareOpen(true)
  }

  const handleShareTwitter = () => {
    const text = encodeURIComponent(`Send me ${selectedAsset.symbol} on Aframp! 🌍\n${shareUrl}`)
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank')
  }

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(`Send me ${selectedAsset.symbol} on Aframp!\n${shareUrl}`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center">
      <div className="w-full max-w-md flex flex-col min-h-screen relative">
        {/* ── Header ── */}
        <header className="flex items-center gap-3 px-5 pt-6 pb-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold tracking-tight">Receive</h1>

          {/* Share trigger */}
          <button
            onClick={handleShare}
            className="ml-auto p-2 rounded-full hover:bg-muted transition-colors"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </header>

        <div className="flex flex-col flex-1 px-5 pb-8 gap-5">
          {/* ── Asset selector ── */}
          <div className="relative">
            <button
              onClick={() => setAssetDropdownOpen((o) => !o)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all',
                selectedAsset.bgColor,
                'hover:opacity-90'
              )}
            >
              <div className={cn('text-xl font-bold w-8 text-center', selectedAsset.color)}>
                {selectedAsset.icon}
              </div>
              <div className="flex-1 text-left">
                <p className={cn('text-sm font-semibold', selectedAsset.color)}>
                  {selectedAsset.symbol}
                </p>
                <p className="text-xs text-muted-foreground">{selectedAsset.name}</p>
              </div>
              <ChevronDown
                className={cn(
                  'w-4 h-4 text-muted-foreground transition-transform',
                  assetDropdownOpen && 'rotate-180'
                )}
              />
            </button>

            {assetDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 rounded-2xl border border-border bg-popover shadow-xl z-20 overflow-hidden">
                {ASSETS.map((asset) => (
                  <button
                    key={asset.symbol}
                    onClick={() => {
                      setSelectedAsset(asset)
                      setAssetDropdownOpen(false)
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors',
                      selectedAsset.symbol === asset.symbol && 'bg-muted/30'
                    )}
                  >
                    <span className={cn('text-lg font-bold w-7 text-center', asset.color)}>
                      {asset.icon}
                    </span>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium">{asset.symbol}</p>
                      <p className="text-xs text-muted-foreground">{asset.name}</p>
                    </div>
                    {selectedAsset.symbol === asset.symbol && (
                      <Check className="w-4 h-4 text-emerald-500" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── QR Code card ── */}
          <div className="flex flex-col items-center gap-5 p-6 rounded-2xl border border-border/60 bg-card">
            {/* QR code */}
            <div className="p-4 bg-white rounded-2xl shadow-sm">
              <QRCode
                value={qrValue}
                size={200}
                style={{ display: 'block' }}
                viewBox="0 0 256 256"
              />
            </div>

            {/* Asset badge */}
            <div
              className={cn(
                'px-4 py-1.5 rounded-full border text-xs font-semibold',
                selectedAsset.bgColor,
                selectedAsset.color
              )}
            >
              {selectedAsset.name} ({selectedAsset.symbol})
            </div>

            {/* Label */}
            <p className="text-xs text-muted-foreground text-center px-4">
              Scan this code to send {selectedAsset.symbol} to this wallet. Only send{' '}
              <span className="font-medium text-foreground">{selectedAsset.symbol}</span> on the{' '}
              <span className="font-medium text-foreground">Stellar</span> network.
            </p>
          </div>

          {/* ── Address display ── */}
          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
            <div className="px-4 pt-4 pb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">
                Wallet address
              </p>
              <p className="font-mono text-sm break-all leading-relaxed text-foreground">
                {walletAddress}
              </p>
            </div>
            <div className="px-4 pb-4 flex gap-2 mt-2">
              <Button
                onClick={handleCopyAddress}
                variant="outline"
                size="sm"
                className={cn(
                  'flex-1 h-9 gap-2 transition-all',
                  copied && 'border-emerald-500/40 text-emerald-600 bg-emerald-500/5'
                )}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy address
                  </>
                )}
              </Button>
              <Button
                onClick={() => {
                  /* TODO: save QR image */
                }}
                variant="outline"
                size="sm"
                className="h-9 gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                Save QR
              </Button>
            </div>
          </div>

          {/* ── Share buttons ── */}
          <ShareButtons
            onCopyLink={handleCopyLink}
            onTwitter={handleShareTwitter}
            onWhatsApp={handleShareWhatsApp}
            onNativeShare={handleShare}
            linkCopied={linkCopied}
          />
        </div>
      </div>

      {/* Share sheet (fallback for non-native share) */}
      {shareOpen && (
        <ShareSheet
          shareUrl={shareUrl}
          asset={selectedAsset}
          onCopyLink={handleCopyLink}
          onTwitter={handleShareTwitter}
          onWhatsApp={handleShareWhatsApp}
          onClose={() => setShareOpen(false)}
          linkCopied={linkCopied}
        />
      )}
    </div>
  )
}

// ── Share buttons row ──────────────────────────────────────────
interface ShareButtonsProps {
  onCopyLink: () => void
  onTwitter: () => void
  onWhatsApp: () => void
  onNativeShare: () => void
  linkCopied: boolean
}

export function ShareButtons({
  onCopyLink,
  onTwitter,
  onWhatsApp,
  onNativeShare,
  linkCopied,
}: ShareButtonsProps) {
  const actions = [
    {
      label: linkCopied ? 'Copied!' : 'Copy link',
      icon: linkCopied ? Check : Link2,
      onClick: onCopyLink,
      accent: linkCopied ? 'text-emerald-500' : 'text-foreground',
    },
    {
      label: 'WhatsApp',
      icon: MessageCircle,
      onClick: onWhatsApp,
      accent: 'text-foreground',
    },
    {
      label: 'Twitter',
      icon: Twitter,
      onClick: onTwitter,
      accent: 'text-foreground',
    },
    {
      label: 'More',
      icon: Share2,
      onClick: onNativeShare,
      accent: 'text-foreground',
    },
  ]

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium px-0.5">
        Share
      </p>
      <div className="grid grid-cols-4 gap-2">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.label}
              onClick={action.onClick}
              className="flex flex-col items-center gap-2 py-3.5 rounded-2xl bg-muted/40 border border-border/50 hover:bg-muted/70 hover:border-border transition-all active:scale-95"
            >
              <div className="w-9 h-9 rounded-full bg-background border border-border/60 flex items-center justify-center shadow-sm">
                <Icon className={cn('w-4 h-4', action.accent)} />
              </div>
              <span className={cn('text-xs font-medium', action.accent)}>{action.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Share sheet modal ──────────────────────────────────────────
interface ShareSheetProps {
  shareUrl: string
  asset: Asset
  onCopyLink: () => void
  onTwitter: () => void
  onWhatsApp: () => void
  onClose: () => void
  linkCopied: boolean
}

function ShareSheet({
  shareUrl,
  asset,
  onCopyLink,
  onTwitter,
  onWhatsApp,
  onClose,
  linkCopied,
}: ShareSheetProps) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center">
        <div className="w-full max-w-md bg-background rounded-t-3xl border border-border/60 border-b-0 px-5 pt-5 pb-10 shadow-2xl">
          {/* Handle */}
          <div className="w-10 h-1 bg-muted-foreground/20 rounded-full mx-auto mb-5" />

          <h3 className="text-base font-semibold mb-1">Share your address</h3>
          <p className="text-sm text-muted-foreground mb-5">
            Let others send {asset.symbol} directly to you
          </p>

          {/* Share link preview */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/50 mb-5">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Your payment link</p>
              <p className="text-sm font-mono truncate">{shareUrl}</p>
            </div>
            <button
              onClick={onCopyLink}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-background border border-border text-sm font-medium hover:bg-muted/50 transition-colors"
            >
              {linkCopied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Channel buttons */}
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: 'WhatsApp',
                onClick: onWhatsApp,
                icon: MessageCircle,
                color: 'text-green-500',
                bg: 'bg-green-500/10 border-green-500/20',
              },
              {
                label: 'Twitter',
                onClick: onTwitter,
                icon: Twitter,
                color: 'text-sky-500',
                bg: 'bg-sky-500/10 border-sky-500/20',
              },
              {
                label: 'Copy link',
                onClick: onCopyLink,
                icon: Link2,
                color: 'text-purple-500',
                bg: 'bg-purple-500/10 border-purple-500/20',
              },
            ].map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className={cn(
                    'flex flex-col items-center gap-2 py-4 rounded-2xl border transition-all active:scale-95',
                    item.bg
                  )}
                >
                  <Icon className={cn('w-5 h-5', item.color)} />
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              )
            })}
          </div>

          <button
            onClick={onClose}
            className="w-full mt-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  )
}
