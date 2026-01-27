'use client';

import ErrorLayout from '@/components/error/ErrorLayout';

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <ErrorLayout
      status={500}
      title="Something went wrong"
      message="A server error occurred. Please try again."
      actions={[
        { label: 'Retry', onClick: reset },
        { label: 'Home', href: '/' },
      ]}
    />
  );
}
