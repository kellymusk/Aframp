'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Menu } from 'lucide-react'

import { AframpMark } from '@/components/brand/aframp-mark'
import { ThemeToggle } from '@/components/theme-toggle'
import { useSession } from '@/components/session-provider'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { nav } from '@/lib/landing-light-data'

export function SiteNav() {
  const { session, ready } = useSession()
  const signedIn = ready && Boolean(session)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const firstMenuLinkRef = useRef<HTMLAnchorElement>(null)

  return (
    <div className="px-6 pt-6">
      <nav className="bg-white dark:bg-surface mx-auto flex max-w-5xl items-center gap-8 rounded-2xl px-5 py-3 shadow-sm">
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

        <div className="ml-auto flex shrink-0 items-center gap-2.5 md:ml-0">
          <ThemeToggle />
          <div className="hidden items-center gap-2.5 md:flex">
            {signedIn ? (
              <Link
                href="/home"
                className="bg-brand rounded-full px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Open App
              </Link>
            ) : (
              <>
                <Link
                  href="/signup"
                  className="bg-charcoal rounded-full px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  Get Started
                </Link>
                <Link
                  href="/login"
                  className="bg-brand rounded-full px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  Login
                </Link>
              </>
            )}
          </div>
        </div>

        <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={mobileMenuOpen}
              className="text-charcoal dark:text-white rounded-full p-2 hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 md:hidden"
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>
          </DialogTrigger>

          <DialogContent
            aria-label="Menu"
            onOpenAutoFocus={(event) => {
              event.preventDefault()
              firstMenuLinkRef.current?.focus()
            }}
            className="inset-y-0 left-auto right-0 top-0 flex h-dvh w-[min(85vw,22rem)] max-w-none translate-x-0 translate-y-0 flex-col gap-6 rounded-none border-l bg-white p-6 dark:bg-surface"
          >
            <DialogTitle className="text-left">Menu</DialogTitle>
            <nav aria-label="Mobile" className="mt-4">
              <ul className="flex flex-col gap-2">
                {nav.map(({ label, href }, index) => (
                  <li key={label}>
                    <a
                      ref={index === 0 ? firstMenuLinkRef : undefined}
                      href={href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-charcoal dark:text-white block rounded-lg px-3 py-3 text-base hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      {label}
                    </a>
                  </li>
                ))}
                {signedIn && (
                  <li>
                    <Link
                      href="/home"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-charcoal dark:text-white block rounded-lg px-3 py-3 text-base hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      Dashboard
                    </Link>
                  </li>
                )}
              </ul>
            </nav>

            {signedIn ? (
              <Link
                href="/home"
                onClick={() => setMobileMenuOpen(false)}
                className="bg-brand mt-auto rounded-full px-5 py-3 text-center text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Open App
              </Link>
            ) : (
              <div className="mt-auto flex flex-col gap-3">
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="bg-charcoal rounded-full px-5 py-3 text-center text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  Get Started
                </Link>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="bg-brand rounded-full px-5 py-3 text-center text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  Login
                </Link>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </nav>
    </div>
  )
}
