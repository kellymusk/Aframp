import { render, screen } from '@testing-library/react'

import { MobileBottomNav } from '@/components/wallet/mobile-bottom-nav'

const mockUsePathname = jest.fn()

jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}))

describe('MobileBottomNav', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/home')
  })

  it('renders a tab for each destination with an accessible label', () => {
    render(<MobileBottomNav />)

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/home')
    expect(screen.getByRole('link', { name: 'Payments' })).toHaveAttribute('href', '/transactions')
    expect(screen.getByRole('link', { name: 'Wallet' })).toHaveAttribute('href', '/wallet')
    expect(screen.getByRole('link', { name: 'Cash out' })).toHaveAttribute('href', '/withdraw')
  })

  it('marks only the tab matching the current route as active', () => {
    mockUsePathname.mockReturnValue('/transactions')
    render(<MobileBottomNav />)

    expect(screen.getByRole('link', { name: 'Payments' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current')
  })

  it('treats nested routes under a tab href as active', () => {
    mockUsePathname.mockReturnValue('/withdraw/confirm')
    render(<MobileBottomNav />)

    expect(screen.getByRole('link', { name: 'Cash out' })).toHaveAttribute('aria-current', 'page')
  })

  it('is hidden on desktop and only shown below the md breakpoint', () => {
    render(<MobileBottomNav />)

    expect(screen.getByRole('navigation', { name: 'Primary' })).toHaveClass('md:hidden')
  })
})
