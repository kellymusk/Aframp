import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SettingsPage from '../page'
import { api } from '@/lib/api'

jest.mock('next/navigation', () => ({ useRouter: () => ({ replace: jest.fn() }) }))

const mockMe = {
  id: '1',
  email: 'current@example.com',
  name: 'Test User',
  merchant_name: 'Test Merchant',
  phone_number: '+2348012345678',
}
const mockRefreshMe = jest.fn()

jest.mock('@/lib/api', () => ({
  api: {
    changeEmail: jest.fn(),
    updateProfile: jest.fn(),
    deleteAccount: jest.fn(),
    listSessions: jest.fn().mockResolvedValue([]),
    changePhone: jest.fn(),
  },
  ApiError: class ApiError extends Error {},
}))

jest.mock('@/components/session-provider', () => ({
  useAuthenticatedSession: () => ({ token: 'tok' }),
  useSession: () => ({ signOut: jest.fn(), refreshMe: mockRefreshMe, me: mockMe }),
}))

jest.mock('@/components/push-notification-toggle', () => ({
  PushNotificationToggle: () => null,
}))

const mockChangePhone = api.changePhone as jest.Mock

beforeEach(() => {
  mockChangePhone.mockReset()
  mockRefreshMe.mockReset()
})

async function requestChange(user: ReturnType<typeof userEvent.setup>, phone: string) {
  const input = screen.getByLabelText('New phone number')
  await user.clear(input)
  await user.type(input, phone)
  await user.click(screen.getByRole('button', { name: 'Change phone' }))
}

describe('Settings page – phone number change', () => {
  it('shows the current number', () => {
    render(<SettingsPage />)
    expect(screen.getByText('+2348012345678')).toBeInTheDocument()
  })

  it('rejects the number already on the account', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)
    await requestChange(user, '+234 801 234 5678')
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a different phone number')
    expect(mockChangePhone).not.toHaveBeenCalled()
  })

  it('rejects a malformed number', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)
    await requestChange(user, '12ab')
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid phone number')
  })

  it('verifies the current number, then the new one, then refreshes the profile', async () => {
    const user = userEvent.setup()
    mockChangePhone
      .mockResolvedValueOnce({ challenge_id: 'chal-old' })
      .mockResolvedValueOnce({ challenge_id: 'chal-new' })
      .mockResolvedValueOnce({ ok: true })
    mockRefreshMe.mockResolvedValue({ success: true })
    render(<SettingsPage />)

    await requestChange(user, '+254 (712) 345-678')
    expect(mockChangePhone).toHaveBeenLastCalledWith('tok', { new_phone: '+254712345678' })

    const code = await screen.findByLabelText('Code sent to your current number')
    await user.type(code, '111111')
    await user.click(screen.getByRole('button', { name: 'Verify code' }))
    expect(mockChangePhone).toHaveBeenLastCalledWith('tok', {
      challenge_id: 'chal-old',
      code: '111111',
    })

    await user.type(await screen.findByLabelText('Code sent to your new number'), '222222')
    await user.click(screen.getByRole('button', { name: 'Verify code' }))

    expect(await screen.findByText(/Your phone number has been changed/)).toBeInTheDocument()
    expect(mockRefreshMe).toHaveBeenCalled()
  })

  it('reports a start response without a challenge', async () => {
    const user = userEvent.setup()
    mockChangePhone.mockResolvedValue({ ok: true })
    render(<SettingsPage />)
    await requestChange(user, '+254712345678')
    expect(await screen.findByRole('alert')).toHaveTextContent('did not start a verification')
  })

  it('shows an error when the change cannot start', async () => {
    const user = userEvent.setup()
    mockChangePhone.mockRejectedValue(new Error('Number already in use'))
    render(<SettingsPage />)
    await requestChange(user, '+254712345678')
    expect(await screen.findByRole('alert')).toHaveTextContent('Number already in use')
  })

  it('surfaces a failed verification and a failed profile refresh', async () => {
    const user = userEvent.setup()
    mockChangePhone
      .mockResolvedValueOnce({ challenge_id: 'chal-old' })
      .mockRejectedValueOnce(new Error('Incorrect code'))
      .mockResolvedValueOnce({ ok: true })
    mockRefreshMe.mockResolvedValue({ success: false, reason: 'network' })
    render(<SettingsPage />)
    await requestChange(user, '+254712345678')

    const code = await screen.findByLabelText('Code sent to your current number')
    await user.type(code, '000000')
    await user.click(screen.getByRole('button', { name: 'Verify code' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect code')

    await user.clear(code)
    await user.type(code, '111111')
    await user.click(screen.getByRole('button', { name: 'Verify code' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not refresh your profile.')
  })

  it('cancels back to the number form', async () => {
    const user = userEvent.setup()
    mockChangePhone.mockResolvedValue({ challenge_id: 'chal-old' })
    render(<SettingsPage />)
    await requestChange(user, '+254712345678')
    await screen.findByLabelText('Code sent to your current number')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByLabelText('New phone number')).toBeInTheDocument()
  })
})
