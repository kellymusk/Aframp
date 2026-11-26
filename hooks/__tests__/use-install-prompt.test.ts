import { renderHook, act } from '@testing-library/react'
import {
  useInstallPrompt,
  VISIT_COUNT_KEY,
  DISMISSED_KEY,
  DISMISS_COOLDOWN_MS,
} from '../use-install-prompt'

function fireInstallEvent(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const e = new Event('beforeinstallprompt', { cancelable: true }) as any
  e.prompt = jest.fn().mockResolvedValue(undefined)
  e.userChoice = Promise.resolve({ outcome })
  act(() => {
    window.dispatchEvent(e)
  })
  return e
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  window.matchMedia = jest.fn().mockReturnValue({ matches: false }) as any
})

describe('useInstallPrompt', () => {
  it('does not offer install on the first visit', () => {
    const { result } = renderHook(() => useInstallPrompt())
    fireInstallEvent()
    expect(localStorage.getItem(VISIT_COUNT_KEY)).toBe('1')
    expect(result.current.canInstall).toBe(false)
  })

  it('offers install from the second visit', () => {
    localStorage.setItem(VISIT_COUNT_KEY, '1')
    const { result } = renderHook(() => useInstallPrompt())
    fireInstallEvent()
    expect(result.current.canInstall).toBe(true)
  })

  it('counts a visit once per session', () => {
    renderHook(() => useInstallPrompt())
    renderHook(() => useInstallPrompt())
    expect(localStorage.getItem(VISIT_COUNT_KEY)).toBe('1')
  })

  it('is hidden when recently dismissed, shown again after cooldown', () => {
    localStorage.setItem(VISIT_COUNT_KEY, '5')
    localStorage.setItem(DISMISSED_KEY, String(Date.now()))
    const a = renderHook(() => useInstallPrompt())
    fireInstallEvent()
    expect(a.result.current.canInstall).toBe(false)
    a.unmount()

    sessionStorage.clear()
    localStorage.setItem(DISMISSED_KEY, String(Date.now() - DISMISS_COOLDOWN_MS - 1))
    const b = renderHook(() => useInstallPrompt())
    fireInstallEvent()
    expect(b.result.current.canInstall).toBe(true)
  })

  it('never offers when already installed (standalone)', () => {
    localStorage.setItem(VISIT_COUNT_KEY, '5')
    window.matchMedia = jest.fn().mockReturnValue({ matches: true }) as any
    const { result } = renderHook(() => useInstallPrompt())
    fireInstallEvent()
    expect(result.current.canInstall).toBe(false)
  })

  it('install() triggers the native prompt and hides the banner', async () => {
    localStorage.setItem(VISIT_COUNT_KEY, '2')
    const { result } = renderHook(() => useInstallPrompt())
    const e = fireInstallEvent('accepted')
    await act(async () => {
      await result.current.install()
    })
    expect(e.prompt).toHaveBeenCalled()
    expect(result.current.canInstall).toBe(false)
  })

  it('dismiss() persists and hides', () => {
    localStorage.setItem(VISIT_COUNT_KEY, '2')
    const { result } = renderHook(() => useInstallPrompt())
    fireInstallEvent()
    act(() => result.current.dismiss())
    expect(result.current.canInstall).toBe(false)
    expect(localStorage.getItem(DISMISSED_KEY)).toBeTruthy()
  })
})
