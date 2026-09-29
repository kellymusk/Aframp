import { render, screen, waitFor } from '@testing-library/react'
import { SessionProvider, useSession } from '../session-provider'
import { api, setUnauthorizedHandler, type Me } from '@/lib/api'

const fetchMock = jest.fn()
const originalFetch = globalThis.fetch

beforeEach(() => {
  fetchMock.mockReset()
  globalThis.fetch = fetchMock as unknown as typeof fetch
  setUnauthorizedHandler(null)
  localStorage.clear()
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

function TestComponent() {
  const { session, refreshMe, me } = useSession()
  return (
    <div>
      <div data-testid="session-exists">{session ? 'yes' : 'no'}</div>
      <div data-testid="me-exists">{me ? 'yes' : 'no'}</div>
      <button
        onClick={() => {
          refreshMe().then((result) => {
            const event = new CustomEvent('refresh-result', { detail: result })
            window.dispatchEvent(event)
          })
        }}
      >
        Refresh
      </button>
    </div>
  )
}

describe('SessionProvider', () => {
  it('loads session from localStorage on mount', () => {
    const session = { token: 'tok', userId: 'u', merchantId: 'm' }
    localStorage.setItem('aframp.session', JSON.stringify(session))

    render(
      <SessionProvider>
        <TestComponent />
      </SessionProvider>
    )

    expect(screen.getByTestId('session-exists')).toHaveTextContent('yes')
  })

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem('aframp.session', 'invalid-json')

    render(
      <SessionProvider>
        <TestComponent />
      </SessionProvider>
    )

    expect(screen.getByTestId('session-exists')).toHaveTextContent('no')
    expect(localStorage.getItem('aframp.session')).toBeNull()
  })

  it('refreshMe returns success with data on successful API call', async () => {
    const session = { token: 'tok', userId: 'u', merchantId: 'm' }
    localStorage.setItem('aframp.session', JSON.stringify(session))

    const meData: Me = {
      user_id: 'u',
      email: 'test@example.com',
      name: 'Test User',
      is_admin: false,
      created_at: '2024-01-01',
      merchant_id: 'm',
      merchant_name: 'Test Merchant',
    }
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(meData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    render(
      <SessionProvider>
        <TestComponent />
      </SessionProvider>
    )

    screen.getByText('Refresh').click()

    await waitFor(() => {
      expect(screen.getByTestId('me-exists')).toHaveTextContent('yes')
    })

    const eventListener = jest.fn()
    window.addEventListener('refresh-result', eventListener as EventListener)
    screen.getByText('Refresh').click()

    await waitFor(() => {
      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { success: true, data: meData },
        })
      )
    })
  })

  it('refreshMe returns network error on fetch failure (status 0)', async () => {
    const session = { token: 'tok', userId: 'u', merchantId: 'm' }
    localStorage.setItem('aframp.session', JSON.stringify(session))

    fetchMock.mockRejectedValue(new TypeError('fetch failed'))

    render(
      <SessionProvider>
        <TestComponent />
      </SessionProvider>
    )

    const eventListener = jest.fn()
    window.addEventListener('refresh-result', eventListener as EventListener)
    screen.getByText('Refresh').click()

    await waitFor(() => {
      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { success: false, reason: 'network' },
        })
      )
    })
  })

  it('refreshMe throws on 401 error to trigger unauthorized handler', async () => {
    const session = { token: 'tok', userId: 'u', merchantId: 'm' }
    localStorage.setItem('aframp.session', JSON.stringify(session))

    const unauthorizedHandler = jest.fn()
    setUnauthorizedHandler(unauthorizedHandler)

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    render(
      <SessionProvider>
        <TestComponent />
      </SessionProvider>
    )

    const eventListener = jest.fn((e) => {
      // The event should not fire for 401 errors - they should throw
      window.removeEventListener('refresh-result', eventListener as EventListener)
    })
    window.addEventListener('refresh-result', eventListener as EventListener)

    screen.getByText('Refresh').click()

    await waitFor(() => {
      expect(unauthorizedHandler).toHaveBeenCalledTimes(1)
    })

    // The event listener should not have been called since the error threw
    expect(eventListener).not.toHaveBeenCalled()
  })

  it('refreshMe throws on non-401 API errors', async () => {
    const session = { token: 'tok', userId: 'u', merchantId: 'm' }
    localStorage.setItem('aframp.session', JSON.stringify(session))

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    render(
      <SessionProvider>
        <TestComponent />
      </SessionProvider>
    )

    const eventListener = jest.fn()
    window.addEventListener('refresh-result', eventListener as EventListener)

    screen.getByText('Refresh').click()

    await waitFor(() => {
      expect(eventListener).not.toHaveBeenCalled()
    })
  })

  it('refreshMe throws when called without a session', async () => {
    render(
      <SessionProvider>
        <TestComponent />
      </SessionProvider>
    )

    const eventListener = jest.fn()
    window.addEventListener('refresh-result', eventListener as EventListener)

    screen.getByText('Refresh').click()

    await waitFor(() => {
      expect(eventListener).not.toHaveBeenCalled()
    })
  })
})
