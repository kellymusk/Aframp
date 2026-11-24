import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SessionProvider, useSession } from '@/components/session-provider'

// Mock fetch globally so we can control /api/session responses
const fetchMock = jest.fn()
global.fetch = fetchMock

function TestConsumer() {
  const { session, signIn } = useSession()
  return (
    <div>
      <span data-testid="session">{session ? session.token : 'none'}</span>
      <button onClick={() => signIn('user@example.com', 'password').catch(() => {})}>
        Sign in
      </button>
    </div>
  )
}

describe('SessionProvider', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    localStorage.clear()
  })

  it('does not write any token to localStorage after sign-in', async () => {
    // /api/session GET — no existing session
    fetchMock.mockResolvedValueOnce({
      json: () => Promise.resolve(null),
    } as Response)

    // api.login — mock is hoisted via jest.mock below
    // /api/session POST — cookie persisted server-side
    fetchMock.mockResolvedValueOnce({
      json: () => Promise.resolve({ ok: true }),
    } as Response)

    render(
      <SessionProvider>
        <TestConsumer />
      </SessionProvider>
    )

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      // Nothing should have been written to localStorage
      expect(localStorage.length).toBe(0)
      // In particular, the old storage key must not exist
      expect(localStorage.getItem('aframp.session')).toBeNull()
    })
  })

  it('hydrates the session from /api/session on mount, not localStorage', async () => {
    // Simulate a stale localStorage entry (e.g. from before the migration)
    localStorage.setItem(
      'aframp.session',
      JSON.stringify({ token: 'old', userId: 'u', merchantId: null })
    )

    // /api/session GET returns a fresh cookie-based session
    fetchMock.mockResolvedValueOnce({
      json: () => Promise.resolve({ authenticated: true, userId: 'u2', merchantId: null }),
    } as Response)

    render(
      <SessionProvider>
        <TestConsumer />
      </SessionProvider>
    )

    // The provider should use the cookie session, not the localStorage one
    await waitFor(() => {
      expect(screen.getByTestId('session').textContent).toBe('httpOnly-cookie')
    })
  })
})

// Mock api.login so the component doesn't need a real backend
jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api')
  return {
    ...actual,
    api: {
      ...actual.api,
      login: jest.fn().mockResolvedValue({ token: 'tok', user_id: 'uid', merchant_id: null }),
      logout: jest.fn().mockResolvedValue(undefined),
    },
    setUnauthorizedHandler: jest.fn(),
  }
})
