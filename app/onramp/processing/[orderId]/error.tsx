'use client'

import ErrorLayout from '@/components/error/ErrorLayout'

export default function OnrampProcessingError({ reset }: { reset: () => void }) {
  return (
    <ErrorLayout
      title="Processing Error"
      message="Something went wrong while processing your onramp order."
      actions={[
        { label: 'Retry', onClick: reset },
        { label: 'Back to Onramp', href: '/onramp' },
      ]}
    />
  )
}
