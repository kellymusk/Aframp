import { render, screen } from '@testing-library/react'
import { SiteNav } from '../site-nav'
import { useSession } from '@/components/session-provider'

jest.mock('@/components/session-provider', () => ({
  useSession: jest.fn(),
}))

jest.mock('@/components/theme-toggle', () => ({
  ThemeToggle: () => <button type="button">Theme</button>,
}))

describe('SiteNav', () => {
  it('offers sign-up and login to visitors', () => {
    ;(useSession as jest.Mock).mockReturnValue({ session: null, ready: true })
    render(<SiteNav />)

    expect(screen.getByRole('link', { name: 'Get Started' })).toHaveAttribute('href', '/signup')
    expect(screen.getByRole('link', { name: 'Login' })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: 'FAQs' })).toHaveAttribute('href', '#faq')
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument()
  })

  it('takes signed-in merchants straight to the app', () => {
    ;(useSession as jest.Mock).mockReturnValue({ session: { token: 't' }, ready: true })
    render(<SiteNav />)

    expect(screen.getByRole('link', { name: 'Open App' })).toHaveAttribute('href', '/home')
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/home')
    expect(screen.queryByRole('link', { name: 'Login' })).not.toBeInTheDocument()
  })

  it('treats the session as signed out until it has been restored', () => {
    ;(useSession as jest.Mock).mockReturnValue({ session: { token: 't' }, ready: false })
    render(<SiteNav />)
    expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument()
  })
})
