import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useRouter } from 'next/navigation'
import LoginPage from '../page'
import { useSession } from '@/components/session-provider'
import { ApiError } from '@/lib/api'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/components/session-provider', () => ({
  useSession: jest.fn(),
}))

describe('LoginPage — rate-limit cooldown (#482)', () => {
  const mockReplace = jest.fn()
  const mockSignIn = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    ;(useRouter as jest.Mock).mockReturnValue({ replace: mockReplace })
    ;(useSession as jest.Mock).mockReturnValue({
      session: null,
      ready: true,
      signIn: mockSignIn,
      signInWithFreighter: jest.fn(),
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  async function submitForm() {
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'merchant@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong-password' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    // Wait for the rejected signIn() to be handled and "Signing in…" to
    // clear before the caller submits again — otherwise a fast second call
    // in the same test can't find the (still-disabled) submit button.
    await waitFor(() => {
      expect(screen.queryByText(/signing in/i)).not.toBeInTheDocument()
    })
  }

  it('shows a countdown derived from the Retry-After header on a 429 response', async () => {
    mockSignIn.mockRejectedValue(new ApiError('Too many attempts', 429, 42))
    render(<LoginPage />)

    await submitForm()

    expect(await screen.findByTestId('login-cooldown')).toHaveTextContent('42 seconds')
    expect(screen.getByRole('button', { name: /try again in 42s/i })).toBeDisabled()
  })

  it('falls back to a default cooldown when the 429 has no Retry-After header', async () => {
    mockSignIn.mockRejectedValue(new ApiError('Too many attempts', 429))
    render(<LoginPage />)

    await submitForm()

    expect(await screen.findByTestId('login-cooldown')).toHaveTextContent('30 seconds')
  })

  it('locks out after 5 failed attempts even without an explicit 429', async () => {
    mockSignIn.mockRejectedValue(new Error('Invalid credentials'))
    render(<LoginPage />)

    for (let i = 0; i < 4; i++) {
      await submitForm()
    }
    expect(screen.queryByTestId('login-cooldown')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeEnabled()

    await submitForm()

    expect(await screen.findByTestId('login-cooldown')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again in/i })).toBeDisabled()
  })

  it('counts the countdown down and re-enables the submit button once it reaches zero', async () => {
    mockSignIn.mockRejectedValue(new ApiError('Too many attempts', 429, 3))
    render(<LoginPage />)

    await submitForm()
    expect(await screen.findByTestId('login-cooldown')).toHaveTextContent('3 seconds')

    act(() => {
      jest.advanceTimersByTime(3000)
    })

    await waitFor(() => {
      expect(screen.queryByTestId('login-cooldown')).not.toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeEnabled()
  })

  it('does not submit while the cooldown is active', async () => {
    mockSignIn.mockRejectedValue(new ApiError('Too many attempts', 429, 10))
    render(<LoginPage />)

    await submitForm()
    await screen.findByTestId('login-cooldown')
    mockSignIn.mockClear()

    fireEvent.click(screen.getByRole('button', { name: /try again in/i }))

    expect(mockSignIn).not.toHaveBeenCalled()
  })
})
