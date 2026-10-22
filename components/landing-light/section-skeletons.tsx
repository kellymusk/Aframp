/**
 * Static, CSS-only loading placeholders for the landing page's lazy-loaded,
 * below-the-fold sections. Deliberately not the `framer-motion`-based
 * `components/ui/skeleton.tsx` primitive — that one needs `'use client'` to
 * run its animation, and a `next/dynamic` loading fallback should stay cheap
 * and framework-agnostic. Tailwind's `animate-pulse` needs no JS.
 * Each shape roughly matches its real section's layout to minimize layout
 * shift when the real content swaps in.
 */

export function UseCasesSkeleton() {
  return (
    <section aria-hidden="true" className="bg-white dark:bg-surface px-6 py-24">
      <div className="mx-auto max-w-5xl animate-pulse">
        <div className="mx-auto h-9 w-80 max-w-full rounded bg-black/10 dark:bg-white/10" />
        <div className="mx-auto mt-3 h-4 w-96 max-w-full rounded bg-black/10 dark:bg-white/10" />

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          <div className="h-64 rounded-2xl bg-black/5 md:col-span-2 dark:bg-white/5" />
          <div className="h-64 rounded-2xl bg-black/5 dark:bg-white/5" />
          <div className="h-64 rounded-2xl bg-black/5 dark:bg-white/5" />
          <div className="h-64 rounded-2xl bg-black/5 dark:bg-white/5" />
        </div>

        <div className="mx-auto mt-16 h-12 w-44 rounded-full bg-black/10 dark:bg-white/10" />
      </div>
    </section>
  )
}

export function FaqSkeleton() {
  return (
    <section aria-hidden="true" className="bg-mint dark:bg-band px-6 py-20">
      <div className="mx-auto max-w-3xl animate-pulse">
        <div className="mx-auto h-9 w-72 max-w-full rounded bg-black/10 dark:bg-white/10" />

        <div className="mt-12 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-black/10 dark:bg-white/10" />
          ))}
        </div>
      </div>
    </section>
  )
}

export function SiteFooterSkeleton() {
  return (
    <footer aria-hidden="true" className="bg-lavender dark:bg-band px-6 py-16">
      <div className="mx-auto max-w-5xl animate-pulse">
        <div className="grid gap-10 sm:grid-cols-3">
          <div className="h-28 rounded bg-black/10 dark:bg-white/10" />
          <div className="h-28 rounded bg-black/10 dark:bg-white/10" />
          <div className="h-28 rounded bg-black/10 dark:bg-white/10" />
        </div>
        <div className="mx-auto mt-12 h-4 w-40 rounded bg-black/10 dark:bg-white/10" />
      </div>
    </footer>
  )
}
