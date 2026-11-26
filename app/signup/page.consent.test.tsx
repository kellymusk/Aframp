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

describe('SignupPage consent', () => {
  const signUp = jest.fn()

  beforeEach(() => {
    signUp.mockReset()
    sessionStorage.clear()
    ;(useRouter as jest.Mock).mockReturnValue({ replace: jest.fn(), push: jest.fn() })
    ;(useSession as jest.Mock).mockReturnValue({
      session: null,
      ready: true,
      signIn: jest.fn(),
      signUp,
    })
  })

  async function fillForm(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText(/business name/i), 'Acme Pay')
    await user.type(screen.getByLabelText(/email/i), 'hello@acme.com')
    await user.type(screen.getByLabelText(/phone number/i), '08011122233')
    await user.type(screen.getByLabelText(/^password$/i), 'verysecret')
    await user.type(screen.getByLabelText(/confirm password/i), 'verysecret')
  }

  it('starts unchecked', () => {
    render(<SignupPage />)

    expect(screen.getByRole('checkbox', { name: /terms of service/i })).not.toBeChecked()
  })

  it('blocks signup again when consent is withdrawn before submitting', async () => {
    const user = userEvent.setup()
    render(<SignupPage />)
    await fillForm(user)

    const consent = screen.getByRole('checkbox', { name: /terms of service/i })
    await user.click(consent)
    await user.click(consent)
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(consent).not.toBeChecked()
    expect(screen.getByText(/accept the terms of service/i)).toBeInTheDocument()
    expect(signUp).not.toHaveBeenCalled()
  })
})
