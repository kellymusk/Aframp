import { render, screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import userEvent from '@testing-library/user-event'
import LoginPage from './page'
import { CHALLENGE_SESSION_KEY } from '@/lib/otp-challenge'
import { useSession } from '@/components/session-provider'
import { useRouter } from 'next/navigation'
import { ApiError } from '@/lib/api'

jest.mock('@/components/session-provider', () => ({
  useSession: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

describe('LoginPage', () => {
  const replace = jest.fn()
  const push = jest.fn()
  const signIn = jest.fn()

  beforeEach(() => {
    replace.mockReset()
    push.mockReset()
    signIn.mockReset()
    sessionStorage.clear()
    ;(useRouter as jest.Mock).mockReturnValue({ replace, push })
    ;(useSession as jest.Mock).mockReturnValue({
      session: null,
      ready: true,
      signIn,
      signUp: jest.fn(),
    })
  })

  it('renders an accessible sign-in form', async () => {
    const { container } = render(<LoginPage />)

    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('shows a validation message when required fields are empty', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(screen.getByText('Please enter both your email and password.')).toBeInTheDocument()
    expect(signIn).not.toHaveBeenCalled()
  })

  it('goes straight to /home for a legacy account that gets a session directly', async () => {
    const user = userEvent.setup()
    signIn.mockResolvedValue({ token: 't', user_id: 'u', merchant_id: 'm' })
    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email/i), 'merchant@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret-pass')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(signIn).toHaveBeenCalledWith('merchant@example.com', 'secret-pass')
    expect(replace).toHaveBeenCalledWith('/home')
    expect(push).not.toHaveBeenCalled()
  })

  it('stores challenge_id in sessionStorage and routes to /verify without it in the URL', async () => {
    const user = userEvent.setup()
    signIn.mockResolvedValue({ challenge_id: 'chal-123', expires_in_secs: 600 })
    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email/i), 'merchant@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret-pass')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    // challenge_id must be in sessionStorage, NOT in the URL
    expect(sessionStorage.getItem(CHALLENGE_SESSION_KEY)).toBe('chal-123')
    expect(push).toHaveBeenCalledWith('/verify?flow=login')
    expect(push).not.toHaveBeenCalledWith(expect.stringContaining('challenge_id'))
    expect(replace).not.toHaveBeenCalledWith('/home')
  })

  it('displays the backend error when sign-in fails', async () => {
    const user = userEvent.setup()
    signIn.mockRejectedValue(new Error('Invalid credentials'))
    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email/i), 'merchant@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrong-pass')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument()
  })

  it('shows a rate-limit message with retry guidance on a 429 response', async () => {
    const user = userEvent.setup()
    signIn.mockRejectedValue(new ApiError('rate limited', 429))
    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email/i), 'merchant@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrong-pass')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText(/too many sign-in attempts/i)).toBeInTheDocument()
    expect(screen.getByText(/too many sign-in attempts/i)).toBeInTheDocument()
  })

  it('parses the retry-after seconds from the error code on a 429', async () => {
    const user = userEvent.setup()
    signIn.mockRejectedValue(new ApiError('rate limited', 429, 'RETRY_AFTER_60'))
    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email/i), 'merchant@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrong-pass')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText(/60 seconds/i)).toBeInTheDocument()
  })

  it('shows a rate-limit message with retry guidance on a 429 response', async () => {
    const user = userEvent.setup()
    signIn.mockRejectedValue(new ApiError('rate limited', 429))
    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email/i), 'merchant@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrong-pass')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText(/too many sign-in attempts/i)).toBeInTheDocument()
    expect(screen.getByText(/too many sign-in attempts/i)).toBeInTheDocument()
  })

  it('parses the retry-after seconds from the error code on a 429', async () => {
    const user = userEvent.setup()
    signIn.mockRejectedValue(new ApiError('rate limited', 429, 'RETRY_AFTER_60'))
    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email/i), 'merchant@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrong-pass')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText(/60 seconds/i)).toBeInTheDocument()
  })
})
