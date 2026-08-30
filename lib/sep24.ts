/**
 * SEP-0024 interactive flow: opens the anchor's hosted deposit/withdrawal UI
 * and resolves once the customer finishes (or abandons) it.
 *
 * Spec reference: https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0024.md
 */
'use client'

/** SEP-24 §4.1 recommends this size for the desktop popup. */
const DESKTOP_POPUP_WIDTH = 400
const DESKTOP_POPUP_HEIGHT = 695

function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false
  const narrow = window.matchMedia('(max-width: 640px)').matches
  const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  return narrow || touch
}

/**
 * Opens the anchor's interactive URL. Per SEP-24, a fixed-size popup is only
 * appropriate on desktop — mobile browsers frequently block popups outright,
 * and a 400x695 window makes no sense on a phone screen, so mobile opens a
 * full tab instead.
 */
export function openSep24Window(url: string): Window | null {
  if (isMobileViewport()) {
    return window.open(url, '_blank', 'noopener,noreferrer')
  }

  const left = Math.max(0, window.screenX + (window.outerWidth - DESKTOP_POPUP_WIDTH) / 2)
  const top = Math.max(0, window.screenY + (window.outerHeight - DESKTOP_POPUP_HEIGHT) / 2)
  const features = [
    `width=${DESKTOP_POPUP_WIDTH}`,
    `height=${DESKTOP_POPUP_HEIGHT}`,
    `left=${left}`,
    `top=${top}`,
    'resizable=yes',
    'scrollbars=yes',
  ].join(',')

  return window.open(url, 'sep24-interactive', features)
}

/**
 * Resolves once the interactive window closes — either because the anchor
 * posted a `postMessage` close signal (SEP-24 §4.1) or because the customer
 * closed the tab/popup manually. There is no anchor-side event for the
 * latter, so we also poll `.closed`.
 */
export function waitForSep24Close(popup: Window): Promise<void> {
  return new Promise((resolve) => {
    function onMessage(event: MessageEvent) {
      const data = event.data as { type?: string } | undefined
      if (data?.type === 'onclose' || data?.type === 'close') {
        cleanup()
        resolve()
      }
    }

    const pollTimer = setInterval(() => {
      if (popup.closed) {
        cleanup()
        resolve()
      }
    }, 500)

    function cleanup() {
      clearInterval(pollTimer)
      window.removeEventListener('message', onMessage)
    }

    window.addEventListener('message', onMessage)
  })
}
