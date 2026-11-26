import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ApiKeysPage from './page'
import { useAuthenticatedSession } from '@/components/session-provider'
import { api } from '@/lib/api'

jest.mock('@/components/session-provider', () => ({
  useAuthenticatedSession: jest.fn(),
}))

jest.mock('@/lib/api', () => ({
  api: {
    listApiKeys: jest.fn(),
    createApiKey: jest.fn(),
    revokeApiKey: jest.fn(),
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

describe('ApiKeysPage - One-time key reveal', () => {
  const mockToken = 'test-token'

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAuthenticatedSession as jest.Mock).mockReturnValue({
      token: mockToken,
    })
    ;(api.listApiKeys as jest.Mock).mockResolvedValue([])
  })

  it('shows full_key in a modal dialog after creation', async () => {
    const user = userEvent.setup()
    const fullKey = 'ak_live_1234567890abcdef'
    ;(api.createApiKey as jest.Mock).mockResolvedValue({
      api_key: { id: '1', name: 'Test Key', key_preview: 'ak_live_••••••••••••••••' },
      full_key: fullKey,
    })

    render(<ApiKeysPage />)

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('API Keys')).toBeInTheDocument()
    })

    // Open create dialog
    await user.click(screen.getByRole('button', { name: /new key/i }))

    // Fill in the form
    await user.type(screen.getByLabelText(/key name/i), 'Test Key')
    await user.click(screen.getByRole('button', { name: /create key/i }))

    // Wait for the reveal dialog to open
    await waitFor(() => {
      expect(screen.getByText(/save your api key now/i)).toBeInTheDocument()
    })

    // Verify the full key is displayed
    expect(screen.getByText(fullKey)).toBeInTheDocument()
  })

  it('disables close button until user checks the acknowledgment checkbox', async () => {
    const user = userEvent.setup()
    ;(api.createApiKey as jest.Mock).mockResolvedValue({
      api_key: { id: '1', name: 'Test Key', key_preview: 'ak_live_••••••••••••••••' },
      full_key: 'ak_live_1234567890abcdef',
    })

    render(<ApiKeysPage />)

    await waitFor(() => {
      expect(screen.getByText('API Keys')).toBeInTheDocument()
    })

    // Create a key
    await user.click(screen.getByRole('button', { name: /new key/i }))
    await user.type(screen.getByLabelText(/key name/i), 'Test Key')
    await user.click(screen.getByRole('button', { name: /create key/i }))

    await waitFor(() => {
      expect(screen.getByText(/save your api key now/i)).toBeInTheDocument()
    })

    // The "Done" button should be disabled initially
    const doneButton = screen.getByRole('button', { name: /done/i })
    expect(doneButton).toBeDisabled()

    // Check the acknowledgment checkbox
    const checkbox = screen.getByRole('checkbox', { name: /i have copied my key/i })
    await user.click(checkbox)

    // Now the button should be enabled
    expect(doneButton).toBeEnabled()
  })

  it('does not store full_key after closing the dialog', async () => {
    const user = userEvent.setup()
    const fullKey = 'ak_live_1234567890abcdef'
    ;(api.createApiKey as jest.Mock).mockResolvedValue({
      api_key: { id: '1', name: 'Test Key', key_preview: 'ak_live_••••••••••••••••' },
      full_key: fullKey,
    })

    render(<ApiKeysPage />)

    await waitFor(() => {
      expect(screen.getByText('API Keys')).toBeInTheDocument()
    })

    // Create a key
    await user.click(screen.getByRole('button', { name: /new key/i }))
    await user.type(screen.getByLabelText(/key name/i), 'Test Key')
    await user.click(screen.getByRole('button', { name: /create key/i }))

    await waitFor(() => {
      expect(screen.getByText(/save your api key now/i)).toBeInTheDocument()
    })

    // Acknowledge and close
    await user.click(screen.getByRole('checkbox', { name: /i have copied my key/i }))
    await user.click(screen.getByRole('button', { name: /done/i }))

    // Wait for dialog to close
    await waitFor(() => {
      expect(screen.queryByText(/save your api key now/i)).not.toBeInTheDocument()
    })

    // The full key should no longer be in the document
    expect(screen.queryByText(fullKey)).not.toBeInTheDocument()
  })

  it('allows copying the key before acknowledging', async () => {
    const user = userEvent.setup()
    const fullKey = 'ak_live_1234567890abcdef'
    ;(api.createApiKey as jest.Mock).mockResolvedValue({
      api_key: { id: '1', name: 'Test Key', key_preview: 'ak_live_••••••••••••••••' },
      full_key: fullKey,
    })

    // Mock clipboard API
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    })

    render(<ApiKeysPage />)

    await waitFor(() => {
      expect(screen.getByText('API Keys')).toBeInTheDocument()
    })

    // Create a key
    await user.click(screen.getByRole('button', { name: /new key/i }))
    await user.type(screen.getByLabelText(/key name/i), 'Test Key')
    await user.click(screen.getByRole('button', { name: /create key/i }))

    await waitFor(() => {
      expect(screen.getByText(/save your api key now/i)).toBeInTheDocument()
    })

    // Click the copy button
    await user.click(screen.getByRole('button', { name: /copy api key/i }))

    // Verify clipboard was called
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(fullKey)
  })

  it('shows a manual-copy hint when copying the key fails', async () => {
    const user = userEvent.setup()
    const fullKey = 'ak_live_1234567890abcdef'
    ;(api.createApiKey as jest.Mock).mockResolvedValue({
      api_key: { id: '1', name: 'Test Key', key_preview: 'ak_live_••••••••••••••••' },
      full_key: fullKey,
    })

    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: jest.fn().mockRejectedValue(new Error('Clipboard unavailable')),
      },
      configurable: true,
    })

    render(<ApiKeysPage />)

    await waitFor(() => {
      expect(screen.getByText('API Keys')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /new key/i }))
    await user.type(screen.getByLabelText(/key name/i), 'Test Key')
    await user.click(screen.getByRole('button', { name: /create key/i }))

    await waitFor(() => {
      expect(screen.getByText(/save your api key now/i)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /copy api key/i }))

    expect(
      await screen.findByText('Could not copy the key. Select it and copy it manually.')
    ).toHaveAttribute('role', 'alert')
    expect(screen.getByText(fullKey)).toHaveClass('select-all')
  })

  it('shows clear warning that key will never be shown again', async () => {
    const user = userEvent.setup()
    ;(api.createApiKey as jest.Mock).mockResolvedValue({
      api_key: { id: '1', name: 'Test Key', key_preview: 'ak_live_••••••••••••••••' },
      full_key: 'ak_live_1234567890abcdef',
    })

    render(<ApiKeysPage />)

    await waitFor(() => {
      expect(screen.getByText('API Keys')).toBeInTheDocument()
    })

    // Create a key
    await user.click(screen.getByRole('button', { name: /new key/i }))
    await user.type(screen.getByLabelText(/key name/i), 'Test Key')
    await user.click(screen.getByRole('button', { name: /create key/i }))

    await waitFor(() => {
      expect(screen.getByText(/save your api key now/i)).toBeInTheDocument()
    })

    // Verify warning messages are present
    expect(screen.getByText(/this is the only time you'll see the full key/i)).toBeInTheDocument()
    expect(
      screen.getByText(/once you close this dialog, the key will never be shown again/i)
    ).toBeInTheDocument()
  })
})

describe('ApiKeysPage - listing, revoking and errors', () => {
  const recent = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const key = (overrides: Record<string, unknown> = {}) => ({
    id: 'key-1',
    merchant_id: 'm-1',
    name: 'Production server',
    key_preview: 'ak_live_••••1234',
    created_at: '2026-01-01T00:00:00Z',
    last_used_at: recent,
    revoked_at: null,
    ...overrides,
  })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAuthenticatedSession as jest.Mock).mockReturnValue({ token: 'test-token' })
  })

  it('lists keys and flags revoked, never-used and inactive ones', async () => {
    ;(api.listApiKeys as jest.Mock).mockResolvedValue([
      key(),
      key({ id: 'key-2', name: 'Old CI', revoked_at: '2026-02-01T00:00:00Z' }),
      key({ id: 'key-3', name: 'Unused', last_used_at: null }),
      key({ id: 'key-4', name: 'Dormant', last_used_at: '2020-01-01T00:00:00Z' }),
    ])
    render(<ApiKeysPage />)

    expect(await screen.findByText('Production server')).toBeInTheDocument()
    expect(screen.getByText('Revoked')).toBeInTheDocument()
    expect(screen.getByText('Never used')).toBeInTheDocument()
    expect(screen.getByText('Inactive 90+ days')).toBeInTheDocument()
    // Revoked keys can't be revoked again.
    expect(screen.queryByRole('button', { name: 'Revoke Old CI' })).not.toBeInTheDocument()
  })

  it('revokes a key after confirmation and reloads the list', async () => {
    const user = userEvent.setup()
    ;(api.listApiKeys as jest.Mock)
      .mockResolvedValueOnce([key()])
      .mockResolvedValue([key({ revoked_at: '2026-03-01T00:00:00Z' })])
    ;(api.revokeApiKey as jest.Mock).mockResolvedValue(undefined)
    render(<ApiKeysPage />)

    await user.click(await screen.findByRole('button', { name: 'Revoke Production server' }))
    await user.click(screen.getByRole('button', { name: 'Revoke key' }))

    await waitFor(() => expect(api.revokeApiKey).toHaveBeenCalledWith('test-token', 'key-1'))
    expect(await screen.findByText('Revoked')).toBeInTheDocument()
  })

  it('keeps the list and shows the error when revoking fails', async () => {
    const user = userEvent.setup()
    ;(api.listApiKeys as jest.Mock).mockResolvedValue([key()])
    ;(api.revokeApiKey as jest.Mock).mockRejectedValue(new Error('revoke failed'))
    render(<ApiKeysPage />)

    await user.click(await screen.findByRole('button', { name: 'Revoke Production server' }))
    await user.click(screen.getByRole('button', { name: 'Revoke key' }))

    expect(await screen.findByText('revoke failed')).toBeInTheDocument()
    // The dialog stays open so the user can retry.
    expect(screen.getByRole('button', { name: 'Revoke key' })).toBeEnabled()
  })

  it('shows the load error and retries', async () => {
    const user = userEvent.setup()
    ;(api.listApiKeys as jest.Mock)
      .mockRejectedValueOnce(new Error('cannot load'))
      .mockResolvedValue([key()])
    render(<ApiKeysPage />)

    expect(await screen.findByText('cannot load')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /try again|retry/i }))

    expect(await screen.findByText('Production server')).toBeInTheDocument()
  })

  it('shows the error when creating a key fails', async () => {
    const user = userEvent.setup()
    ;(api.listApiKeys as jest.Mock).mockResolvedValue([])
    ;(api.createApiKey as jest.Mock).mockRejectedValue(new Error('create failed'))
    render(<ApiKeysPage />)

    await user.click(await screen.findByRole('button', { name: /new key/i }))
    await user.type(screen.getByLabelText('Key name'), 'CI')
    await user.click(screen.getByRole('button', { name: 'Create key' }))

    expect(await screen.findByText('create failed')).toBeInTheDocument()
  })
})
