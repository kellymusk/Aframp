import { fireEvent, render, screen } from '@testing-library/react'
import { Home, Settings } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { NavShell, isActive, type NavLink } from '../nav-shell'

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

const links: NavLink[] = [
  { label: 'Overview', icon: Home, href: '/admin', exact: true },
  { label: 'Settings', icon: Settings, href: '/admin/settings' },
]

function renderShell() {
  return render(<NavShell subtitle="Admin dashboard" links={links} footer={<p>footer</p>} />)
}

beforeEach(() => {
  ;(usePathname as jest.Mock).mockReturnValue('/admin/settings')
})

describe('isActive', () => {
  it('matches nested routes unless the link is exact', () => {
    expect(isActive('/admin/settings/keys', links[1])).toBe(true)
    expect(isActive('/admin/settings', links[0])).toBe(false)
    expect(isActive('/admin', links[0])).toBe(true)
  })
})

describe('NavShell', () => {
  it('marks only the current page as active', () => {
    renderShell()
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current')
  })

  it('shows the current page name in the mobile top bar', () => {
    renderShell()
    const button = screen.getByRole('button', { name: 'Open menu' })
    expect(button.parentElement).toHaveTextContent('Settings')
  })

  it('opens the menu drawer and closes it with Escape or the backdrop', () => {
    renderShell()

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    const dialog = screen.getByRole('dialog', { name: 'Menu' })
    expect(dialog).toHaveTextContent('Admin dashboard')
    // Links are rendered once (in the drawer), not twice.
    expect(screen.getAllByRole('link', { name: 'Settings' })).toHaveLength(1)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Close menu' })[0])
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes the drawer after navigating', () => {
    const { rerender } = renderShell()
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    ;(usePathname as jest.Mock).mockReturnValue('/admin')
    rerender(<NavShell subtitle="Admin dashboard" links={links} footer={<p>footer</p>} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
