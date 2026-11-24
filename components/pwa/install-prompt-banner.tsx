'use client'

import { Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useInstallPrompt } from '@/hooks/use-install-prompt'

export function InstallPromptBanner() {
  const { canInstall, install, dismiss } = useInstallPrompt()

  if (!canInstall) return null

  return (
    <div
      role="dialog"
      aria-label="Install Aframp"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border bg-background p-4 shadow-lg"
    >
      <Download className="h-5 w-5 shrink-0 text-emerald-500" aria-hidden />
      <p className="flex-1 text-sm">Install Aframp for faster access right from your home screen.</p>
      <Button size="sm" onClick={install}>
        Install
      </Button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
