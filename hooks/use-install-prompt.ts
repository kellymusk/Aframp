'use client'

import { useCallback, useEffect, useState } from 'react'

export const VISIT_COUNT_KEY = 'pwa:visit-count'
export const DISMISSED_KEY = 'pwa:install-dismissed-at'
const SESSION_KEY = 'pwa:visit-counted'
/** Show the banner from this visit onward. */
export const MIN_VISITS = 2
/** After dismissal, wait this long before asking again. */
export const DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type StoreName = 'local' | 'session'

function store(name: StoreName): Storage {
  return name === 'local' ? window.localStorage : window.sessionStorage
}

function safeGet(name: StoreName, key: string): string | null {
  try {
    return store(name).getItem(key)
  } catch {
    return null
  }
}

function safeSet(name: StoreName, key: string, value: string) {
  try {
    store(name).setItem(key, value)
  } catch {
    /* storage unavailable (private mode) */
  }
}

function recordVisit(): number {
  const current = parseInt(safeGet('local', VISIT_COUNT_KEY) ?? '0', 10) || 0
  if (safeGet('session', SESSION_KEY)) return current
  const next = current + 1
  safeSet('local', VISIT_COUNT_KEY, String(next))
  safeSet('session', SESSION_KEY, '1')
  return next
}

function recentlyDismissed(): boolean {
  const at = parseInt(safeGet('local', DISMISSED_KEY) ?? '', 10)
  return Number.isFinite(at) && Date.now() - at < DISMISS_COOLDOWN_MS
}

function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)')?.matches === true ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [visits, setVisits] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (isStandalone()) return
    setVisits(recordVisit())
    setDismissed(recentlyDismissed())

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setDeferred(null)

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = useCallback(async () => {
    if (!deferred) return
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    setDeferred(null) // the event can only be used once
    if (outcome === 'dismissed') {
      safeSet('local', DISMISSED_KEY, String(Date.now()))
      setDismissed(true)
    }
  }, [deferred])

  const dismiss = useCallback(() => {
    safeSet('local', DISMISSED_KEY, String(Date.now()))
    setDismissed(true)
  }, [])

  return {
    canInstall: deferred !== null && visits >= MIN_VISITS && !dismissed,
    install,
    dismiss,
  }
}
