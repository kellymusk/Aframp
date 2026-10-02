'use client'

import Link from 'next/link'

import { AframpMark } from '@/components/brand/aframp-mark'
import { ThemeToggle } from '@/components/theme-toggle'
import { useSession } from '@/components/session-provider'
import { nav } from '@/lib/landing-light-data'

export function SiteNav() {
  const { session, ready } = useSession()
  const signedIn = ready && Boolean(session)

  return (
    <div className="px-4 pt-6 sm:px-6">
      <nav className="bg-white dark:bg-surface mx-auto flex max-w-5xl items-center gap-3 rounded-2xl px-3 py-3 shadow-sm sm:gap-8 sm:px-5">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <AframpMark className="size-7" />
          <span className="text-charcoal dark:text-white text-lg font-bold tracking-tight">
            Aframp
          </span>
        </Link>

        <ul className="text-charcoal dark:text-white/80 ml-auto hidden items-center gap-7 text-sm md:flex">
          {nav.map(({ label, href }) => (
            <li key={label}>
              <a href={href} className="hover:text-brand dark:hover:text-brand">
                {label}
              </a>
            </li>
          ))}
          {signedIn && (
            <li>
              <Link href="/home" className="hover:text-brand dark:hover:text-brand">
                Dashboard
              </Link>
            </li>
          )}
        </ul>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2.5 md:ml-0">
          <ThemeToggle />
          {signedIn ? (
            <Link
              href="/home"
              className="bg-brand rounded-full px-3 py-2 text-sm font-medium sm:px-5 text-white transition-opacity hover:opacity-90"
            >
              Open App
            </Link>
          ) : (
            <>
              <Link
                href="/signup"
                className="bg-charcoal rounded-full px-3 py-2 text-sm font-medium sm:px-5 text-white transition-opacity hover:opacity-90"
              >
                Get Started
              </Link>
              <Link
                href="/login"
                className="bg-brand rounded-full px-3 py-2 text-sm font-medium sm:px-5 text-white transition-opacity hover:opacity-90"
              >
                Login
              </Link>
            </>
          )}
        </div>
      </nav>
    </div>
  )
}
