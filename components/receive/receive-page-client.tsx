'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Check,
  Copy,
  Link2,
  MessageCircle,
  Share2,
  Twitter,
} from 'lucide-react'
import QRCode from 'react-qr-code'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { buildTransferQrUrl, type TransferNetwork } from '@/lib/transfer-qr'

interface Asset {
  symbol: string
  name: string
  color: string
  bgColor: string
  icon: string
}

interface ReceivePageClientProps {
  walletAddress?: string
  initialParams?: {
    amount?: string
    asset?: string
    network?: string
    recipient?: string
    address?: string
  }
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

const NETWORKS: Array<{ value: TransferNetwork; label: string; description: string }> = [
  { value: 'PUBLIC', label: 'Mainnet', description: 'Live Stellar network' },
  { value: 'TESTNET', label: 'Testnet', description: 'Safe for testing' },
  { value: 'FUTURENET', label: 'Futurenet', description: 'Experimental network' },
]

// Mock wallet address — in production, pull from wallet context
const WALLET_ADDRESS = 'GBSN2ZJBRFWTQHWRJQE4GKDJJDSGPVTLQNQCQX7QR5W5VKHNHQH'

export function ReceivePageClient({
  walletAddress = WALLET_ADDRESS,
  initialParams,
}: ReceivePageClientProps) {
  const router = useRouter()
  const [selectedAsset, setSelectedAsset] = useState<Asset>(() => {
    const assetMatch = ASSETS.find((asset) => asset.symbol === initialParams?.asset)
    return assetMatch ?? ASSETS[0]
  })
  const [selectedNetwork, setSelectedNetwork] = useState<TransferNetwork>(() => {
    if (
      initialParams?.network === 'PUBLIC' ||
      initialParams?.network === 'TESTNET' ||
      initialParams?.network === 'FUTURENET'
    ) {
      return initialParams.network
    }

    return 'PUBLIC'
  })
  const [requestedAmount, setRequestedAmount] = useState(() => initialParams?.amount?.trim() || '10')
  const [copied, setCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

  const paymentUrl = useMemo(() => {
    return buildTransferQrUrl(process.env.NEXT_PUBLIC_API_URL, {
      recipient: walletAddress,
      amount: requestedAmount.trim() || undefined,
      asset: selectedAsset.symbol,
      network: selectedNetwork,
    })
  }, [requestedAmount, selectedAsset.symbol, selectedNetwork, walletAddress])

  const qrValue = paymentUrl

  const handleCopyAddress = async () => {
    await navigator.clipboard.writeText(walletAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(paymentUrl)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Send me crypto on Aframp',
          text: `Send ${selectedAsset.symbol} to my Aframp wallet`,
          url: paymentUrl,
        })
        return
      } catch {
        // fall back to the share sheet below
      }
    }

    setShareOpen(true)
  }

  const handleShareTwitter = () => {
    const text = encodeURIComponent(`Send me ${selectedAsset.symbol} on Aframp!\n${paymentUrl}`)
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank')
  }

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(`Send me ${selectedAsset.symbol} on Aframp!\n${paymentUrl}`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center">
      <div className="relative flex min-h-screen w-full max-w-md flex-col">
        <header className="flex items-center gap-3 px-5 pt-6 pb-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-semibold tracking-tight">Receive</h1>
            <p className="text-xs text-muted-foreground">Share a QR or payment link</p>
          </div>

          <button onClick={handleShare} className="ml-auto rounded-full p-2 hover:bg-muted transition-colors">
            <Share2 className="h-5 w-5" />
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-5 px-5 pb-8">
          <div className="grid gap-3 rounded-2xl border border-border/60 bg-card p-4">
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={selectedAsset.symbol}
                onValueChange={(value) =>
                  setSelectedAsset(ASSETS.find((asset) => asset.symbol === value) ?? ASSETS[0])
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Asset" />
                </SelectTrigger>
                <SelectContent>
                  {ASSETS.map((asset) => (
                    <SelectItem key={asset.symbol} value={asset.symbol}>
                      {asset.symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedNetwork}
                onValueChange={(value) => setSelectedNetwork(value as TransferNetwork)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Network" />
                </SelectTrigger>
                <SelectContent>
                  {NETWORKS.map((network) => (
                    <SelectItem key={network.value} value={network.value}>
                      {network.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Requested amount
              </label>
              <Input
                value={requestedAmount}
                onChange={(event) => setRequestedAmount(event.target.value)}
                inputMode="decimal"
                placeholder="10"
                className="h-11 font-medium"
              />
            </div>
          </div>

          <div
            className={cn(
              'flex flex-col items-center gap-5 rounded-2xl border border-border/60 bg-card p-6',
              selectedAsset.bgColor
            )}
          >
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <QRCode value={qrValue} size={196} style={{ display: 'block' }} viewBox="0 0 256 256" />
            </div>

            <div className="text-center">
              <div
                className={cn(
                  'mx-auto mb-2 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold',
                  selectedAsset.bgColor,
                  selectedAsset.color
                )}
              >
                <span>{selectedAsset.icon}</span>
                <span>
                  {selectedAsset.name} on{' '}
                  {NETWORKS.find((network) => network.value === selectedNetwork)?.label}
                </span>
              </div>
              <p className="text-sm font-medium text-foreground">
                QR includes address, amount, asset, and network
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Scan it in Aframp Send to auto-fill the recipient and amount.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
            <div className="px-4 pt-4 pb-2">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Wallet address
              </p>
              <p className="break-all font-mono text-sm leading-relaxed text-foreground">
                {walletAddress}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 px-4 pb-4 pt-3">
              <Button
                onClick={handleCopyAddress}
                variant="outline"
                size="sm"
                className={cn(
                  'h-9 gap-2',
                  copied && 'border-emerald-500/40 text-emerald-600 bg-emerald-500/5'
                )}
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy address
                  </>
                )}
              </Button>

              <Button
                onClick={handleCopyLink}
                variant="outline"
                size="sm"
                className={cn(
                  'h-9 gap-2',
                  linkCopied && 'border-emerald-500/40 text-emerald-600 bg-emerald-500/5'
                )}
              >
                {linkCopied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Link2 className="h-3.5 w-3.5" />
                    Copy link
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <ShareAction label="WhatsApp" onClick={handleShareWhatsApp} icon={MessageCircle} />
            <ShareAction label="Twitter" onClick={handleShareTwitter} icon={Twitter} />
            <ShareAction label="More" onClick={handleShare} icon={Share2} />
          </div>
        </div>
      </div>

      {shareOpen && (
        <ShareSheet
          shareUrl={paymentUrl}
          asset={selectedAsset}
          networkLabel={NETWORKS.find((network) => network.value === selectedNetwork)?.label ?? 'Mainnet'}
          amount={requestedAmount}
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

function ShareAction({
  label,
  icon: Icon,
  onClick,
}: {
  label: string
  icon: typeof Share2
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-2xl border border-border/50 bg-muted/40 py-3.5 transition-all hover:border-border hover:bg-muted/70 active:scale-95"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-background shadow-sm">
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-xs font-medium">{label}</span>
    </button>
  )
}

interface ShareSheetProps {
  shareUrl: string
  asset: Asset
  networkLabel: string
  amount: string
  onCopyLink: () => void
  onTwitter: () => void
  onWhatsApp: () => void
  onClose: () => void
  linkCopied: boolean
}

function ShareSheet({
  shareUrl,
  asset,
  networkLabel,
  amount,
  onCopyLink,
  onTwitter,
  onWhatsApp,
  onClose,
  linkCopied,
}: ShareSheetProps) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center">
        <div className="w-full max-w-md rounded-t-3xl border border-border/60 border-b-0 bg-background px-5 pb-10 pt-5 shadow-2xl">
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-muted-foreground/20" />

          <h3 className="mb-1 text-base font-semibold">Share payment link</h3>
          <p className="mb-5 text-sm text-muted-foreground">
            Let others send {asset.symbol} on {networkLabel}. Request amount: {amount || 'Any'}.
          </p>

          <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-border/50 bg-muted/40 p-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Payment link</p>
              <p className="truncate font-mono text-sm">{shareUrl}</p>
            </div>
            <button
              onClick={onCopyLink}
              className="shrink-0 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted/50"
            >
              {linkCopied ? 'Copied!' : 'Copy'}
            </button>
          </div>

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
                    'flex flex-col items-center gap-2 rounded-2xl border py-4 transition-all active:scale-95',
                    item.bg
                  )}
                >
                  <Icon className={cn('h-5 w-5', item.color)} />
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              )
            })}
          </div>

          <button
            onClick={onClose}
            className="mt-4 w-full rounded-xl py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  )
}
