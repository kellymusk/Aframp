'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import ErrorLayout from '@/components/error/ErrorLayout'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <ErrorLayout
      status={500}
      title="Something went wrong"
      message="A server error occurred. Our team has been notified."
      actions={[
        { label: 'Retry', onClick: reset },
        { label: 'Home', href: '/' },
      ]}
    />
  )
}
