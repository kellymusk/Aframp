import { render, screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import userEvent from '@testing-library/user-event'
import SignupPage from './page'
import { useSession } from '@/components/session-provider'
import { useRouter } from 'next/navigation'
import { CHALLENGE_SESSION_KEY } from '@/lib/otp-challenge'
import { ApiError } from '@/lib/api'

jest.mock('@/components/session-provider', () => ({
  useSession: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

describe('SignupPage', () => {
  const replace = jest.fn()
  const push = jest.fn()
  const signUp = jest.fn()

  beforeEach(() => {
    replace.mockReset()
    push.mockReset()
    signUp.mockReset()
    sessionStorage.clear()
    ;(useRouter as jest.Mock).mockReturnValue({ replace, push })
    ;(useSession as jest.Mock).mockReturnValue({
      session: null,
      ready: true,
      signIn: jest.fn(),
      signUp,
    })
  })

  it('renders an accessible sign-up form', async () => {
    const { container } = render(<SignupPage />)

    expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('shows validation errors when required fields are empty', async () => {
    const user = userEvent.setup()
    render(<SignupPage />)

    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(
      screen.getByText('Please fill in your business name, email, password, and phone number.')
    ).toBeInTheDocument()
    expect(signUp).not.toHaveBeenCalled()
  })

  it('rejects passwords shorter than eight characters before calling the API', async () => {
    const user = userEvent.setup()
    render(<SignupPage />)

    await user.type(screen.getByLabelText(/business name/i), 'Acme Pay')
    await user.type(screen.getByLabelText(/email/i), 'hello@acme.com')
    await user.type(screen.getByLabelText(/phone number/i), '08011122233')
    await user.type(screen.getByLabelText(/^password$/i), 'short!!')
    await user.type(screen.getByLabelText(/confirm password/i), 'short!!')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(screen.getByText('Use at least 8 characters for your password.')).toBeInTheDocument()
    expect(signUp).not.toHaveBeenCalled()
  })

  it('requires a phone number before calling the API', async () => {
    const user = userEvent.setup()
    render(<SignupPage />)

    await user.type(screen.getByLabelText(/business name/i), 'Acme Pay')
    await user.type(screen.getByLabelText(/email/i), 'hello@acme.com')
    await user.type(screen.getByLabelText(/^password$/i), 'verysecret')
    await user.type(screen.getByLabelText(/confirm password/i), 'verysecret')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(
      screen.getByText('Please fill in your business name, email, password, and phone number.')
    ).toBeInTheDocument()
    expect(signUp).not.toHaveBeenCalled()
  })

  it('stores challenge_id in sessionStorage and routes to /verify without it in the URL', async () => {
    const user = userEvent.setup()
    signUp.mockResolvedValue({ challenge_id: 'chal-456', expires_in_secs: 600 })
    render(<SignupPage />)

    await user.type(screen.getByLabelText(/business name/i), 'Acme Pay')
    await user.type(screen.getByLabelText(/email/i), 'hello@acme.com')
    await user.type(screen.getByLabelText(/phone number/i), '08011122233')
    await user.type(screen.getByLabelText(/^password$/i), 'verysecret')
    await user.type(screen.getByLabelText(/confirm password/i), 'verysecret')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(signUp).toHaveBeenCalledWith('hello@acme.com', 'verysecret', 'Acme Pay', '08011122233')
    expect(signUp).toHaveBeenCalledTimes(1)
    // challenge_id must be in sessionStorage, NOT in the URL
    expect(sessionStorage.getItem(CHALLENGE_SESSION_KEY)).toBe('chal-456')
    expect(push).toHaveBeenCalledWith('/verify?flow=signup')
    expect(push).not.toHaveBeenCalledWith(expect.stringContaining('challenge_id'))
    expect(replace).not.toHaveBeenCalledWith('/charge')
  })

  it('displays a backend error when account creation fails', async () => {
    const user = userEvent.setup()
    signUp.mockRejectedValue(new Error('Email already in use'))
    render(<SignupPage />)

    await user.type(screen.getByLabelText(/business name/i), 'Acme Pay')
    await user.type(screen.getByLabelText(/email/i), 'hello@acme.com')
    await user.type(screen.getByLabelText(/phone number/i), '08011122233')
    await user.type(screen.getByLabelText(/^password$/i), 'verysecret')
    await user.type(screen.getByLabelText(/confirm password/i), 'verysecret')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText('Email already in use')).toBeInTheDocument()
  })

  it('shows the offline variant when signup cannot reach the server', async () => {
    const user = userEvent.setup()
    signUp.mockRejectedValueOnce(new ApiError('Network unavailable', 0))
    render(<SignupPage />)

    await user.type(screen.getByLabelText(/business name/i), 'Acme Pay')
    await user.type(screen.getByLabelText(/email/i), 'hello@acme.com')
    await user.type(screen.getByLabelText(/phone number/i), '08011122233')
    await user.type(screen.getByLabelText(/^password$/i), 'verysecret')
    await user.type(screen.getByLabelText(/confirm password/i), 'verysecret')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText('Network unavailable')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveClass('bg-muted/40')
    expect(signUp).toHaveBeenCalledTimes(1)
  })
})
