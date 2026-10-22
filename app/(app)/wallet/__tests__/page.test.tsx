import { render, screen, waitFor, fireEvent } from '@testing-library/react'

import WalletPage from '../page'
import { api, ApiError } from '@/lib/api'
import { useAuthenticatedSession } from '@/components/session-provider'
import { useSep24Flow } from '@/hooks/use-sep24-flow'

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api')
  return {
    ...actual,
    api: {
      getMe: jest.fn(),
      getWallet: jest.fn(),
      getBalances: jest.fn(),
      createWallet: jest.fn(),
    },
  }
})

jest.mock('@/components/session-provider', () => ({
  useAuthenticatedSession: jest.fn(),
}))

jest.mock('@/hooks/use-sep24-flow', () => ({
  useSep24Flow: jest.fn(),
}))

// jsdom has no canvas implementation, and rendering the real QR code isn't
// part of this page's contract under test — stub it out.
jest.mock('@/components/wallet/wallet-qr-code', () => ({
  WalletQrCode: () => null,
}))

const mockApi = api as jest.Mocked<typeof api>
const mockUseAuthenticatedSession = useAuthenticatedSession as jest.Mock
const mockUseSep24Flow = useSep24Flow as jest.Mock

const ME = {
  user_id: 'user-1',
  email: 'merchant@example.com',
  name: 'Ada Merchant',
  created_at: '2026-01-01T00:00:00Z',
  merchant_id: 'merchant-1',
  merchant_name: 'Ada Co',
}

const WALLET = {
  id: 'wallet-1',
  merchant_id: 'merchant-1',
  address: 'GABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZ1234',
  network: 'PUBLIC',
  created_at: '2026-01-01T00:00:00Z',
}

describe('WalletPage', () => {
  let writeText: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()

    mockUseAuthenticatedSession.mockReturnValue({
      token: 'test-token',
      userId: 'user-1',
      merchantId: 'merchant-1',
    })

    mockUseSep24Flow.mockReturnValue({
      busy: null,
      error: null,
      startDeposit: jest.fn(),
      startWithdraw: jest.fn(),
    })

    mockApi.getMe.mockResolvedValue(ME)
    mockApi.getBalances.mockResolvedValue([])

    writeText = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(window.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
  })

  it('shows a loading spinner while the wallet is being fetched', async () => {
    let resolveWallet: (value: typeof WALLET) => void = () => {}
    mockApi.getWallet.mockReturnValue(
      new Promise((resolve) => {
        resolveWallet = resolve
      })
    )

    const { container } = render(<WalletPage />)

    expect(container.querySelector('.animate-spin')).toBeInTheDocument()

    resolveWallet(WALLET)
    await waitFor(() =>
      expect(container.querySelector('.animate-spin')).not.toBeInTheDocument()
    )
  })

  it('shows the "set up" state when the wallet API returns 400 (no wallet yet)', async () => {
    mockApi.getWallet.mockRejectedValue(new ApiError('no wallet', 400))

    render(<WalletPage />)

    expect(
      await screen.findByRole('heading', { name: 'Set up your payment address' })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create payment address' })).toBeInTheDocument()
    expect(screen.queryByText(WALLET.address)).not.toBeInTheDocument()
  })

  it('shows the wallet address when the API returns a wallet', async () => {
    mockApi.getWallet.mockResolvedValue(WALLET)

    render(<WalletPage />)

    expect(await screen.findByText(WALLET.address)).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Set up your payment address' })
    ).not.toBeInTheDocument()
  })

  it('copies the address and shows a confirmation when the copy button is clicked', async () => {
    mockApi.getWallet.mockResolvedValue(WALLET)

    render(<WalletPage />)

    const copyButton = await screen.findByRole('button', { name: /copy address/i })
    // `userEvent` installs its own clipboard stub on setup, which would shadow
    // the mock above — `fireEvent` triggers the click without touching
    // `navigator.clipboard`, so our own mock is what the component sees.
    fireEvent.click(copyButton)

    expect(await screen.findByRole('button', { name: /copied/i })).toBeInTheDocument()
    expect(writeText).toHaveBeenCalledWith(WALLET.address)
  })
})
