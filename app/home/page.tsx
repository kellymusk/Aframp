import { OnboardingChecklist } from '@/components/onboarding/onboarding-checklist'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.12),rgba(2,6,23,1)_32%,#020817_100%)] px-4 py-12 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-emerald-400">
            Home
          </p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
            Welcome back to Aframp
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
            Set up your wallet and start accepting payments with a few quick steps.
          </p>
        </header>

        <OnboardingChecklist />
      </div>
    </main>
  )
}
