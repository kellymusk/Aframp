'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Copy, Download, Mail, PhoneCall, RefreshCw, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/onramp/formatters'
import type { FiatCurrency } from '@/types/onramp'
import { generateReceiptPDF } from '@/lib/offramp/pdf-generator'
import { exportReceiptPNG, exportReceiptCSV } from '@/lib/bills/export'
import { useBillsTransaction } from '@/hooks/use-bills-transaction'
import { toast } from 'sonner'

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-success/15 text-success',
  pending: 'bg-warning/15 text-warning',
  failed: 'bg-destructive/15 text-destructive',
}

interface BillsReceiptClientProps {
  transactionId: string
}

export function BillsReceiptClient({ transactionId }: BillsReceiptClientProps) {
  const searchParams = useSearchParams()
  const statusOverride = searchParams.get('status')
  const { transaction, loading, error, statusLabel } = useBillsTransaction(
    transactionId,
    process.env.NEXT_PUBLIC_BILLS_WS_URL,
    statusOverride
  )
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState<null | 'pdf' | 'png' | 'csv'>(null)

  const shareUrl = useMemo(() => (typeof window !== 'undefined' ? window.location.href : ''), [])

  const handleCopy = async () => {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handlePDF = () => {
    if (!transaction) return
    setBusy('pdf')
    try {
      const ok = generateReceiptPDF(
        {
          title: 'Aframp Bills Receipt',
          reference: transaction.reference,
          subtitle: new Date(transaction.createdAt).toLocaleString(),
          sections: [
            {
              title: 'Transaction Details',
              rows: [
                ['Biller', transaction.biller],
                ['Category', transaction.billerCategory],
                ['Account', transaction.accountLabel],
                ['Payment Method', transaction.paymentMethod],
              ].map(([label, value]) => ({ label, value })),
            },
            {
              title: 'Amounts',
              rows: [
                [
                  'Amount',
                  formatCurrency(transaction.amount, transaction.currency as FiatCurrency),
                ],
                ['Fees', formatCurrency(transaction.fee, transaction.currency as FiatCurrency)],
                [
                  'Net Received',
                  formatCurrency(
                    transaction.amount - transaction.fee,
                    transaction.currency as FiatCurrency
                  ),
                ],
              ].map(([label, value]) => ({ label, value })),
            },
            {
              title: 'Status',
              rows: [
                ['Status', statusLabel],
                ['Reference', transaction.reference],
              ].map(([label, value]) => ({ label, value })),
            },
          ],
          totalLabel: 'Total Paid',
          totalValue: formatCurrency(transaction.amount, transaction.currency as FiatCurrency),
        },
        `Aframp-Receipt-${transaction.reference}.pdf`
      )
      if (!ok) {
        toast.error('Unable to generate PDF receipt')
      } else {
        toast.success('Receipt downloaded')
      }
    } catch {
      toast.error('Unable to generate PDF receipt')
    } finally {
      setBusy(null)
    }
  }

  const handlePNG = async () => {
    if (!transaction) return
    setBusy('png')
    try {
      await exportReceiptPNG('receipt-card', `Aframp-Receipt-${transaction.reference}.png`)
      toast.success('Receipt image exported')
    } catch {
      toast.error('Unable to export PNG')
    } finally {
      setBusy(null)
    }
  }

  const handleCSV = () => {
    if (!transaction) return
    setBusy('csv')
    try {
      exportReceiptCSV(`Aframp-Receipt-${transaction.reference}.csv`, [
        ['Reference', transaction.reference],
        ['Biller', transaction.biller],
        ['Category', transaction.billerCategory],
        ['Account', transaction.accountLabel],
        ['Amount', formatCurrency(transaction.amount, transaction.currency as FiatCurrency)],
        ['Fees', formatCurrency(transaction.fee, transaction.currency as FiatCurrency)],
        ['Status', transaction.status],
        ['Date', new Date(transaction.createdAt).toLocaleString()],
      ])
      toast.success('Receipt CSV exported')
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading receipt...</div>
      </div>
    )
  }

  if (error || !transaction) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-3xl border border-border bg-card p-6 text-center">
          <h1 className="text-xl font-semibold">Receipt unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {error || 'Unable to load this transaction.'}
          </p>
          <Button className="mt-4" asChild>
            <Link href="/bills">Back to Bills</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Bills Receipt</p>
            <h1 className="text-2xl font-semibold text-foreground">Payment receipt</h1>
            <p className="text-sm text-muted-foreground">Transaction ID: {transaction.id}</p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[transaction.status]}`}
          >
            {statusLabel}
          </span>
        </header>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <div
              id="receipt-card"
              className="rounded-3xl border border-border bg-card p-6 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-base">A</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Aframp Receipt</p>
                    <p className="text-xs text-muted-foreground">{transaction.billerCategory}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Reference</p>
                  <p className="text-sm font-mono text-foreground">{transaction.reference}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Biller</p>
                  <p className="text-sm font-medium text-foreground">{transaction.biller}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Account</p>
                  <p className="text-sm font-medium text-foreground">{transaction.accountLabel}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="text-lg font-semibold text-foreground">
                    {formatCurrency(transaction.amount, transaction.currency as FiatCurrency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fees</p>
                  <p className="text-sm font-medium text-foreground">
                    {formatCurrency(transaction.fee, transaction.currency as FiatCurrency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Paid with</p>
                  <p className="text-sm font-medium text-foreground">{transaction.paymentMethod}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="text-sm font-medium text-foreground">
                    {new Date(transaction.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-border bg-muted/20 px-4 py-3">
                <p className="text-xs text-muted-foreground">You received</p>
                <p className="text-xl font-semibold text-foreground">
                  {formatCurrency(
                    transaction.amount - transaction.fee,
                    transaction.currency as FiatCurrency
                  )}
                </p>
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-semibold text-foreground">Processing timeline</h3>
                <div className="mt-3 space-y-3">
                  {transaction.timeline.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-xs"
                    >
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className={STATUS_STYLES[item.status]}>{item.timestamp || ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-muted/20 p-6">
              <h3 className="text-sm font-semibold text-foreground">Related actions</h3>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Button asChild variant="outline" className="rounded-full">
                  <Link href={`/bills/pay?biller=${encodeURIComponent(transaction.biller)}`}>
                    Repeat Payment
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="rounded-full">
                  <Link href={`/bills/schedule?biller=${encodeURIComponent(transaction.biller)}`}>
                    Schedule Similar
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-border bg-card p-6">
              <h3 className="text-sm font-semibold text-foreground">Download & Export</h3>
              <div className="mt-4 space-y-3">
                <Button className="w-full" onClick={handlePDF} disabled={busy === 'pdf'}>
                  <Download className="h-4 w-4" />{' '}
                  {busy === 'pdf' ? 'Generating PDF...' : 'Download PDF'}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handlePNG}
                  disabled={busy === 'png'}
                >
                  {busy === 'png' ? 'Exporting PNG...' : 'Export PNG'}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleCSV}
                  disabled={busy === 'csv'}
                >
                  {busy === 'csv' ? 'Exporting CSV...' : 'Export CSV'}
                </Button>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6">
              <h3 className="text-sm font-semibold text-foreground">Share receipt</h3>
              <div className="mt-4 space-y-3">
                <Button className="w-full" asChild>
                  <a href={`mailto:?subject=Aframp Receipt&body=${encodeURIComponent(shareUrl)}`}>
                    <Mail className="h-4 w-4" /> Share via Email
                  </a>
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(shareUrl)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Share2 className="h-4 w-4" /> Share on WhatsApp
                  </a>
                </Button>
                <Button variant="ghost" className="w-full" onClick={handleCopy}>
                  <Copy className="h-4 w-4" /> {copied ? 'Link copied' : 'Copy link'}
                </Button>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-muted/20 p-6">
              <h3 className="text-sm font-semibold text-foreground">Need help?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                If your transaction failed or needs review, contact support and we’ll help quickly.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <Button variant="outline" className="w-full" asChild>
                  <a href={`mailto:${transaction.customerSupportEmail}`}>
                    <Mail className="h-4 w-4" /> Email Support
                  </a>
                </Button>
                <Button variant="ghost" className="w-full" asChild>
                  <a href="tel:+2348000000000">
                    <PhoneCall className="h-4 w-4" /> Call Support
                  </a>
                </Button>
              </div>
            </div>

            {transaction.status === 'failed' ? (
              <div className="rounded-3xl border border-destructive/20 bg-destructive/10 p-6 text-sm text-destructive">
                <p className="font-semibold">Payment failed</p>
                <p className="mt-2">
                  We couldn’t complete this payment. Please retry or contact support.
                </p>
                <Button variant="outline" className="mt-4 w-full" asChild>
                  <Link href="/bills">Retry payment</Link>
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className="h-3 w-3" /> Status updates every 5 seconds.
        </div>
      </div>
    </div>
  )
}
