'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw, X } from 'lucide-react'

/**
 * PWA Update Banner (#299)
 *
 * Because skipWaiting is set to false in next.config.mjs, a new service worker
 * waits in the background instead of immediately taking over. This component
 * listens for the 'waiting' event and shows a non-intrusive banner that lets
 * users finish any in-flight payment before applying the update.
 *
 * When the user clicks "Update", we post a SKIP_WAITING message to the waiting
 * worker, then reload the page to activate it.
 */
export function PwaUpdateBanner() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    const handleRegistration = (registration: ServiceWorkerRegistration) => {
      // A new worker is already waiting (e.g. hard-refresh after deploy)
      if (registration.waiting) {
        setWaitingWorker(registration.waiting)
        setShow(true)
      }

      // A new worker installs and then enters the waiting state
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (!newWorker) return

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker)
            setShow(true)
          }
        })
      })
    }

    // Check any existing registration
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg) handleRegistration(reg)
    })

    // Also handle registrations made after this component mounts
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Page will already be reloading; nothing to do here
    })
  }, [])

  const handleUpdate = () => {
    if (!waitingWorker) return

    // Tell the waiting SW to skip waiting and become active
    waitingWorker.postMessage({ type: 'SKIP_WAITING' })

    // Reload once the new SW takes control
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload()
    })

    setShow(false)
  }

  const handleDismiss = () => {
    setShow(false)
  }

  if (!show) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 shadow-lg text-sm max-w-sm w-full"
    >
      <RefreshCw className="w-4 h-4 shrink-0 text-primary" aria-hidden="true" />
      <span className="flex-1 text-foreground">
        A new version of AFRAMP is available.
      </span>
      <Button
        size="sm"
        variant="default"
        onClick={handleUpdate}
        className="shrink-0"
      >
        Update
      </Button>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss update notification"
        className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
