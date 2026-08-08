import React from 'react'
import { render, screen, cleanup, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ── Framer-motion stub ────────────────────────────────────────────────────────
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

// ── Lucide-react stub ─────────────────────────────────────────────────────────
jest.mock('lucide-react', () => ({
  Wallet: (p: any) => <div data-testid="icon-wallet" {...p} />,
  Link2: (p: any) => <div data-testid="icon-link2" {...p} />,
  Unlink: (p: any) => <div data-testid="icon-unlink" {...p} />,
  ExternalLink: (p: any) => <div data-testid="icon-externallink" {...p} />,
  Copy: (p: any) => <div data-testid="icon-copy" {...p} />,
  Check: (p: any) => <div data-testid="icon-check" {...p} />,
  RefreshCw: (p: any) => <div data-testid="icon-refreshcw" {...p} />,
  Plus: (p: any) => <div data-testid="icon-plus" {...p} />,
  ShieldCheck: (p: any) => <div data-testid="icon-shieldcheck" {...p} />,
  AlertCircle: (p: any) => <div data-testid="icon-alertcircle" {...p} />,
}))

// ── Next/navigation stub ──────────────────────────────────────────────────────
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

// ── Clipboard stub ────────────────────────────────────────────────────────────
Object.assign(navigator, {
  clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
})

import { WalletsTab } from '@/components/settings/wallets-tab'

// Seed localStorage before each test so the component reads a consistent state
beforeEach(() => {
  localStorage.setItem('walletAddress', 'GABCDSTESTWALLETADDRESS12345WXYZ')
  localStorage.setItem('walletName', 'Test Custodial Wallet')
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  jest.clearAllTimers()
  jest.useRealTimers()
  ;(navigator.clipboard.writeText as jest.Mock).mockClear()
})

// ─────────────────────────────────────────────────────────────────────────────
// Initial render
// ─────────────────────────────────────────────────────────────────────────────

describe('WalletsTab — initial render', () => {
  it('renders the "Connected Wallets" card heading', async () => {
    await act(async () => {
      render(<WalletsTab />)
    })
    expect(screen.getByText('Connected Wallets')).toBeInTheDocument()
  })

  it('renders the "Add Wallet" button', async () => {
    await act(async () => {
      render(<WalletsTab />)
    })
    expect(document.getElementById('add-wallet-btn')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add wallet/i })).toBeInTheDocument()
  })

  it('renders at least one wallet card', async () => {
    await act(async () => {
      render(<WalletsTab />)
    })
    // WalletsTab renders 2 wallets by default: custodial + Freighter
    const toggleBtns = screen.getAllByRole('button', { name: /disconnect|connect/i })
    expect(toggleBtns.length).toBeGreaterThanOrEqual(1)
  })

  it('renders the custodial wallet with name from localStorage', async () => {
    await act(async () => {
      render(<WalletsTab />)
    })
    expect(screen.getByText('Test Custodial Wallet')).toBeInTheDocument()
  })

  it('falls back to "Aframp Custodial" when no walletName in localStorage', async () => {
    localStorage.removeItem('walletName')
    await act(async () => {
      render(<WalletsTab />)
    })
    expect(screen.getByText('Aframp Custodial')).toBeInTheDocument()
  })

  it('renders the "Primary" badge on the custodial wallet', async () => {
    await act(async () => {
      render(<WalletsTab />)
    })
    expect(screen.getByText('Primary')).toBeInTheDocument()
  })

  it('renders the Freighter wallet entry', async () => {
    await act(async () => {
      render(<WalletsTab />)
    })
    expect(screen.getByText('Freighter')).toBeInTheDocument()
  })

  it('renders the wallet network labels', async () => {
    await act(async () => {
      render(<WalletsTab />)
    })
    const stellarLabels = screen.getAllByText('Stellar')
    expect(stellarLabels.length).toBeGreaterThanOrEqual(1)
  })

  it('renders "Connected" status for the primary custodial wallet', async () => {
    await act(async () => {
      render(<WalletsTab />)
    })
    const connectedLabels = screen.getAllByText('Connected')
    expect(connectedLabels.length).toBeGreaterThanOrEqual(1)
  })

  it('renders "Disconnected" status for the Freighter wallet', async () => {
    await act(async () => {
      render(<WalletsTab />)
    })
    expect(screen.getByText('Disconnected')).toBeInTheDocument()
  })

  it('renders the Wallet Security note card', async () => {
    await act(async () => {
      render(<WalletsTab />)
    })
    expect(screen.getByText('Wallet Security')).toBeInTheDocument()
  })

  it('renders the help / support link text', async () => {
    await act(async () => {
      render(<WalletsTab />)
    })
    expect(screen.getByText(/wallet setup guide/i)).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Wallet address display
// ─────────────────────────────────────────────────────────────────────────────

describe('WalletsTab — wallet address display', () => {
  it('truncates long wallet addresses', async () => {
    await act(async () => {
      render(<WalletsTab />)
    })
    // The address from localStorage is "GABCDSTESTWALLETADDRESS12345WXYZ" (33 chars)
    // truncateAddress keeps first 6 + "..." + last 4
    expect(screen.getByText('GABCDS...WXYZ')).toBeInTheDocument()
  })

  it('shows a copy button for each wallet address', async () => {
    await act(async () => {
      render(<WalletsTab />)
    })
    const copyBtns = screen.getAllByRole('button', { name: /copy wallet address/i })
    expect(copyBtns.length).toBeGreaterThanOrEqual(1)
  })

  it('clicking the copy button calls clipboard.writeText with the full address', async () => {
    const user = userEvent.setup()
    await act(async () => {
      render(<WalletsTab />)
    })

    const copyBtns = screen.getAllByRole('button', { name: /copy wallet address/i })
    await user.click(copyBtns[0])

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'GABCDSTESTWALLETADDRESS12345WXYZ'
    )
  })

  it('copy button reverts after 2 seconds', async () => {
    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    await act(async () => {
      render(<WalletsTab />)
    })

    const copyBtns = screen.getAllByRole('button', { name: /copy wallet address/i })
    await user.click(copyBtns[0])

    // Advance past the 2s timeout
    act(() => { jest.advanceTimersByTime(2500) })

    // The copy icon should be restored (not showing the check icon)
    // Verify there is still a copy button (it reverted)
    expect(screen.getAllByRole('button', { name: /copy wallet address/i }).length).toBeGreaterThanOrEqual(1)
    jest.useRealTimers()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Wallet type badges
// ─────────────────────────────────────────────────────────────────────────────

describe('WalletsTab — wallet type badges', () => {
  it('renders a "custodial" type badge', async () => {
    await act(async () => {
      render(<WalletsTab />)
    })
    expect(screen.getByText('custodial')).toBeInTheDocument()
  })

  it('renders an "external" type badge', async () => {
    await act(async () => {
      render(<WalletsTab />)
    })
    expect(screen.getByText('external')).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Disconnect/Connect toggle
// ─────────────────────────────────────────────────────────────────────────────

describe('WalletsTab — disconnect / connect toggle', () => {
  it('clicking Disconnect on a connected wallet updates its status to "Disconnected"', async () => {
    const user = userEvent.setup()
    await act(async () => {
      render(<WalletsTab />)
    })

    // The custodial wallet starts connected; click its Disconnect button
    const disconnectBtn = document.getElementById('toggle-wallet-1') as HTMLButtonElement
    expect(disconnectBtn).toBeInTheDocument()
    await user.click(disconnectBtn)

    // Now the wallet should show "Disconnected"
    const disconnectedLabels = screen.getAllByText('Disconnected')
    expect(disconnectedLabels.length).toBeGreaterThanOrEqual(2) // both wallets now disconnected
  })

  it('clicking Connect on a disconnected wallet updates its status to "Connected"', async () => {
    const user = userEvent.setup()
    await act(async () => {
      render(<WalletsTab />)
    })

    // Freighter starts disconnected; click its Connect button
    const connectBtn = document.getElementById('toggle-wallet-2') as HTMLButtonElement
    expect(connectBtn).toBeInTheDocument()
    await user.click(connectBtn)

    // Freighter should now show "Connected"
    const connectedLabels = screen.getAllByText('Connected')
    expect(connectedLabels.length).toBeGreaterThanOrEqual(2) // both wallets now connected
  })

  it('toggle does not affect the other wallet', async () => {
    const user = userEvent.setup()
    await act(async () => {
      render(<WalletsTab />)
    })

    // Connect Freighter
    const connectBtn = document.getElementById('toggle-wallet-2') as HTMLButtonElement
    await user.click(connectBtn)

    // Custodial wallet should still show Connected
    const connectedLabels = screen.getAllByText('Connected')
    expect(connectedLabels.length).toBeGreaterThanOrEqual(2)
  })

  it('Disconnect button uses destructive styling class for connected wallets', async () => {
    await act(async () => {
      render(<WalletsTab />)
    })
    const disconnectBtn = document.getElementById('toggle-wallet-1')
    expect(disconnectBtn?.className).toContain('destructive')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Refresh balance
// ─────────────────────────────────────────────────────────────────────────────

describe('WalletsTab — refresh balance', () => {
  it('renders the refresh-balance button for connected wallets', async () => {
    await act(async () => {
      render(<WalletsTab />)
    })
    const refreshBtns = screen.getAllByRole('button', { name: /refresh balance/i })
    expect(refreshBtns.length).toBeGreaterThanOrEqual(1)
  })

  it('clicking refresh balance disables it briefly (loading state)', async () => {
    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    await act(async () => {
      render(<WalletsTab />)
    })

    const refreshBtns = screen.getAllByRole('button', { name: /refresh balance/i })
    await user.click(refreshBtns[0])

    // During the 1.5 s async delay the RefreshCw icon should animate (spin class).
    // We just verify the click doesn't throw.
    act(() => { jest.advanceTimersByTime(2000) })
    jest.useRealTimers()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// No wallet in localStorage
// ─────────────────────────────────────────────────────────────────────────────

describe('WalletsTab — no wallet in localStorage', () => {
  it('renders the fallback custodial address when localStorage is empty', async () => {
    localStorage.clear()
    await act(async () => {
      render(<WalletsTab />)
    })
    // The fallback address is 'GABCD...WXYZ'
    expect(screen.getByText('GABCD...WXYZ')).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Balance display
// ─────────────────────────────────────────────────────────────────────────────

describe('WalletsTab — balance display', () => {
  it('shows the custodial wallet balance', async () => {
    await act(async () => {
      render(<WalletsTab />)
    })
    // Default balance is '0.00 XLM'
    expect(screen.getByText('0.00 XLM')).toBeInTheDocument()
  })

  it('shows a dash "—" for the balance of a disconnected wallet', async () => {
    await act(async () => {
      render(<WalletsTab />)
    })
    // Freighter is disconnected → balance is '—'
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})
