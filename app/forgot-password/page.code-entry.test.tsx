import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ForgotPasswordPage from './page'
import { api } from '@/lib/api'

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api')
  return {
    ...actual,
    api: {
      requestPasswordReset: jest.fn(),
      confirmPasswordReset: jest.fn(),
    },
  }
})

const mockRequest = api.requestPasswordReset as jest.Mock
const mockConfirm = api.confirmPasswordReset as jest.Mock

async function reachCodeStep(user: ReturnType<typeof userEvent.setup>) {
  mockRequest.mockResolvedValue({ challenge_id: 'chal-1', expires_in_secs: 600 })
  render(<ForgotPasswordPage />)
  await user.type(screen.getByLabelText(/^email$/i), 'hello@acme.com')
  await user.click(screen.getByRole('button', { name: /send code/i }))
  return screen.findByLabelText(/6-digit code/i)
}

describe('ForgotPasswordPage code entry', () => {
  beforeEach(() => {
    mockRequest.mockReset()
    mockConfirm.mockReset()
  })

  it('keeps only digits in the code field', async () => {
    const user = userEvent.setup()
    const code = await reachCodeStep(user)

    await user.type(code, '12a-3 4b56')

    expect(code).toHaveValue('123456')
  })

  it('asks for the full code before confirming', async () => {
    const user = userEvent.setup()
    const code = await reachCodeStep(user)

    await user.type(code, '123')
    await user.type(screen.getByLabelText(/^new password$/i), 'a-much-longer-passphrase')
    await user.type(screen.getByLabelText(/confirm new password/i), 'a-much-longer-passphrase')
    await user.click(screen.getByRole('button', { name: /update password/i }))

    expect(screen.getByText(/enter the 6-digit code/i)).toBeInTheDocument()
    expect(mockConfirm).not.toHaveBeenCalled()
  })

  it('does not confirm when the two passwords differ', async () => {
    const user = userEvent.setup()
    const code = await reachCodeStep(user)

    await user.type(code, '123456')
    await user.type(screen.getByLabelText(/^new password$/i), 'a-much-longer-passphrase')
    await user.type(screen.getByLabelText(/confirm new password/i), 'another-long-passphrase')
    await user.click(screen.getByRole('button', { name: /update password/i }))

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    expect(mockConfirm).not.toHaveBeenCalled()
  })

  it('stays on the form with the server message when the code is rejected', async () => {
    const user = userEvent.setup()
    mockConfirm.mockRejectedValue(new Error('That code is invalid or expired'))
    const code = await reachCodeStep(user)

    await user.type(code, '123456')
    await user.type(screen.getByLabelText(/^new password$/i), 'a-much-longer-passphrase')
    await user.type(screen.getByLabelText(/confirm new password/i), 'a-much-longer-passphrase')
    await user.click(screen.getByRole('button', { name: /update password/i }))

    expect(await screen.findByText('That code is invalid or expired')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /password updated/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /update password/i })).toBeEnabled()
  })

  it('does not say whether the email has an account', async () => {
    const user = userEvent.setup()
    await reachCodeStep(user)

    expect(screen.getByText(/if that email has an account/i)).toBeInTheDocument()
  })
})
