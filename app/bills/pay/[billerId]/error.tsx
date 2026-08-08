'use client'

import ErrorLayout from '@/components/error/ErrorLayout'

export default function BillsPayError({ reset }: { reset: () => void }) {
  return (
    <ErrorLayout
      title="Payment Error"
      message="Something went wrong while loading the bill payment."
      actions={[
        { label: 'Retry', onClick: reset },
        { label: 'Back to Bills', href: '/bills' },
      ]}
    />
  )
}
