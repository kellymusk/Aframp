import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SessionExpiryWarning } from '../session-expiry-warning'

const mockReplace = jest.fn()
const mockSignOut = jest.fn(() => Promise.resolve())

jest.mock('next/navigation', () => ({
  usePathname: () => '/withdraw',
  useRouter: () => ({ replace: mockReplace }),
}))

jest.mock('@/components/session-provider', () => ({
  useSession: () => ({ signOut: mockSignOut }),
}))

const MINUTE = 60_000

beforeEach(() => {
  jest.clearAllMocks()
})

describe('SessionExpiryWarning', () => {
  it('renders nothing without an expiry', () => {
    const { container } = render(<SessionExpiryWarning />)
    expect(container).toBeEmptyDOMElement()
  })

  it('stays hidden while the session has more than 10 minutes left', () => {
    render(<SessionExpiryWarning expiresAt={Date.now() + 30 * MINUTE} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('counts down the last minutes', () => {
    render(<SessionExpiryWarning expiresAt={Date.now() + 5 * MINUTE} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Your session expires in 5 minutes.')
  })

  it('uses the singular for the final minute', () => {
    render(<SessionExpiryWarning expiresAt={Date.now() + 30_000} />)
    expect(screen.getByRole('alert')).toHaveTextContent('expires in 1 minute.')
  })

  it('says the session has expired once it has', () => {
    render(<SessionExpiryWarning expiresAt={Date.now() - MINUTE} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Your session has expired.')
  })

  it('appears when the clock reaches the warning window', () => {
    jest.useFakeTimers()
    try {
      render(<SessionExpiryWarning expiresAt={Date.now() + 10 * MINUTE + 20_000} />)
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      act(() => {
        jest.advanceTimersByTime(30_000)
      })
      expect(screen.getByRole('alert')).toBeInTheDocument()
    } finally {
      jest.useRealTimers()
    }
  })

  it('signs out and returns to this page after signing in again', async () => {
    window.history.pushState({}, '', '/withdraw?asset=cNGN')
    render(<SessionExpiryWarning expiresAt={Date.now() + MINUTE} />)
    await userEvent.click(screen.getByRole('button', { name: 'sign in again' }))
    expect(mockSignOut).toHaveBeenCalled()
    expect(mockReplace).toHaveBeenCalledWith(
      `/login?next=${encodeURIComponent('/withdraw?asset=cNGN')}`
    )
  })
})
