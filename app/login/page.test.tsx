import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from './page'
import { useSession } from '@/components/session-provider'
import { useRouter } from 'next/navigation'

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
    ;(useRouter as jest.Mock).mockReturnValue({ replace, push })
    ;(useSession as jest.Mock).mockReturnValue({
      session: null,
      ready: true,
      signIn,
      signUp: jest.fn(),
    })
  })

  it('renders the sign-in form', () => {
    render(<LoginPage />)

    expect(screen.getByRole('heading', { name: /aframp pay/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows a validation message when required fields are empty', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(screen.getByText('Please enter both your email and password.')).toBeInTheDocument()
    expect(signIn).not.toHaveBeenCalled()
  })

  it('goes straight to /charge for a legacy account that gets a session directly', async () => {
    const user = userEvent.setup()
    signIn.mockResolvedValue({ token: 't', user_id: 'u', merchant_id: 'm' })
    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email/i), 'merchant@example.com')
    await user.type(screen.getByLabelText(/password/i), 'secret-pass')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(signIn).toHaveBeenCalledWith('merchant@example.com', 'secret-pass')
    expect(replace).toHaveBeenCalledWith('/charge')
    expect(push).not.toHaveBeenCalled()
  })

  it('routes to /verify when the password check returns an OTP challenge', async () => {
    const user = userEvent.setup()
    signIn.mockResolvedValue({ challenge_id: 'chal-123', expires_in_secs: 600 })
    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email/i), 'merchant@example.com')
    await user.type(screen.getByLabelText(/password/i), 'secret-pass')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(push).toHaveBeenCalledWith('/verify?challenge_id=chal-123&flow=login')
    expect(replace).not.toHaveBeenCalledWith('/charge')
  })

  it('displays the backend error when sign-in fails', async () => {
    const user = userEvent.setup()
    signIn.mockRejectedValue(new Error('Invalid credentials'))
    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email/i), 'merchant@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrong-pass')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument()
  })
})
