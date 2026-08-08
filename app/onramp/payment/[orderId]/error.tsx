'use client'

import ErrorLayout from '@/components/error/ErrorLayout'

export default function OnrampPaymentError({ reset }: { reset: () => void }) {
  return (
    <ErrorLayout
      title="Payment Error"
      message="Something went wrong while loading your payment."
      actions={[
        { label: 'Retry', onClick: reset },
        { label: 'Back to Onramp', href: '/onramp' },
      ]}
    />
  )
}
