'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPromptBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    setDeferredPrompt(null)
    setIsVisible(false)
  }

  const dismiss = () => {
    setIsVisible(false)
    setDeferredPrompt(null)
  }

  if (!isVisible) return null

  return (
    <div className="bg-panel border-hairline fixed bottom-4 left-4 right-4 z-50 flex items-center justify-between gap-4 rounded-lg border p-4 shadow-lg md:left-auto md:right-4 md:max-w-md">
      <div className="flex-1">
        <h3 className="text-sm font-bold text-white">Install Aframp</h3>
        <p className="text-dim mt-1 text-xs">Add to your home screen for quick access</p>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={handleInstall} size="sm">
          Install
        </Button>
        <button
          type="button"
          aria-label="Dismiss install prompt"
          onClick={dismiss}
          className="text-dim hover:text-bright shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm p-1"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}
