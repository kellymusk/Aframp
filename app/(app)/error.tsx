'use client'

import ContextualError from '@/components/error/ContextualError'

/**
 * Next.js unmounts app/(app)/layout.tsx (and the `dark` class it supplies)
 * before rendering an error boundary for a segment nested under it — so
 * without this file, an error thrown on any dashboard page falls through to
 * the root app/error.tsx with no dark ancestor, flashing to a light screen.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="dark bg-ink">
      <ContextualError error={error} reset={reset} homeHref="/home" />
    </div>
  )
}
