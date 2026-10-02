import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WalletPage from '../page'
import { api, ApiError } from '@/lib/api'

// Mock dependencies
jest.mock('@/components/session-provider', () => ({
  useAuthenticatedSession: () => ({
    token: 'test-token',
    userId: 'user-1',
    merchantId: 'merchant-1',
  }),
  useSession: () => ({
    me: {
      user_id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      merchant_name: 'Test Merchant',
      is_admin: false,
      created_at: '2024-01-01T00:00:00Z',
      merchant_id: 'merchant-1',
    },
  }),
}))

jest.mock('@/lib/api', () => ({
  api: {
    getWallet: jest.fn(),
    getBalances: jest.fn(),
    createWallet: jest.fn(),
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

// Clipboard mock. setupUser() installs its own clipboard stub, so
// re-install ours after every setup.
const clipboardWriteText = jest.fn()
function installClipboard() {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: clipboardWriteText },
    configurable: true,
  })
}
function setupUser(options?: Parameters<typeof userEvent.setup>[0]) {
  const user = userEvent.setup(options)
  installClipboard()
  return user
}

describe('WalletPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    clipboardWriteText.mockResolvedValue(undefined)
    installClipboard()
  })

  const mockWallet = {
    id: 'wallet-1',
    merchant_id: 'merchant-1',
    address: 'GTEST123EXAMPLEADDRESS456',
    network: 'stellar',
    created_at: '2024-01-01T00:00:00Z',
  }

  const mockBalances = [
    {
      merchant_id: 'merchant-1',
      asset: 'XLM',
      available: 1000000000n,
      pending: 500000000n,
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      merchant_id: 'merchant-1',
      asset: 'cNGN',
      available: 5000000000n,
      pending: 0n,
      updated_at: '2024-01-01T00:00:00Z',
    },
  ]

  describe('Loading state', () => {
    it('shows loading spinner initially', () => {
      ;(api.getWallet as jest.Mock).mockImplementation(() => new Promise(() => {}))
      ;(api.getBalances as jest.Mock).mockImplementation(() => new Promise(() => {}))

      render(<WalletPage />)

      expect(screen.getByRole('status')).toBeInTheDocument()
    })
  })

  describe('Wallet exists', () => {
    it('displays wallet address and balances', async () => {
      ;(api.getWallet as jest.Mock).mockResolvedValue(mockWallet)
      ;(api.getBalances as jest.Mock).mockResolvedValue(mockBalances)

      render(<WalletPage />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Wallet' })).toBeInTheDocument()
        expect(screen.getByText('Test Merchant · test@example.com')).toBeInTheDocument()
        expect(screen.getByText(mockWallet.address)).toBeInTheDocument()
      })

      expect(screen.getByText(/balances/i)).toBeInTheDocument()
    })

    it('copies address to clipboard successfully', async () => {
      const user = setupUser()
      ;(api.getWallet as jest.Mock).mockResolvedValue(mockWallet)
      ;(api.getBalances as jest.Mock).mockResolvedValue(mockBalances)

      render(<WalletPage />)

      await waitFor(() => {
        expect(screen.getByText(mockWallet.address)).toBeInTheDocument()
      })

      const copyButton = screen.getByRole('button', { name: /copy address/i })
      await user.click(copyButton)

      expect(clipboardWriteText).toHaveBeenCalledWith(mockWallet.address)

      await waitFor(() => {
        expect(screen.getByText(/copied/i)).toBeInTheDocument()
      })
    })

    it('shows error when clipboard write fails', async () => {
      const user = setupUser()
      clipboardWriteText.mockRejectedValue(new Error('Clipboard permission denied'))
      ;(api.getWallet as jest.Mock).mockResolvedValue(mockWallet)
      ;(api.getBalances as jest.Mock).mockResolvedValue(mockBalances)

      render(<WalletPage />)

      await waitFor(() => {
        expect(screen.getByText(mockWallet.address)).toBeInTheDocument()
      })

      const copyButton = screen.getByRole('button', { name: /copy address/i })
      await user.click(copyButton)

      await waitFor(() => {
        expect(
          screen.getByText(/could not copy — please select and copy the address manually/i)
        ).toBeInTheDocument()
      })
    })

    it('resets copied state after 2 seconds', async () => {
      jest.useFakeTimers()
      const user = setupUser({ delay: null })
      ;(api.getWallet as jest.Mock).mockResolvedValue(mockWallet)
      ;(api.getBalances as jest.Mock).mockResolvedValue(mockBalances)

      render(<WalletPage />)

      await waitFor(() => {
        expect(screen.getByText(mockWallet.address)).toBeInTheDocument()
      })

      const copyButton = screen.getByRole('button', { name: /copy address/i })
      await user.click(copyButton)

      await waitFor(() => {
        expect(screen.getByText(/copied/i)).toBeInTheDocument()
      })

      jest.advanceTimersByTime(2000)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /copy address/i })).toBeInTheDocument()
        expect(screen.queryByText(/copied/i)).not.toBeInTheDocument()
      })

      jest.useRealTimers()
    })
  })

  describe('No wallet yet', () => {
    it('shows create wallet prompt when wallet does not exist', async () => {
      ;(api.getWallet as jest.Mock).mockRejectedValue(new ApiError('No wallet found', 400))
      ;(api.getBalances as jest.Mock).mockResolvedValue([])

      render(<WalletPage />)

      await waitFor(() => {
        expect(screen.getByText(/set up your payment address/i)).toBeInTheDocument()
      })

      expect(screen.getByRole('button', { name: /create payment address/i })).toBeInTheDocument()
    })

    it('creates wallet when button is clicked', async () => {
      const user = setupUser()
      ;(api.getWallet as jest.Mock).mockRejectedValueOnce(new ApiError('No wallet found', 400))
      ;(api.createWallet as jest.Mock).mockResolvedValue(mockWallet)
      ;(api.getBalances as jest.Mock).mockResolvedValue([])

      render(<WalletPage />)

      await waitFor(() => {
        expect(screen.getByText(/set up your payment address/i)).toBeInTheDocument()
      })

      const createButton = screen.getByRole('button', { name: /create payment address/i })
      await user.click(createButton)

      expect(api.createWallet).toHaveBeenCalledWith('test-token', expect.anything())

      await waitFor(() => {
        expect(screen.getByText(mockWallet.address)).toBeInTheDocument()
      })
    })

    it('shows error when wallet creation fails', async () => {
      const user = setupUser()
      ;(api.getWallet as jest.Mock).mockRejectedValue(new ApiError('No wallet found', 400))
      ;(api.createWallet as jest.Mock).mockRejectedValue(new Error('Creation failed'))
      ;(api.getBalances as jest.Mock).mockResolvedValue([])

      render(<WalletPage />)

      await waitFor(() => {
        expect(screen.getByText(/set up your payment address/i)).toBeInTheDocument()
      })

      const createButton = screen.getByRole('button', { name: /create payment address/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(screen.getByText(/creation failed/i)).toBeInTheDocument()
      })
    })
  })

  describe('Error handling', () => {
    it('shows backend-down error for status 0', async () => {
      ;(api.getWallet as jest.Mock).mockRejectedValue(new ApiError('Connection failed', 0))
      ;(api.getBalances as jest.Mock).mockResolvedValue([])

      render(<WalletPage />)

      await waitFor(() => {
        expect(screen.getByText(/can't connect to the payment server/i)).toBeInTheDocument()
      })
    })

    it('shows generic error for other failures', async () => {
      ;(api.getWallet as jest.Mock).mockRejectedValue(new Error('Unexpected error'))
      ;(api.getBalances as jest.Mock).mockResolvedValue([])

      render(<WalletPage />)

      await waitFor(() => {
        expect(screen.getByText(/unexpected error/i)).toBeInTheDocument()
      })
    })

    it('continues to show wallet even if balances fail to load', async () => {
      ;(api.getWallet as jest.Mock).mockResolvedValue(mockWallet)
      ;(api.getBalances as jest.Mock).mockRejectedValue(new Error('Balance fetch failed'))

      render(<WalletPage />)

      await waitFor(() => {
        expect(screen.getByText(mockWallet.address)).toBeInTheDocument()
      })

      // Balance section should not appear
      expect(screen.queryByText(/balances/i)).not.toBeInTheDocument()
    })
  })
})
