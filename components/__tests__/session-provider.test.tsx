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
  // A session triggers a /me load on its own.
  mockApi.getMe.mockResolvedValue(meData)
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
      mockApi.logout.mockRejectedValue(new Error('network'))
      const { result } = await renderSession(storedSession)

      await act(async () => {
        await result.current.signOut()
      })

      expect(result.current.session).toBeNull()
    })

    it('does not call api.logout without a session', async () => {
      const { result } = await renderSession(null)
      await act(async () => {
        await result.current.signOut()
      })
      expect(mockApi.logout).not.toHaveBeenCalled()
    })

    it('runs when the 401 handler fires', async () => {
      mockApi.logout.mockResolvedValue(undefined as never)
      const { result } = await renderSession(storedSession)

      await act(async () => {
        unauthorizedCallback?.()
        await Promise.resolve()
      })

      expect(result.current.session).toBeNull()
    })

    it('unregisters the 401 handler on unmount', async () => {
      const { unmount } = await renderSession()
      unmount()
      expect(unauthorizedCallback).toBeNull()
    })
  })

  describe('profile (/me)', () => {
    it('loads /me once when the session is restored', async () => {
      const { result } = await renderSession(storedSession)

      await waitFor(() => expect(result.current.me).toEqual(meData))
      expect(mockApi.getMe).toHaveBeenCalledTimes(1)
      expect(mockApi.getMe).toHaveBeenCalledWith('tok-1')
      expect(result.current.meLoading).toBe(false)
      expect(result.current.meError).toBeNull()
    })

    it('does not request /me without a session', async () => {
      const { result } = await renderSession(null)

      expect(mockApi.getMe).not.toHaveBeenCalled()
      expect(result.current.meLoading).toBe(false)
    })

    it('reports loading until /me settles', async () => {
      let resolve!: (value: Me) => void
      mockApi.getMe.mockReturnValue(new Promise<Me>((r) => (resolve = r)))
      const { result } = await renderSession(storedSession)

      expect(result.current.meLoading).toBe(true)

      await act(async () => {
        resolve(meData)
      })
      expect(result.current.meLoading).toBe(false)
    })

    it('shares one request between concurrent refreshMe calls', async () => {
      let resolve!: (value: Me) => void
      mockApi.getMe.mockReturnValue(new Promise<Me>((r) => (resolve = r)))
      const { result } = await renderSession(storedSession)

      let outcomes: unknown[] = []
      await act(async () => {
        const pending = [result.current.refreshMe(), result.current.refreshMe()]
        resolve(meData)
        outcomes = await Promise.all(pending)
      })

      expect(mockApi.getMe).toHaveBeenCalledTimes(1)
      expect(outcomes).toEqual([
        { success: true, data: meData },
        { success: true, data: meData },
      ])
    })

    it('exposes the failure as meError', async () => {
      const failure = Object.assign(new Error('offline'), { status: 0 })
      mockApi.getMe.mockRejectedValue(failure)
      const { result } = await renderSession(storedSession)

      await waitFor(() => expect(result.current.meError).toBe(failure))
      expect(result.current.me).toBeNull()
      expect(result.current.meLoading).toBe(false)
    })

    it('forgets the profile on sign-out', async () => {
      mockApi.logout.mockResolvedValue(undefined as never)
      const { result } = await renderSession(storedSession)
      await waitFor(() => expect(result.current.me).toEqual(meData))

      await act(async () => {
        await result.current.signOut()
      })

      expect(result.current.me).toBeNull()
      expect(result.current.meError).toBeNull()
    })
  })

  describe('refreshMe', () => {
    it('returns the profile and caches it as `me`', async () => {
      mockApi.getMe.mockResolvedValue(meData)
      const { result } = await renderSession(storedSession)

      let outcome: Awaited<ReturnType<typeof result.current.refreshMe>> | undefined
      await act(async () => {
        outcome = await result.current.refreshMe()
      })

      expect(mockApi.getMe).toHaveBeenCalledWith('tok-1')
      expect(outcome).toEqual({ success: true, data: meData })
      expect(result.current.me).toEqual(meData)
    })

    it('reports a network failure without signing out', async () => {
      mockApi.getMe.mockRejectedValue(Object.assign(new Error('offline'), { status: 0 }))
      const { result } = await renderSession(storedSession)

      let outcome: Awaited<ReturnType<typeof result.current.refreshMe>> | undefined
      await act(async () => {
        outcome = await result.current.refreshMe()
      })

      expect(outcome).toEqual({ success: false, reason: 'network' })
      expect(result.current.session).toEqual(storedSession)
    })

    it('rethrows other errors (a 401 is handled by the unauthorized handler)', async () => {
      mockApi.getMe.mockRejectedValue(Object.assign(new Error('Unauthorized'), { status: 401 }))
      const { result } = await renderSession(storedSession)

      await expect(result.current.refreshMe()).rejects.toThrow('Unauthorized')
    })

    it('throws when called without a session', async () => {
      const { result } = await renderSession(null)
      await expect(result.current.refreshMe()).rejects.toThrow('refreshMe called without a session')
    })
  })

  describe('hooks', () => {
    it('useSession throws outside SessionProvider', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
      expect(() => renderHook(() => useSession())).toThrow(
        'useSession must be used inside <SessionProvider>'
      )
      spy.mockRestore()
    })

    it('useAuthenticatedSession redirects to /login without a session', () => {
      mockSessionRoute(null)
      renderHook(() => useAuthenticatedSession(), { wrapper: SessionProvider })
      expect(redirect).toHaveBeenCalledWith('/login')
    })

    it('useAuthenticatedSession returns the restored session', async () => {
      mockSessionRoute(storedSession)
      function Probe() {
        const { ready, session } = useSession()
        if (!ready || !session) return <span>loading</span>
        return <Authed />
      }
      function Authed() {
        const session = useAuthenticatedSession()
        return <span data-testid="token">{session.token}</span>
      }
      render(
        <SessionProvider>
          <Probe />
        </SessionProvider>
      )
      expect(await screen.findByTestId('token')).toHaveTextContent('tok-1')
    })
  })
})
