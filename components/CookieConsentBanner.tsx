'use client'

import { useEffect, useMemo, useState } from 'react'

type ConsentState = {
  essential: true
  analytics: boolean
  marketing: boolean
}

const STORAGE_KEY = 'aframps_cookie_consent_v1'

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false)
  const [consent, setConsent] = useState<ConsentState>({
    essential: true,
    analytics: false,
    marketing: false,
  })

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as ConsentState
        setConsent(parsed)
        setVisible(false)
      } else {
        setVisible(true)
      }
    } catch {
      setVisible(true)
    }
  }, [])

  const summaryText = useMemo(() => {
    const a = consent.analytics ? 'analytics enabled' : 'analytics disabled'
    const m = consent.marketing ? 'marketing enabled' : 'marketing disabled'
    return `${a}; ${m}`
  }, [consent.analytics, consent.marketing])

  const save = (next: ConsentState) => {
    setConsent(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50">
      <div className="mx-auto max-w-4xl px-4 pb-4">
        <div className="rounded-2xl border border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 p-4 shadow-lg">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="font-semibold">Cookies & consent</p>
              <p className="text-sm text-muted-foreground">
                We use cookies to make the service work and to understand performance. Choose your preferences.
              </p>
            </div>
            <button
              type="button"
              className="rounded-lg border border-border px-3 py-1 text-sm hover:text-foreground"
              onClick={() => save({ essential: true, analytics: false, marketing: false })}
              aria-label="Reject non-essential cookies"
            >
              Reject
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border p-3">
              <p className="text-sm font-semibold">Essential</p>
              <p className="text-xs text-muted-foreground mt-1">Always enabled. Required for basic functionality.</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-sm font-semibold">Non-essential</p>
              <p className="text-xs text-muted-foreground mt-1">You can enable analytics and/or marketing.</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-4">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={consent.analytics}
                  onChange={(e) => setConsent((c) => ({ ...c, analytics: e.target.checked }))}
                />
                Analytics
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={consent.marketing}
                  onChange={(e) => setConsent((c) => ({ ...c, marketing: e.target.checked }))}
                />
                Marketing
              </label>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                onClick={() =>
                  save({
                    essential: true,
                    analytics: true,
                    marketing: true,
                  })
                }
              >
                Accept all
              </button>
              <button
                type="button"
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:text-foreground"
                onClick={() => save(consent)}
              >
                Save preferences
              </button>
            </div>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">Current: {summaryText}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            You can change your cookie preferences later by refreshing the consent banner (or via your browser settings).
          </p>
        </div>
      </div>
    </div>
  )
}

