'use client'

import ErrorLayout from '@/components/error/ErrorLayout'

export default function BillsReceiptError({ reset }: { reset: () => void }) {
  return (
    <ErrorLayout
      title="Receipt Error"
      message="Something went wrong while loading your receipt."
      actions={[
        { label: 'Retry', onClick: reset },
        { label: 'Back to Bills', href: '/bills' },
      ]}
    />
  )
}
