'use client'

import ErrorLayout from '@/components/error/ErrorLayout'

export default function OfframpProcessingError({ reset }: { reset: () => void }) {
  return (
    <ErrorLayout
      title="Processing Error"
      message="Something went wrong while processing your offramp order."
      actions={[
        { label: 'Retry', onClick: reset },
        { label: 'Back to Offramp', href: '/offramp' },
      ]}
    />
  )
}
