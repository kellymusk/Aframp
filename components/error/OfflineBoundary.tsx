'use client'

import { useEffect, useState } from 'react'
import ErrorLayout from './ErrorLayout'

export default function OfflineBoundary({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState(() =>
    typeof window !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)

    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  if (!online) {
    return (
      <ErrorLayout
        title="You’re offline"
        message="Check your internet connection and try again."
        actions={[{ label: 'Retry', onClick: () => location.reload() }]}
      />
    )
  }

  return <>{children}</>
}
