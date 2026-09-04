'use client'

import { Download, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useInstallPrompt } from '@/hooks/use-install-prompt'

export function InstallPromptBanner() {
  const { eligible, platform, install, dismiss } = useInstallPrompt()

  if (!eligible) return null

  return (
    <div
      role="region"
      aria-label="Install Aframp"
      className="bg-rail border-hairline fixed inset-x-0 bottom-0 z-50 flex items-center gap-3 border-t p-4 md:inset-x-auto md:right-4 md:bottom-4 md:max-w-sm md:rounded-lg md:border"
    >
      <Download className="text-brand size-6 shrink-0" strokeWidth={1.75} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-white">Install Aframp</p>
        <p className="text-dim text-xs">
          {platform === 'ios'
            ? 'Tap Share, then "Add to Home Screen" for quick access.'
            : 'Add Aframp to your home screen for quick access.'}
        </p>
      </div>
      {platform === 'android' && (
        <Button size="sm" onClick={install}>
          Install
        </Button>
      )}
      <button
        type="button"
        aria-label="Dismiss install prompt"
        onClick={dismiss}
        className="text-dim hover:text-bright shrink-0"
      >
        <X className="size-4" strokeWidth={1.75} />
      </button>
    </div>
  )
}
