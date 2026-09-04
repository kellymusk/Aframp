'use client'

import { useEffect, useState } from 'react'

/**
 * Starts the Mock Service Worker in demo mode (#486) before rendering
 * children, so nothing races the worker's readiness — `SessionProvider`'s
 * `getSession` call, in particular, would otherwise sometimes hit the real
 * network before the worker had registered.
 *
 * A no-op everywhere else: renders `children` immediately when
 * `NEXT_PUBLIC_DEMO_MODE` isn't `"true"`, and the mock worker code is never
 * imported at all outside demo mode.
 */
export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
  const [ready, setReady] = useState(!demoMode)

  useEffect(() => {
    if (!demoMode) return
    let cancelled = false

    import('@/lib/msw/browser')
      .then(({ worker }) => worker.start({ onUnhandledRequest: 'bypass' }))
      .then(() => {
        if (!cancelled) setReady(true)
      })
      .catch((error: unknown) => {
        // Demo mode failing to start shouldn't hard-block the app — fall
        // through to whatever a real (or absent) backend returns.
        console.error('[demo mode] failed to start the mock service worker:', error)
        if (!cancelled) setReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [demoMode])

  if (!ready) {
    return (
      <div className="bg-ink flex min-h-screen items-center justify-center">
        <p className="text-dim text-sm">Starting demo mode…</p>
      </div>
    )
  }

  return <>{children}</>
}
