import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SignupPage from './page'
import { useSession } from '@/components/session-provider'
import { useRouter } from 'next/navigation'

jest.mock('@/components/session-provider', () => ({
  useSession: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

describe('SignupPage', () => {
  const replace = jest.fn()
  const signUp = jest.fn()

  beforeEach(() => {
    replace.mockReset()
    signUp.mockReset()
    ;(useRouter as jest.Mock).mockReturnValue({ replace })
    ;(useSession as jest.Mock).mockReturnValue({
      session: null,
      ready: true,
      signIn: jest.fn(),
      signUp,
    })
  })

  it('renders the sign-up form', () => {
    render(<SignupPage />)

    expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('shows validation errors when required fields are empty', async () => {
    const user = userEvent.setup()
    render(<SignupPage />)

    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(screen.getByText('Please fill in your business name, email, and password.')).toBeInTheDocument()
    expect(signUp).not.toHaveBeenCalled()
  })

  it('calls signUp with the entered values', async () => {
    const user = userEvent.setup()
    signUp.mockResolvedValue(undefined)
    render(<SignupPage />)

    await user.type(screen.getByLabelText(/business name/i), 'Acme Pay')
    await user.type(screen.getByLabelText(/email/i), 'hello@acme.com')
    await user.type(screen.getByLabelText(/password/i), 'verysecret')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(signUp).toHaveBeenCalledWith('hello@acme.com', 'verysecret', 'Acme Pay')
    expect(replace).toHaveBeenCalledWith('/charge')
  })

  it('displays a backend error when account creation fails', async () => {
    const user = userEvent.setup()
    signUp.mockRejectedValue(new Error('Email already in use'))
    render(<SignupPage />)

    await user.type(screen.getByLabelText(/business name/i), 'Acme Pay')
    await user.type(screen.getByLabelText(/email/i), 'hello@acme.com')
    await user.type(screen.getByLabelText(/password/i), 'verysecret')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText('Email already in use')).toBeInTheDocument()
  })
})
