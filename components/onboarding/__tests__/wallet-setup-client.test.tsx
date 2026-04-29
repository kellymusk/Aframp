import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WalletSetupClient } from '../wallet-setup-client'
import { useRouter } from 'next/navigation'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
}))

describe('WalletSetupClient', () => {
  const mockPush = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })
  })

  it('renders the wallet setup screen', () => {
    render(<WalletSetupClient />)

    expect(screen.getByText('Wallet Setup')).toBeInTheDocument()
    expect(screen.getByText('Secure Digital Wallet')).toBeInTheDocument()
    expect(screen.getByText('Your security is our priority')).toBeInTheDocument()
  })

  it('displays progress indicator', () => {
    render(<WalletSetupClient />)

    expect(screen.getByText('Step 3 of 4')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('shows reveal button initially', () => {
    render(<WalletSetupClient />)

    expect(screen.getByText('Reveal Recovery Phrase')).toBeInTheDocument()
  })

  it('reveals recovery phrase when reveal button is clicked', async () => {
    render(<WalletSetupClient />)

    const revealButton = screen.getByText('Reveal Recovery Phrase')
    fireEvent.click(revealButton)

    await waitFor(() => {
      expect(screen.getByText('Hide')).toBeInTheDocument()
      expect(screen.getByText('Copy')).toBeInTheDocument()
    })
  })

  it('displays security warning', () => {
    render(<WalletSetupClient />)

    expect(screen.getByText(/Never share your recovery phrase with anyone/i)).toBeInTheDocument()
    expect(screen.getByText(/Aframp will never ask for this phrase/i)).toBeInTheDocument()
  })

  it('has acknowledgment checkbox', () => {
    render(<WalletSetupClient />)

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeInTheDocument()
    expect(checkbox).not.toBeChecked()
  })

  it('continue button is disabled when phrase is not revealed', () => {
    render(<WalletSetupClient />)

    const continueButton = screen.getByText('Continue')
    expect(continueButton).toBeDisabled()
  })

  it('shows warning modal when continuing without acknowledgment', async () => {
    render(<WalletSetupClient />)

    // Reveal the phrase
    const revealButton = screen.getByText('Reveal Recovery Phrase')
    fireEvent.click(revealButton)

    await waitFor(() => {
      expect(screen.getByText('Continue')).not.toBeDisabled()
    })

    // Click continue without checking the box
    const continueButton = screen.getByText('Continue')
    fireEvent.click(continueButton)

    await waitFor(() => {
      expect(screen.getByText(/Warning: Recovery Phrase Not Saved/i)).toBeInTheDocument()
    })
  })

  it('navigates to dashboard when acknowledged and continued', async () => {
    render(<WalletSetupClient />)

    // Reveal the phrase
    const revealButton = screen.getByText('Reveal Recovery Phrase')
    fireEvent.click(revealButton)

    await waitFor(() => {
      expect(screen.getByText('Continue')).not.toBeDisabled()
    })

    // Check the acknowledgment box
    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)

    // Click continue
    const continueButton = screen.getByText('Continue')
    fireEvent.click(continueButton)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })
})
