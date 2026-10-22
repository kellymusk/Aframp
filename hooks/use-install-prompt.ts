'use client'

import { useCallback, useEffect, useState } from 'react'

const VISIT_COUNT_KEY = 'aframp.pwa-visit-count'
const DISMISSED_KEY = 'aframp.pwa-install-dismissed'
const MIN_VISITS_BEFORE_PROMPT = 2

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Platform = 'android' | 'ios' | null

function readVisitCount(): number {
  try {
    return Number(window.localStorage.getItem(VISIT_COUNT_KEY)) || 0
  } catch {
    return 0
  }
}

function writeVisitCount(count: number) {
  try {
    window.localStorage.setItem(VISIT_COUNT_KEY, String(count))
  } catch {
    // Best-effort only — a missed write just delays when the banner is eligible to show.
  }
}

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === 'true'
  } catch {
    return false
  }
}

function writeDismissed() {
  try {
    window.localStorage.setItem(DISMISSED_KEY, 'true')
  } catch {
    // Best-effort only — a missed write just means the banner may reappear next visit.
  }
}

function isStandalone(): boolean {
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
}

function isIosSafari(): boolean {
  const ua = window.navigator.userAgent
  const isIos = /iPad|iPhone|iPod/.test(ua)
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)
  return isIos && isSafari
}

interface InstallPromptState {
  eligible: boolean
  platform: Platform
  install: () => Promise<void>
  dismiss: () => void
}

/**
 * iOS Safari never fires `beforeinstallprompt` — there is no such API in
 * WebKit — so that platform is detected via UA instead and shown
 * instructions rather than a native prompt.
 */
export function useInstallPrompt(): InstallPromptState {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [platform, setPlatform] = useState<Platform>(null)
  const [eligible, setEligible] = useState(false)

  useEffect(() => {
    if (isStandalone()) return

    const count = readVisitCount() + 1
    writeVisitCount(count)
    const dismissed = readDismissed()
    const meetsVisitThreshold = count >= MIN_VISITS_BEFORE_PROMPT

    if (isIosSafari()) {
      setPlatform('ios')
      setEligible(meetsVisitThreshold && !dismissed)
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredEvent(event as BeforeInstallPromptEvent)
      setPlatform('android')
      setEligible(meetsVisitThreshold && !dismissed)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  const install = useCallback(async () => {
    if (!deferredEvent) return
    await deferredEvent.prompt()
    await deferredEvent.userChoice
    setDeferredEvent(null)
    writeDismissed()
    setEligible(false)
  }, [deferredEvent])

  const dismiss = useCallback(() => {
    writeDismissed()
    setEligible(false)
  }, [])

  return { eligible, platform, install, dismiss }
}
