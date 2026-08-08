'use client'

import { useEffect, useState } from 'react'
import { CloudOff } from 'lucide-react'
import { DATA_UPDATE_EVENT, readLastDataUpdate } from '@/lib/offline/connectivity'
import {
  flushQueuedOrderSync,
  getQueuedOrderSyncCount,
  ORDER_SYNC_QUEUE_EVENT,
} from '@/lib/offline/order-sync-queue'

export default function OfflineBoundary({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState(true)
  const [lastDataUpdate, setLastDataUpdate] = useState<number | null>(null)
  const [queuedActions, setQueuedActions] = useState(0)

  useEffect(() => {
    const refreshOfflineMetadata = () => {
      setLastDataUpdate(readLastDataUpdate())
      setQueuedActions(getQueuedOrderSyncCount())
    }

    const goOnline = () => {
      setOnline(true)
      void flushQueuedOrderSync().finally(refreshOfflineMetadata)
    }
    const goOffline = () => setOnline(false)

    const initiallyOnline = navigator.onLine
    setOnline(initiallyOnline)
    refreshOfflineMetadata()
    if (initiallyOnline) {
      void flushQueuedOrderSync().finally(refreshOfflineMetadata)
    }
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    window.addEventListener(DATA_UPDATE_EVENT, refreshOfflineMetadata)
    window.addEventListener(ORDER_SYNC_QUEUE_EVENT, refreshOfflineMetadata)

    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
      window.removeEventListener(DATA_UPDATE_EVENT, refreshOfflineMetadata)
      window.removeEventListener(ORDER_SYNC_QUEUE_EVENT, refreshOfflineMetadata)
    }
  }, [])

  return (
    <>
      {!online && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-0 top-0 z-[100] border-b border-amber-500/30 bg-amber-950/95 px-4 py-2 text-amber-50 shadow-lg backdrop-blur"
        >
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-sm">
            <CloudOff className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="font-semibold">You are offline</span>
            <span className="text-amber-100/80">
              {lastDataUpdate
                ? `Last data update: ${new Date(lastDataUpdate).toLocaleString()}`
                : 'No cached data timestamp available'}
            </span>
            {queuedActions > 0 && (
              <span className="text-amber-100/80">
                {queuedActions} action{queuedActions === 1 ? '' : 's'} queued
              </span>
            )}
          </div>
        </div>
      )}
      {children}
    </>
  )
}
