'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useSession } from '@/components/session-provider'

/** Show the warning this long before the token expires (#867). */
const WARN_BEFORE_MS = 10 * 60 * 1000

/**
 * There are no refresh tokens, so a 24h-old session just starts returning 401
 * and drops the user mid-task. This warns ahead of time and offers a sign-in
 * that returns them to the same page (via `?next=`). Once it expires, the
 * 401 handler signs out and the app layout redirects to /login?next=<page>.
 */
export function SessionExpiryWarning({ expiresAt }: { expiresAt?: number }) {
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useSession()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!expiresAt) return
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [expiresAt])

  if (!expiresAt) return null
  const remaining = expiresAt - now
  if (remaining > WARN_BEFORE_MS) return null

  async function reauth() {
    const next = `${pathname}${window.location.search}`
    await signOut()
    router.replace(`/login?next=${encodeURIComponent(next)}`)
  }
  const minutes = Math.max(0, Math.ceil(remaining / 60_000))

  return (
    <div
      role="alert"
      className="fixed inset-x-0 top-0 z-50 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-black"
    >
      {remaining > 0
        ? `Your session expires in ${minutes} minute${minutes === 1 ? '' : 's'}. Save your work, then `
        : 'Your session has expired. '}
      <button type="button" onClick={reauth} className="underline underline-offset-2">
        sign in again
      </button>{' '}
      to continue on this page.
    </div>
  )
}
