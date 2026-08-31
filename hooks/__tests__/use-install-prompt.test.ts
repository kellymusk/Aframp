import { act, renderHook } from '@testing-library/react'

import { useInstallPrompt } from '@/hooks/use-install-prompt'

const ANDROID_CHROME_UA =
  'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0 Mobile Safari/537.36'
const IOS_SAFARI_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

function mockUserAgent(ua: string) {
  Object.defineProperty(window.navigator, 'userAgent', { value: ua, configurable: true })
}

function mockMatchMedia(matches: boolean) {
  window.matchMedia = jest.fn().mockReturnValue({ matches }) as unknown as typeof window.matchMedia
}

function fireBeforeInstallPrompt() {
  const event = Object.assign(new Event('beforeinstallprompt'), {
    prompt: jest.fn(),
    userChoice: Promise.resolve({ outcome: 'accepted' as const }),
  })
  act(() => {
    window.dispatchEvent(event)
  })
}

describe('useInstallPrompt', () => {
  beforeEach(() => {
    window.localStorage.clear()
    mockMatchMedia(false)
    mockUserAgent(ANDROID_CHROME_UA)
  })

  it('is not eligible on the first visit even after the event fires', () => {
    const { result } = renderHook(() => useInstallPrompt())

    fireBeforeInstallPrompt()

    expect(result.current.eligible).toBe(false)
  })

  it('becomes eligible for android once the event fires on the second visit', () => {
    renderHook(() => useInstallPrompt())
    const { result } = renderHook(() => useInstallPrompt())

    fireBeforeInstallPrompt()

    expect(result.current.eligible).toBe(true)
    expect(result.current.platform).toBe('android')
  })

  it('is eligible for iOS Safari on the second visit without a captured event', () => {
    mockUserAgent(IOS_SAFARI_UA)
    renderHook(() => useInstallPrompt())
    const { result } = renderHook(() => useInstallPrompt())

    expect(result.current.eligible).toBe(true)
    expect(result.current.platform).toBe('ios')
  })

  it('stays dismissed on later visits after dismiss() is called', () => {
    renderHook(() => useInstallPrompt())
    const second = renderHook(() => useInstallPrompt())
    fireBeforeInstallPrompt()
    act(() => {
      second.result.current.dismiss()
    })

    const third = renderHook(() => useInstallPrompt())
    fireBeforeInstallPrompt()

    expect(third.result.current.eligible).toBe(false)
  })

  it('never becomes eligible when already running standalone', () => {
    mockMatchMedia(true)
    renderHook(() => useInstallPrompt())
    const { result } = renderHook(() => useInstallPrompt())

    fireBeforeInstallPrompt()

    expect(result.current.eligible).toBe(false)
  })
})
