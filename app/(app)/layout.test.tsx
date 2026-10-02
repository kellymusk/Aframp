import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import AppLayout from './layout'
import { useSession } from '@/components/session-provider'
import { usePathname, useRouter } from 'next/navigation'

jest.mock('@/components/session-provider', () => ({
  useSession: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}))

jest.mock('@/components/wallet/wallet-sidebar', () => ({
  WalletSidebar: () => <nav aria-label="Merchant navigation" />,
}))

const session = { token: 't', userId: 'u', merchantId: 'm' }

beforeEach(() => {
  ;(useRouter as jest.Mock).mockReturnValue({ replace: jest.fn() })
  ;(usePathname as jest.Mock).mockReturnValue('/home')
})

describe('AppLayout', () => {
  it('redirects to /login exactly once when ready becomes true and no session exists', () => {
    const replace = jest.fn()
    ;(useRouter as jest.Mock).mockReturnValue({ replace })
    ;(useSession as jest.Mock).mockReturnValue({ session: null, ready: false })

    const { rerender } = render(<AppLayout>content</AppLayout>)

    ;(useSession as jest.Mock).mockReturnValue({ session: null, ready: true })
    rerender(<AppLayout>content</AppLayout>)

    expect(replace).toHaveBeenCalledTimes(1)
    expect(replace).toHaveBeenCalledWith('/login')
  })

  it('renders the merchant navigation around merchant pages', () => {
    ;(useSession as jest.Mock).mockReturnValue({ session, ready: true })
    render(<AppLayout>page content</AppLayout>)

    expect(screen.getByRole('navigation', { name: 'Merchant navigation' })).toBeInTheDocument()
    expect(screen.getByText('page content')).toBeInTheDocument()
  })

  it('leaves navigation to the admin layout on admin pages', () => {
    ;(useSession as jest.Mock).mockReturnValue({ session, ready: true })
    ;(usePathname as jest.Mock).mockReturnValue('/admin/users')
    render(<AppLayout>admin content</AppLayout>)

    expect(
      screen.queryByRole('navigation', { name: 'Merchant navigation' })
    ).not.toBeInTheDocument()
    expect(screen.getByText('admin content')).toBeInTheDocument()
  })
})
