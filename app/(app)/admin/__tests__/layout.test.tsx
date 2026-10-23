import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminLayout from '@/app/(app)/admin/layout'
import { useSession } from '@/components/session-provider'
import { ApiError } from '@/lib/api'

jest.mock('@/components/session-provider', () => ({
  useSession: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => '/admin',
}))

jest.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    constructor(
      message: string,
      public status: number
    ) {
      super(message)
      this.name = 'ApiError'
    }
  },
}))

describe('AdminLayout', () => {
  const refreshMe = jest.fn()

  // The session provider loads /me once; the layout only reads it.
  function mockSessionState(state: { me?: unknown; meLoading?: boolean; meError?: unknown }) {
    ;(useSession as jest.Mock).mockReturnValue({
      session: { token: 'test-token', user_id: 'user-123', merchant_id: 'merchant-123' },
      ready: true,
      me: null,
      meLoading: false,
      meError: null,
      refreshMe,
      signOut: jest.fn(),
      signIn: jest.fn(),
      signUp: jest.fn(),
      ...state,
    })
  }

  function renderLayout() {
    return render(
      <AdminLayout>
        <div>Admin content</div>
      </AdminLayout>
    )
  }

  beforeEach(() => {
    jest.clearAllMocks()
    refreshMe.mockResolvedValue({ success: true })
  })

  it('shows loading spinner while verifying admin access', () => {
    mockSessionState({ meLoading: true })
    renderLayout()

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows error state when the profile failed to load', () => {
    mockSessionState({ meError: new Error('Network error') })
    renderLayout()

    expect(screen.getByText(/network error/i)).toBeInTheDocument()
  })

  it('retries the profile load from the error state', async () => {
    mockSessionState({ meError: new Error('Network error') })
    renderLayout()

    await userEvent.click(screen.getByRole('button', { name: /try again|retry/i }))

    expect(refreshMe).toHaveBeenCalledTimes(1)
  })

  it('shows admin access required when user is not admin', () => {
    mockSessionState({ me: { user_id: 'user-123', merchant_id: 'merchant-123', is_admin: false } })
    renderLayout()

    expect(screen.getByText(/admin access required/i)).toBeInTheDocument()
    expect(screen.getByText(/back to your dashboard/i)).toBeInTheDocument()
  })

  it('renders admin content when user is admin', () => {
    mockSessionState({ me: { user_id: 'user-123', merchant_id: 'merchant-123', is_admin: true } })
    renderLayout()

    expect(screen.getByText('Admin content')).toBeInTheDocument()
  })

  it('handles network error with specific message', () => {
    mockSessionState({ meError: new ApiError('Network error', 0) })
    renderLayout()

    expect(screen.getByText(/can't reach the payment server right now/i)).toBeInTheDocument()
  })
})
