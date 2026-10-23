import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProfilePage from './page'
import { useAuthenticatedSession, useSession } from '@/components/session-provider'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

jest.mock('@/components/session-provider', () => ({
  useAuthenticatedSession: jest.fn(),
  useSession: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/lib/api', () => ({
  api: {
    updateProfile: jest.fn(),
    changeEmail: jest.fn(),
    deleteAccount: jest.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(
      message: string,
      public status: number
    ) {
      super(message)
    }
  },
}))

// Mock the PushNotificationToggle component
jest.mock('@/components/push-notification-toggle', () => ({
  PushNotificationToggle: () => <div>Push Notification Toggle</div>,
}))

describe('ProfilePage - Account deletion confirmation', () => {
  const mockToken = 'test-token'
  const mockMe = {
    user_id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    is_admin: false,
    created_at: '2024-01-01T00:00:00Z',
    merchant_id: 'merchant-1',
    merchant_name: 'Test Merchant',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAuthenticatedSession as jest.Mock).mockReturnValue({
      token: mockToken,
    })
    ;(useSession as jest.Mock).mockReturnValue({
      signOut: jest.fn(),
      refreshMe: jest.fn(),
      me: mockMe,
    })
    ;(useRouter as jest.Mock).mockReturnValue({
      replace: jest.fn(),
    })
  })

  it('requires email confirmation before calling deleteAccount API', async () => {
    const user = userEvent.setup()
    render(<ProfilePage />)

    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByText('Test Merchant')).toBeInTheDocument()
    })

    // Click delete account button
    await user.click(screen.getByRole('button', { name: /delete account/i }))

    // Verify the confirmation dialog appears
    await waitFor(() => {
      expect(screen.getByText(/delete your account\?/i)).toBeInTheDocument()
    })

    // The confirmation button should be disabled without entering email
    const confirmButton = screen.getByRole('button', { name: /yes, delete my account/i })
    expect(confirmButton).toBeDisabled()

    // Verify API is not called yet
    expect(api.deleteAccount).not.toHaveBeenCalled()
  })

  it('only enables delete button after email matches exactly', async () => {
    const user = userEvent.setup()
    render(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByText('Test Merchant')).toBeInTheDocument()
    })

    // Click delete account button
    await user.click(screen.getByRole('button', { name: /delete account/i }))

    await waitFor(() => {
      expect(screen.getByText(/delete your account\?/i)).toBeInTheDocument()
    })

    const confirmButton = screen.getByRole('button', { name: /yes, delete my account/i })
    const emailInput = screen.getByPlaceholderText(mockMe.email)

    // Button should be disabled initially
    expect(confirmButton).toBeDisabled()

    // Type incorrect email
    await user.type(emailInput, 'wrong@example.com')
    expect(confirmButton).toBeDisabled()

    // Clear and type correct email
    await user.clear(emailInput)
    await user.type(emailInput, mockMe.email)
    expect(confirmButton).toBeEnabled()
  })

  it('does not call API without correct email confirmation', async () => {
    const user = userEvent.setup()
    render(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByText('Test Merchant')).toBeInTheDocument()
    })

    // Click delete account button
    await user.click(screen.getByRole('button', { name: /delete account/i }))

    await waitFor(() => {
      expect(screen.getByText(/delete your account\?/i)).toBeInTheDocument()
    })

    const emailInput = screen.getByPlaceholderText(mockMe.email)

    // Type incorrect email
    await user.type(emailInput, 'wrong@example.com')

    // The button is disabled, so clicking won't do anything
    // But let's verify the API wasn't called
    expect(api.deleteAccount).not.toHaveBeenCalled()
  })

  it('calls deleteAccount API only after correct email confirmation', async () => {
    const user = userEvent.setup()
    const mockSignOut = jest.fn()
    const mockReplace = jest.fn()

    ;(useSession as jest.Mock).mockReturnValue({
      signOut: mockSignOut,
      refreshMe: jest.fn(),
      me: mockMe,
    })
    ;(useRouter as jest.Mock).mockReturnValue({
      replace: mockReplace,
    })
    ;(api.deleteAccount as jest.Mock).mockResolvedValue({ message: 'Account deleted' })

    render(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByText('Test Merchant')).toBeInTheDocument()
    })

    // Click delete account button
    await user.click(screen.getByRole('button', { name: /delete account/i }))

    await waitFor(() => {
      expect(screen.getByText(/delete your account\?/i)).toBeInTheDocument()
    })

    const confirmButton = screen.getByRole('button', { name: /yes, delete my account/i })
    const emailInput = screen.getByPlaceholderText(mockMe.email)

    // Type correct email
    await user.type(emailInput, mockMe.email)
    expect(confirmButton).toBeEnabled()

    // Click confirm
    await user.click(confirmButton)

    // Verify API was called
    await waitFor(() => {
      expect(api.deleteAccount).toHaveBeenCalledWith(mockToken)
    })

    // Verify user is signed out and redirected
    expect(mockSignOut).toHaveBeenCalled()
    expect(mockReplace).toHaveBeenCalledWith('/login')
  })

  it('allows canceling without calling the API', async () => {
    const user = userEvent.setup()
    render(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByText('Test Merchant')).toBeInTheDocument()
    })

    // Click delete account button
    await user.click(screen.getByRole('button', { name: /delete account/i }))

    await waitFor(() => {
      expect(screen.getByText(/delete your account\?/i)).toBeInTheDocument()
    })

    // Click cancel
    await user.click(screen.getByRole('button', { name: /cancel/i }))

    // Verify dialog is closed
    await waitFor(() => {
      expect(screen.queryByText(/delete your account\?/i)).not.toBeInTheDocument()
    })

    // Verify API was not called
    expect(api.deleteAccount).not.toHaveBeenCalled()
  })

  it('shows clear warning about irreversibility', async () => {
    const user = userEvent.setup()
    render(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByText('Test Merchant')).toBeInTheDocument()
    })

    // Click delete account button
    await user.click(screen.getByRole('button', { name: /delete account/i }))

    await waitFor(() => {
      expect(screen.getByText(/delete your account\?/i)).toBeInTheDocument()
    })

    // Verify warning messages are present in the dialog
    const dialog = within(screen.getByRole('alertdialog'))
    expect(dialog.getByText(/this action cannot be undone/i)).toBeInTheDocument()
    expect(dialog.getByText(/permanently delete your merchant account/i)).toBeInTheDocument()
  })

  it('prompts user to type their specific email address', async () => {
    const user = userEvent.setup()
    render(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByText('Test Merchant')).toBeInTheDocument()
    })

    // Click delete account button
    await user.click(screen.getByRole('button', { name: /delete account/i }))

    await waitFor(() => {
      expect(screen.getByText(/delete your account\?/i)).toBeInTheDocument()
    })

    // Verify the prompt shows their actual email
    const dialog = within(screen.getByRole('alertdialog'))
    expect(dialog.getByText(new RegExp(mockMe.email))).toBeInTheDocument()
    expect(screen.getByPlaceholderText(mockMe.email)).toBeInTheDocument()
  })
})

describe('ProfilePage - profile and account errors', () => {
  const mockMe = {
    user_id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    is_admin: false,
    created_at: '2024-01-01T00:00:00Z',
    merchant_id: 'merchant-1',
    merchant_name: 'Test Merchant',
  }
  const refreshMe = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAuthenticatedSession as jest.Mock).mockReturnValue({ token: 'test-token' })
    ;(useSession as jest.Mock).mockReturnValue({ signOut: jest.fn(), refreshMe, me: mockMe })
    ;(useRouter as jest.Mock).mockReturnValue({ replace: jest.fn() })
    refreshMe.mockResolvedValue({ success: true, data: mockMe })
  })

  async function renderLoaded() {
    render(<ProfilePage />)
    await screen.findByDisplayValue('Test User')
  }

  it('saves trimmed profile changes and confirms', async () => {
    const user = userEvent.setup()
    ;(api.updateProfile as jest.Mock).mockResolvedValue({ ...mockMe, name: 'New Name' })
    await renderLoaded()

    const nameInput = screen.getByLabelText('Your name')
    await user.clear(nameInput)
    await user.type(nameInput, '  New Name  ')
    await user.click(screen.getByRole('button', { name: /save profile|save changes|save/i }))

    await waitFor(() =>
      expect(api.updateProfile).toHaveBeenCalledWith('test-token', {
        name: 'New Name',
        merchant_name: 'Test Merchant',
      })
    )
    expect(await screen.findByText('Profile updated successfully.')).toBeInTheDocument()
    expect(refreshMe).toHaveBeenCalled()
  })

  it('shows the error when saving the profile fails', async () => {
    const user = userEvent.setup()
    ;(api.updateProfile as jest.Mock).mockRejectedValue(new Error('save failed'))
    await renderLoaded()

    await user.click(screen.getByRole('button', { name: /save profile|save changes|save/i }))

    expect(await screen.findByText('save failed')).toBeInTheDocument()
  })

  it('shows the error when account deletion fails', async () => {
    const user = userEvent.setup()
    ;(api.deleteAccount as jest.Mock).mockRejectedValue(new Error('delete failed'))
    await renderLoaded()

    await user.click(screen.getByRole('button', { name: /delete account/i }))
    await user.type(screen.getByPlaceholderText(mockMe.email), mockMe.email)
    const dialog = within(screen.getByRole('alertdialog'))
    await user.click(dialog.getByRole('button', { name: /delete/i }))

    expect(await screen.findByText('delete failed')).toBeInTheDocument()
  })
})
