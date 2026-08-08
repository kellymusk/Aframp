'use client'

import * as Sentry from '@sentry/nextjs'
import ErrorLayout from './ErrorLayout'

function Fallback({
  error,
  resetError,
}: {
  error: unknown
  componentStack: string
  eventId: string
  resetError(): void
}) {
  Sentry.captureException(error)

  return (
    <ErrorLayout
      status={500}
      title="Something went wrong"
      message="An unexpected error occurred. Our team has been notified."
      actions={[
        { label: 'Try again', onClick: resetError },
        { label: 'Home', href: '/' },
      ]}
    />
  )
}

type Props = {
  children: React.ReactNode
}

export default function SentryErrorBoundary({ children }: Props) {
  return <Sentry.ErrorBoundary fallback={Fallback}>{children}</Sentry.ErrorBoundary>
}
