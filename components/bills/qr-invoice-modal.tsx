'use client'

import { useRef, useState } from 'react'
import QRCode from 'react-qr-code'
import { Copy, Download, Share2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { buildInvoiceUrl, encodeInvoice, type QRInvoiceData } from '@/lib/bills/qr-invoice'
import { formatCurrency } from '@/lib/calculations'
import type { FiatCurrency } from '@/types/onramp'

interface QRInvoiceModalProps {
  invoice: QRInvoiceData
  onClose: () => void
}

export function QRInvoiceModal({ invoice, onClose }: QRInvoiceModalProps) {
  const [copied, setCopied] = useState(false)
  const qrRef = useRef<HTMLDivElement>(null)

  const invoiceUrl = buildInvoiceUrl(invoice.invoiceId)
  const encoded = encodeInvoice(invoice)
  // The QR code encodes the full URL so scanning it opens the payment page directly
  const qrValue = `${invoiceUrl}?data=${encoded}`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(qrValue)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
    toast.success('Invoice link copied')
  }

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return
    const serializer = new XMLSerializer()
    const svgStr = serializer.serializeToString(svg)
    const blob = new Blob([svgStr], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `invoice-${invoice.reference}.svg`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('QR code downloaded')
  }

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: 'Aframp Invoice', url: qrValue })
    } else {
      await handleCopy()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-lg font-semibold text-foreground">Invoice QR Code</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Scan to pay or share this invoice link
        </p>

        <div
          ref={qrRef}
          className="mx-auto mt-5 flex w-fit rounded-2xl border border-border bg-white p-4"
        >
          <QRCode value={qrValue} size={180} />
        </div>

        <div className="mt-5 space-y-1 rounded-2xl border border-border bg-muted/20 px-4 py-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Biller</span>
            <span className="font-medium text-foreground">{invoice.biller}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Account</span>
            <span className="font-medium text-foreground">{invoice.accountLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-semibold text-foreground">
              {formatCurrency(invoice.amount, invoice.currency as FiatCurrency)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Reference</span>
            <span className="font-mono text-xs text-foreground">{invoice.reference}</span>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <Button variant="outline" className="flex-1 rounded-full" onClick={handleCopy}>
            <Copy className="h-4 w-4" />
            {copied ? 'Copied' : 'Copy link'}
          </Button>
          <Button variant="outline" className="flex-1 rounded-full" onClick={handleDownload}>
            <Download className="h-4 w-4" />
            Save QR
          </Button>
          <Button className="flex-1 rounded-full" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>
      </div>
    </div>
  )
}
