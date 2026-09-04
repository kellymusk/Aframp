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
  const signIn = jest.fn()

  beforeEach(() => {
    replace.mockReset()
    signIn.mockReset()
    ;(useRouter as jest.Mock).mockReturnValue({ replace })
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

  it('calls signIn with the entered credentials', async () => {
    const user = userEvent.setup()
    signIn.mockResolvedValue(undefined)
    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email/i), 'merchant@example.com')
    await user.type(screen.getByLabelText(/password/i), 'secret-pass')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(signIn).toHaveBeenCalledWith('merchant@example.com', 'secret-pass')
    expect(replace).toHaveBeenCalledWith('/charge')
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
