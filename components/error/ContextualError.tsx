'use client'

import * as Sentry from '@sentry/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import ErrorLayout from '@/components/error/ErrorLayout'

export type ErrorKind = 'network' | 'unauthorized' | 'not-found' | 'server' | 'unknown'

/**
 * Buckets a thrown error by the recovery path the user should take. ApiError
 * carries an HTTP `status` (0 = network failure / CORS rejection); a raw
 * `fetch` failure surfaces as a TypeError with no status at all.
 */
export function classifyError(error: unknown): ErrorKind {
  const status =
    error && typeof error === 'object' && 'status' in error
      ? Number((error as { status: unknown }).status)
      : undefined

  if (status === 0) return 'network'
  if (status === 401) return 'unauthorized'
  if (status === 404) return 'not-found'
  if (status !== undefined && status >= 500 && status < 600) return 'server'

  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'network'
  if (error instanceof TypeError && /fetch|network/i.test(error.message)) return 'network'

  return 'unknown'
}

type Props = {
  error: Error & { digest?: string }
  reset: () => void
  /** Where the "Go home" action points — the dashboard and the public site differ. */
  homeHref: string
}

export default function ContextualError({ error, reset, homeHref }: Props) {
  const router = useRouter()
  const kind = classifyError(error)

  useEffect(() => {
    Sentry.captureException(error, {
      tags: { error_kind: kind },
      extra: { digest: error.digest },
    })
  }, [error, kind])

  // Expired session: there's nothing to retry, send them back to sign in.
  useEffect(() => {
    if (kind === 'unauthorized') router.replace('/login')
  }, [kind, router])

  switch (kind) {
    case 'network': {
      // Status 0 also covers a payment server that's down while the device
      // is online, so only blame the connection when the browser says so.
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false
      return (
        <ErrorLayout
          title={offline ? "You're offline" : 'Payment server unreachable'}
          message={
            offline
              ? 'Check your connection and retry.'
              : "We can't connect to the payment server right now. Please try again in a moment."
          }
          actions={[
            { label: 'Retry', onClick: reset },
            { label: 'Go home', href: homeHref },
          ]}
        />
      )
    }
    case 'unauthorized':
      return (
        <ErrorLayout
          status={401}
          title="Session expired"
          message="Redirecting you to log in…"
          actions={[{ label: 'Log in', href: '/login' }]}
        />
      )
    case 'not-found':
      return (
        <ErrorLayout
          status={404}
          title="Not found"
          message="We couldn't find what you were looking for."
          actions={[
            { label: 'Go back', onClick: () => router.back() },
            { label: 'Go home', href: homeHref },
          ]}
        />
      )
    case 'server':
      return (
        <ErrorLayout
          status={500}
          title="Server error"
          message="Our servers are having trouble — try again in a moment."
          actions={[
            { label: 'Try again', onClick: reset },
            { label: 'Go home', href: homeHref },
          ]}
        />
      )
    default:
      return (
        <ErrorLayout
          status={500}
          title="Something went wrong"
          message="The page couldn't load. Try again, and if it keeps happening let us know."
          actions={[
            { label: 'Try again', onClick: reset },
            { label: 'Go home', href: homeHref },
          ]}
        />
      )
  }
}
