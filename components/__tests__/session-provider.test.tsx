import { renderHook, act, render, screen, waitFor } from '@testing-library/react'
import { redirect } from 'next/navigation'
import { api, type LoginResult, type Me, type OtpChallengeResponse } from '@/lib/api'
import { SessionProvider, useSession, useAuthenticatedSession } from '../session-provider'

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

let unauthorizedCallback: (() => void) | null = null

jest.mock('@/lib/api', () => ({
  api: {
    login: jest.fn(),
    signup: jest.fn(),
    verifyOtp: jest.fn(),
    logout: jest.fn(),
    getMe: jest.fn(),
  },
  isOffline: (cause: unknown) =>
    typeof cause === 'object' && cause !== null && (cause as { status?: number }).status === 0,
  setUnauthorizedHandler: jest.fn((handler: (() => void) | null) => {
    unauthorizedCallback = handler
  }),
}))

const mockApi = api as jest.Mocked<typeof api>

type StoredSession = { token: string; userId: string; merchantId: string | null }

const fetchMock = jest.fn()

/**
 * The provider keeps the session in an httpOnly cookie behind /api/session:
 * GET restores it, POST persists it, DELETE clears it.
 */
function mockSessionRoute(stored: StoredSession | null | 'error' = null) {
  fetchMock.mockImplementation((url: string, init?: RequestInit) => {
    if (url !== '/api/session') return Promise.reject(new Error(`unexpected fetch ${url}`))
    const method = init?.method ?? 'GET'
    if (method === 'GET') {
      if (stored === 'error') return Promise.reject(new TypeError('offline'))
      return Promise.resolve({ json: () => Promise.resolve(stored) })
    }
    return Promise.resolve({ json: () => Promise.resolve({ ok: true }) })
  })
}

function sessionCalls(method: string) {
  return fetchMock.mock.calls.filter(
    ([url, init]) => url === '/api/session' && (init?.method ?? 'GET') === method
  )
}

async function renderSession(stored: StoredSession | null | 'error' = null) {
  mockSessionRoute(stored)
  const hook = renderHook(() => useSession(), { wrapper: SessionProvider })
  await waitFor(() => expect(hook.result.current.ready).toBe(true))
  return hook
}

const storedSession: StoredSession = { token: 'tok-1', userId: 'u-1', merchantId: 'm-1' }

const meData: Me = {
  user_id: 'u-1',
  email: 'me@example.com',
  name: 'Merchant Me',
  is_admin: false,
  created_at: '2026-01-01',
  merchant_id: 'm-1',
  merchant_name: 'Test Business',
}

beforeEach(() => {
  jest.clearAllMocks()
  fetchMock.mockReset()
  globalThis.fetch = fetchMock as unknown as typeof fetch
  window.localStorage.clear()
  unauthorizedCallback = null
})

describe('SessionProvider', () => {
  describe('restoring the session', () => {
    it('is not ready until /api/session has answered', async () => {
      let resolve!: (value: unknown) => void
      fetchMock.mockReturnValue(new Promise((r) => (resolve = r)))
      const { result } = renderHook(() => useSession(), { wrapper: SessionProvider })

      expect(result.current.ready).toBe(false)

      await act(async () => {
        resolve({ json: () => Promise.resolve(null) })
        await Promise.resolve()
      })
      await waitFor(() => expect(result.current.ready).toBe(true))
    })

    it('starts with no session when there is no cookie', async () => {
      const { result } = await renderSession(null)
      expect(result.current.session).toBeNull()
    })

    it('restores the session from the cookie on mount', async () => {
      const { result } = await renderSession(storedSession)
      expect(result.current.session).toEqual(storedSession)
    })

    it('starts with no session when the cookie read fails', async () => {
      const { result } = await renderSession('error')
      expect(result.current.session).toBeNull()
    })

    it('never reads or writes the token in localStorage', async () => {
      window.localStorage.setItem('aframp.session', JSON.stringify(storedSession))
      const { result } = await renderSession(null)
      expect(result.current.session).toBeNull()
    })
  })

  describe('signIn', () => {
    it('persists the session for a legacy account that gets one directly', async () => {
      mockApi.login.mockResolvedValue({
        token: 'tok-legacy',
        user_id: 'u-legacy',
        merchant_id: 'm-legacy',
      } as LoginResult)
      const { result } = await renderSession()

      await act(async () => {
        await result.current.signIn('legacy@example.com', 'secret')
      })

      const expected = { token: 'tok-legacy', userId: 'u-legacy', merchantId: 'm-legacy' }
      expect(result.current.session).toEqual(expected)
      const [[, init]] = sessionCalls('POST')
      expect(JSON.parse(init.body as string)).toEqual(expected)
    })

    it('returns an OTP challenge without creating a session', async () => {
      const challenge = { challenge_id: 'chal-1', expires_in_secs: 300 } as LoginResult
      mockApi.login.mockResolvedValue(challenge)
      const { result } = await renderSession()

      let returned: LoginResult | undefined
      await act(async () => {
        returned = await result.current.signIn('user@example.com', 'secret')
      })

      expect(returned).toEqual(challenge)
      expect(result.current.session).toBeNull()
      expect(sessionCalls('POST')).toHaveLength(0)
    })

    it('propagates a login failure and leaves the session empty', async () => {
      mockApi.login.mockRejectedValue(new Error('Invalid credentials'))
      const { result } = await renderSession()

      await expect(result.current.signIn('bad@example.com', 'wrong')).rejects.toThrow(
        'Invalid credentials'
      )
      expect(result.current.session).toBeNull()
    })

    it('keeps the session for this tab when the cookie write fails', async () => {
      mockApi.login.mockResolvedValue({
        token: 'tok-2',
        user_id: 'u-2',
        merchant_id: null,
      } as LoginResult)
      const { result } = await renderSession()
      fetchMock.mockRejectedValue(new TypeError('offline'))

      await act(async () => {
        await result.current.signIn('user@example.com', 'secret')
      })

      expect(result.current.session).toEqual({ token: 'tok-2', userId: 'u-2', merchantId: null })
    })
  })

  it('signUp returns the challenge from api.signup', async () => {
    const challenge = { challenge_id: 'chal-new', expires_in_secs: 600 } as OtpChallengeResponse
    mockApi.signup.mockResolvedValue(challenge)
    const { result } = await renderSession()

    let returned: OtpChallengeResponse | undefined
    await act(async () => {
      returned = await result.current.signUp('new@example.com', 'pw', 'New Co', '08012345678')
    })

    expect(mockApi.signup).toHaveBeenCalledWith('new@example.com', 'pw', 'New Co', '08012345678')
    expect(returned).toEqual(challenge)
    expect(result.current.session).toBeNull()
  })

  it('completeOtp verifies the code and persists the session', async () => {
    mockApi.verifyOtp.mockResolvedValue({
      token: 'tok-otp',
      user_id: 'u-otp',
      merchant_id: 'm-otp',
    })
    const { result } = await renderSession()

    await act(async () => {
      await result.current.completeOtp('chal-1', '123456')
    })

    expect(mockApi.verifyOtp).toHaveBeenCalledWith('chal-1', '123456')
    expect(result.current.session).toEqual({
      token: 'tok-otp',
      userId: 'u-otp',
      merchantId: 'm-otp',
    })
    expect(sessionCalls('POST')).toHaveLength(1)
  })

  describe('signOut', () => {
    it('awaits the server logout before clearing the session', async () => {
      let resolveLogout!: () => void
      mockApi.logout.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveLogout = resolve
        }) as never
      )
      const { result } = await renderSession(storedSession)

      let signOutPromise!: Promise<void>
      act(() => {
        signOutPromise = result.current.signOut()
      })

      // While the logout request is in-flight the session must still be present.
      expect(mockApi.logout).toHaveBeenCalledWith('tok-1')
      expect(result.current.session).toEqual(storedSession)
      expect(result.current.signingOut).toBe(true)

      await act(async () => {
        resolveLogout()
        await signOutPromise
      })

      expect(result.current.session).toBeNull()
      expect(result.current.me).toBeNull()
      expect(result.current.signingOut).toBe(false)
      expect(sessionCalls('DELETE')).toHaveLength(1)
    })

    it('clears the session, logs out on the server and deletes the cookie', async () => {
      mockApi.logout.mockResolvedValue(undefined as never)
      const { result } = await renderSession(storedSession)

      await act(async () => {
        await result.current.signOut()
      })

      expect(result.current.session).toBeNull()
      expect(result.current.me).toBeNull()
      expect(mockApi.logout).toHaveBeenCalledWith('tok-1')
      expect(sessionCalls('DELETE')).toHaveLength(1)
    })

    it('still clears local state when api.logout rejects', async () => {
      mockApi.logout.mockRejectedValue(new Error('network down'))
      const { result } = await renderSession(storedSession)

      await act(async () => {
        await result.current.signOut()
      })

      expect(result.current.session).toBeNull()
      expect(result.current.me).toBeNull()
      expect(sessionCalls('DELETE')).toHaveLength(1)
    })

    it('does not block sign-out indefinitely when the logout request hangs', async () => {
      jest.useFakeTimers()
      try {
        mockApi.logout.mockReturnValue(new Promise<void>(() => {}) as never)
        const { result } = await renderSession(storedSession)

        let signOutPromise!: Promise<void>
        act(() => {
          signOutPromise = result.current.signOut()
        })

        expect(result.current.session).toEqual(storedSession)

        await act(async () => {
          jest.advanceTimersByTime(5000)
          await signOutPromise
        })

        expect(result.current.session).toBeNull()
        expect(result.current.signingOut).toBe(false)
      } finally {
        jest.useRealTimers()
      }
    })
  })
})
