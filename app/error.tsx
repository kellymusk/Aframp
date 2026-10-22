'use client'

import ContextualError from '@/components/error/ContextualError'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ContextualError error={error} reset={reset} homeHref="/" />
}
