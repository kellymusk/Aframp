import Link from 'next/link'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function WelcomePage() {
  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-sm flex-col overflow-hidden bg-[radial-gradient(circle_at_50%_20%,rgba(16,185,129,0.2),rgba(4,14,10,0.98)_35%,#010805_75%)] px-6 pt-10 pb-8 text-emerald-50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.12),transparent_55%)]" />

      <section className="relative flex flex-1 flex-col">
        <div className="mb-5 inline-flex w-fit items-center rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold tracking-wide text-emerald-200">
          FINANCE REDEFINED
        </div>

        <div className="mb-8 flex flex-1 items-center justify-center">
          <div className="relative flex h-64 w-64 items-center justify-center rounded-full border border-emerald-500/35 bg-[radial-gradient(circle,rgba(16,185,129,0.26),rgba(0,0,0,0.25)_45%,transparent_75%)]">
            <div className="absolute inset-6 rounded-full border border-emerald-400/25" />
            <div className="absolute inset-12 rounded-full border border-emerald-400/15" />
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-emerald-300/35 bg-emerald-400/20 shadow-[0_0_28px_rgba(16,185,129,0.7)]">
              <ShieldCheck className="h-10 w-10 text-emerald-200" />
            </div>
          </div>
        </div>

        <h1 className="text-center text-4xl font-bold leading-tight">Aframp</h1>
        <p className="mt-2 text-center text-3xl font-semibold leading-tight text-emerald-100">
          Welcome to the future of finance
        </p>
        <p className="mt-6 text-center text-sm leading-7 text-emerald-100/75">
          Securely manage your digital assets, trade with confidence, and build your wealth with
          Aframp.
        </p>

        <div className="mt-10 space-y-3">
          <Button
            asChild
            className="h-12 w-full rounded-xl bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
          >
            <Link href="/feature-highlights">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-12 w-full rounded-xl border-emerald-500/35 bg-transparent text-emerald-50 hover:bg-emerald-500/10 hover:text-emerald-50"
          >
            <Link href="/dashboard">Log In</Link>
          </Button>
        </div>
      </section>
    </main>
  )
}
