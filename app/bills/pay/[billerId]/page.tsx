'use client'

import { use } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, ShieldCheck, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PaymentForm } from '@/components/bills/payment-form'
import { BILLER_SCHEMAS } from '@/lib/biller-schemas'
import Link from 'next/link'
import { BillerIcon } from '@/components/bills/biller-icons'

interface PageProps {
  params: Promise<{ billerId: string }>
}

export default function BillerPaymentPage({ params }: PageProps) {
  const { billerId } = use(params)
  const schema = BILLER_SCHEMAS[billerId]

  if (!schema) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Biller Not Found</h1>
          <p className="text-muted-foreground">
            The biller you are looking for does not exist or is not supported yet.
          </p>
          <Button asChild>
            <Link href="/bills">Back to Bills</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4 max-w-2xl text-center relative">
          <Link
            href="/bills"
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <h1 className="text-lg font-bold font-cal-sans">Pay {schema.name}</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Biller Info */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center shadow-inner">
              <BillerIcon billerId={schema.id} className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{schema.name}</h2>
              <p className="text-muted-foreground text-sm">
                Fill in the details below to complete your payment.
              </p>
            </div>
          </div>

          {/* Secure Payment Badge */}
          <div className="flex items-center justify-center gap-6 py-2 border-y border-border/50">
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-success" />
              <span>Secure Transaction</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5 text-warning" />
              <span>Instant Confirmation</span>
            </div>
          </div>

          {/* Dynamic Form */}
          <div className="bg-card border border-border rounded-[2.5rem] p-6 sm:p-8 shadow-sm">
            <PaymentForm schema={schema} />
          </div>

          {/* Help/Support */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Having issues?{' '}
              <button className="text-primary font-medium hover:underline">Contact Support</button>
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
