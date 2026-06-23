'use client'

import { use } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ShieldCheck, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { decodeInvoice } from '@/lib/bills/qr-invoice'
import { formatCurrency } from '@/lib/calculations'
import type { FiatCurrency } from '@/types/onramp'
import { BILLER_SCHEMAS } from '@/lib/biller-schemas'
import { PaymentForm } from '@/components/bills/payment-form'
import { BillerIcon } from '@/components/bills/biller-icons'

interface PageProps {
  params: Promise<{ invoiceId: string }>
}

export default function InvoicePayPage({ params }: PageProps) {
  const { invoiceId } = use(params)
  const searchParams = useSearchParams()
  const encoded = searchParams.get('data')
  const invoice = encoded ? decodeInvoice(encoded) : null

  if (!invoice) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-3xl border border-border bg-card p-6 text-center space-y-4">
          <h1 className="text-xl font-semibold text-foreground">Invoice not found</h1>
          <p className="text-sm text-muted-foreground">
            This invoice link is invalid or has expired. Please request a new one.
          </p>
          <Button asChild>
            <Link href="/bills">Go to Bills</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Try to find a matching biller schema so we can render the full payment form
  const billerKey = Object.keys(BILLER_SCHEMAS).find(
    (k) => BILLER_SCHEMAS[k].name.toLowerCase() === invoice.biller.toLowerCase()
  )
  const schema = billerKey ? BILLER_SCHEMAS[billerKey] : null

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4 max-w-2xl text-center relative">
          <Link
            href="/bills"
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </Link>
          <h1 className="text-lg font-bold">Pay Invoice</h1>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Invoice summary card */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3">
              {schema ? (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <BillerIcon billerId={schema.id} className="h-8 w-8 text-primary" />
                </div>
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <span className="text-2xl">🧾</span>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">{invoice.billerCategory}</p>
                <h2 className="text-lg font-semibold text-foreground">{invoice.biller}</h2>
                <p className="text-xs text-muted-foreground">{invoice.accountLabel}</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl border border-border bg-muted/20 p-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="font-semibold text-foreground">
                  {formatCurrency(invoice.amount, invoice.currency as FiatCurrency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fee</p>
                <p className="font-medium text-foreground">
                  {formatCurrency(invoice.fee, invoice.currency as FiatCurrency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Reference</p>
                <p className="font-mono text-xs text-foreground">{invoice.reference}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Invoice ID</p>
                <p className="font-mono text-xs text-foreground truncate">{invoiceId}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 border-y border-border/50 py-2">
            <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
              Secure Transaction
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <Zap className="h-3.5 w-3.5 text-warning" />
              Instant Confirmation
            </div>
          </div>

          {schema ? (
            <div className="rounded-[2.5rem] border border-border bg-card p-6 shadow-sm sm:p-8">
              <PaymentForm schema={schema} />
            </div>
          ) : (
            /* Fallback when no matching schema — show a simple CTA to the bills page */
            <div className="rounded-3xl border border-border bg-card p-6 text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                We couldn&apos;t find a payment form for <strong>{invoice.biller}</strong>. You can
                browse all billers and complete the payment from there.
              </p>
              <Button asChild className="rounded-full">
                <Link href="/bills">Browse Billers</Link>
              </Button>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  )
}
