import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SiteNav } from './site-nav'

jest.mock('@/components/session-provider', () => ({
  useSession: () => ({ session: null, ready: true }),
}))

jest.mock('@/components/theme-toggle', () => ({
  ThemeToggle: () => <button type="button">Theme</button>,
}))

describe('SiteNav mobile menu', () => {
  it('moves focus into the drawer, traps keyboard focus, and restores focus on Escape', async () => {
    const user = userEvent.setup()
    render(<SiteNav />)

    const openButton = screen.getByRole('button', { name: 'Open menu' })
    await user.click(openButton)

    const dialog = screen.getByRole('dialog', { name: 'Menu' })
    const firstLink = within(dialog).getByRole('link', { name: 'About' })
    expect(firstLink).toHaveFocus()

    await user.tab({ shift: true })
    expect(within(dialog).getByRole('button', { name: 'Close' })).toHaveFocus()

    await user.tab()
    expect(firstLink).toHaveFocus()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument())
    expect(openButton).toHaveFocus()
  })
})
