import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ForgotPasswordPage from './page'
import { api, ApiError } from '@/lib/api'

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

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    mockRequest.mockReset()
    mockConfirm.mockReset()
  })

  it('requests a code, then sets a new password with it', async () => {
    const user = userEvent.setup()
    mockRequest.mockResolvedValue({ challenge_id: 'chal-1', expires_in_secs: 600 })
    mockConfirm.mockResolvedValue(undefined)
    render(<ForgotPasswordPage />)

    await user.type(screen.getByLabelText(/^email$/i), 'hello@acme.com')
    await user.click(screen.getByRole('button', { name: /send code/i }))
    expect(mockRequest).toHaveBeenCalledWith('hello@acme.com')

    await user.type(await screen.findByLabelText(/6-digit code/i), '123456')
    await user.type(screen.getByLabelText(/^new password$/i), 'a-much-longer-passphrase')
    await user.type(screen.getByLabelText(/confirm new password/i), 'a-much-longer-passphrase')
    await user.click(screen.getByRole('button', { name: /update password/i }))

    await waitFor(() =>
      expect(mockConfirm).toHaveBeenCalledWith('chal-1', '123456', 'a-much-longer-passphrase')
    )
    expect(await screen.findByRole('heading', { name: /password updated/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login')
  })

  it('rejects an invalid email without calling the API', async () => {
    const user = userEvent.setup()
    render(<ForgotPasswordPage />)

    await user.type(screen.getByLabelText(/^email$/i), 'not-an-email')
    await user.click(screen.getByRole('button', { name: /send code/i }))

    expect(screen.getByText(/valid email/i)).toBeInTheDocument()
    expect(mockRequest).not.toHaveBeenCalled()
  })

  it('checks the new password before confirming', async () => {
    const user = userEvent.setup()
    mockRequest.mockResolvedValue({ challenge_id: 'chal-1', expires_in_secs: 600 })
    render(<ForgotPasswordPage />)

    await user.type(screen.getByLabelText(/^email$/i), 'hello@acme.com')
    await user.click(screen.getByRole('button', { name: /send code/i }))
    await user.type(await screen.findByLabelText(/6-digit code/i), '123456')
    await user.type(screen.getByLabelText(/^new password$/i), 'short')
    await user.type(screen.getByLabelText(/confirm new password/i), 'short')
    await user.click(screen.getByRole('button', { name: /update password/i }))

    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument()
    expect(mockConfirm).not.toHaveBeenCalled()
  })

  it('shows a calm message when the rate limit is hit', async () => {
    const user = userEvent.setup()
    mockRequest.mockRejectedValue(new ApiError('slow down', 429))
    render(<ForgotPasswordPage />)

    await user.type(screen.getByLabelText(/^email$/i), 'hello@acme.com')
    await user.click(screen.getByRole('button', { name: /send code/i }))

    expect(await screen.findByText(/too many attempts/i)).toBeInTheDocument()
  })
})
