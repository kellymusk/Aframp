import Link from 'next/link'
import { ArrowLeft, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function WalletSetupPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-between bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.16),rgba(3,14,9,0.98)_35%,#010805_75%)] px-6 py-8 text-emerald-50">
      <header className="flex items-center">
        <Button
          asChild
          variant="ghost"
          size="icon-sm"
          className="rounded-full text-emerald-100 hover:bg-emerald-500/10 hover:text-emerald-50"
        >
          <Link href="/feature-highlights" aria-label="Back to feature highlights">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
      </header>

      <section className="space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/12 px-3 py-1 text-xs font-medium text-emerald-200">
          <Shield className="h-4 w-4" />
          Wallet Setup
        </div>
        <h1 className="text-3xl font-semibold leading-tight">
          Secure your wallet in 3 quick steps
        </h1>
        <p className="text-sm leading-7 text-emerald-100/75">
          Your feature highlights are complete. Next, we will generate and verify your recovery
          phrase so your funds stay protected.
        </p>
      </section>

      <div className="space-y-3">
        <Button
          asChild
          className="h-12 w-full rounded-xl bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
        >
          <Link href="/dashboard">Continue</Link>
        </Button>
      </div>
    </main>
  )
}
