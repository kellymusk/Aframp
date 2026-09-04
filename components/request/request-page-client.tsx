'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Copy,
  Check,
  Camera,
  AlertCircle,
} from 'lucide-react'
import QRCode from 'react-qr-code'
import { Button } from '@/components/ui/button'
import { QRScanner } from '@/components/send/qr-scanner'
import { cn } from '@/lib/utils'

interface RequestPageClientProps {
  requestId: string
}

// Mock payment request data — in production, fetch from API
const MOCK_REQUEST = {
  id: '123456',
  amount: 100,
  currency: 'USD',
  asset: 'USDC',
  description: 'Payment for consulting services',
  requesterName: 'John Doe',
  requesterWallet: 'GBSN2ZJBRFWTQHWRJQE4GKDJJDSGPVTLQNQCQX7QR5W5VKHNHQH',
  createdAt: new Date(Date.now() - 3600000),
  expiresAt: new Date(Date.now() + 86400000),
}

export function RequestPageClient({ requestId }: RequestPageClientProps) {
  const router = useRouter()
  const [scannerOpen, setScannerOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [scannedAddress, setScannedAddress] = useState<string | null>(null)

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleCopyWallet = async () => {
    await navigator.clipboard.writeText(MOCK_REQUEST.requesterWallet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleScanPayment = (address: string) => {
    // In production, verify the scanned address and process payment
    setScannedAddress(address)
    setScannerOpen(false)
    // TODO: Submit payment confirmation to backend
  }

  const qrValue = `stellar:${MOCK_REQUEST.requesterWallet}?amount=${MOCK_REQUEST.amount}&memo=${requestId}`

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
          <h1 className="text-base font-semibold tracking-tight">Payment Request</h1>
        </header>

        <div className="flex flex-col flex-1 px-5 pb-8 gap-5">
          {/* ── Payment amount card ── */}
          <div className="rounded-2xl border border-border/60 bg-card p-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">
              Amount requested
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">
                {MOCK_REQUEST.amount}
              </span>
              <span className="text-lg text-muted-foreground">
                {MOCK_REQUEST.currency}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              on Stellar network via {MOCK_REQUEST.asset}
            </p>
          </div>

          {/* ── Request details ── */}
          <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
                Requested by
              </p>
              <p className="text-sm font-semibold text-foreground">
                {MOCK_REQUEST.requesterName}
              </p>
            </div>
            {MOCK_REQUEST.description && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
                  Description
                </p>
                <p className="text-sm text-foreground">
                  {MOCK_REQUEST.description}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
                Expires
              </p>
              <p className="text-sm text-foreground">
                {MOCK_REQUEST.expiresAt.toLocaleString()}
              </p>
            </div>
          </div>

          {/* ── QR Code card ── */}
          <div className="flex flex-col items-center gap-5 p-6 rounded-2xl border border-border/60 bg-card">
            <div className="p-4 bg-white rounded-2xl shadow-sm">
              <QRCode
                value={qrValue}
                size={200}
                style={{ display: 'block' }}
                viewBox="0 0 256 256"
              />
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Scan with {MOCK_REQUEST.asset} wallet to pay this request
            </p>
          </div>

          {/* ── Wallet address ── */}
          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
            <div className="px-4 pt-4 pb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">
                Payment address
              </p>
              <p className="font-mono text-xs break-all leading-relaxed text-foreground">
                {MOCK_REQUEST.requesterWallet}
              </p>
            </div>
            <div className="px-4 pb-4 flex gap-2 mt-2">
              <Button
                onClick={handleCopyWallet}
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
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* ── Mobile camera button ── */}
          {isMobile && (
            <Button
              onClick={() => setScannerOpen(true)}
              className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl flex gap-2"
            >
              <Camera className="w-5 h-5" />
              Pay with camera
            </Button>
          )}

          {/* ── Scanned address confirmation ── */}
          {scannedAddress && (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-700">Payment detected</p>
                <p className="text-xs text-emerald-600 mt-1">
                  From: {scannedAddress.slice(0, 10)}...{scannedAddress.slice(-10)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── QR Scanner Modal ── */}
      {scannerOpen && (
        <QRScanner
          onScan={handleScanPayment}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </div>
  )
}
