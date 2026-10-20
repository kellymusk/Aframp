import { act, render, screen } from '@testing-library/react'
import { WalletSidebar } from '@/components/wallet/wallet-sidebar'
import { useSession } from '@/components/session-provider'
import { useStellarStatus } from '@/hooks/use-stellar-status'
import { usePathname, useRouter } from 'next/navigation'

jest.mock('@/components/session-provider', () => ({
  useSession: jest.fn(),
}))

jest.mock('@/hooks/use-stellar-status', () => ({
  useStellarStatus: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(),
}))

describe('WalletSidebar', () => {
  const signOut = jest.fn()
  const replace = jest.fn()
  const refreshMe = jest.fn()

  beforeEach(() => {
    signOut.mockReset()
    replace.mockReset()
    refreshMe.mockReset().mockResolvedValue(undefined)
    ;(useRouter as jest.Mock).mockReturnValue({ replace })
    ;(useSession as jest.Mock).mockReturnValue({
      session: { token: 't', user_id: 'u', merchant_id: 'm' },
      ready: true,
      me: undefined,
      refreshMe,
      signOut,
      signIn: jest.fn(),
      signUp: jest.fn(),
    })
    ;(useStellarStatus as jest.Mock).mockReturnValue({
      status: 'operational',
      description: 'All systems operational',
    })
  })

  async function renderSidebar() {
    await act(async () => {
      render(<WalletSidebar />)
    })
  }

  it('highlights Home nav item when on home route', async () => {
    ;(usePathname as jest.Mock).mockReturnValue('/home')
    await renderSidebar()

    const homeLink = screen.getByRole('link', { name: /home/i })
    expect(homeLink).toHaveClass('bg-nav-active', 'font-bold', 'text-white')
  })

  it('highlights Cash Out nav item when on withdraw route', async () => {
    ;(usePathname as jest.Mock).mockReturnValue('/withdraw')
    await renderSidebar()

    const cashOutLink = screen.getByRole('link', { name: /cash out/i })
    expect(cashOutLink).toHaveClass('bg-nav-active', 'font-bold', 'text-white')
  })

  it('highlights Send nav item when on send route', async () => {
    ;(usePathname as jest.Mock).mockReturnValue('/send')
    await renderSidebar()

    const sendLink = screen.getByRole('link', { name: /send money/i })
    expect(sendLink).toHaveClass('bg-nav-active', 'font-bold', 'text-white')
  })

  it('highlights Transactions nav item when on transactions route', async () => {
    ;(usePathname as jest.Mock).mockReturnValue('/transactions')
    await renderSidebar()

    const transactionsLink = screen.getByRole('link', { name: /payments/i })
    expect(transactionsLink).toHaveClass('bg-nav-active', 'font-bold', 'text-white')
  })

  it('highlights nav item when on nested route', async () => {
    ;(usePathname as jest.Mock).mockReturnValue('/transactions/details')
    await renderSidebar()

    const transactionsLink = screen.getByRole('link', { name: /payments/i })
    expect(transactionsLink).toHaveClass('bg-nav-active', 'font-bold', 'text-white')
  })

  it('does not highlight inactive nav items', async () => {
    ;(usePathname as jest.Mock).mockReturnValue('/home')
    await renderSidebar()

    const sendLink = screen.getByRole('link', { name: /send money/i })
    expect(sendLink).not.toHaveClass('bg-nav-active', 'font-bold', 'text-white')
    expect(sendLink).toHaveClass('text-dim')
  })
})
