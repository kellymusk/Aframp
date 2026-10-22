import { render, screen } from '@testing-library/react'

import AppLayout from '../layout'
import { useSession } from '@/components/session-provider'
import { useRouter, usePathname } from 'next/navigation'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}))

jest.mock('@/components/session-provider', () => ({
  useSession: jest.fn(),
}))

const mockUseSession = useSession as jest.Mock
const mockUseRouter = useRouter as jest.Mock
const mockUsePathname = usePathname as jest.Mock

describe('AppLayout skip-to-main-content link (#476)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue({ replace: jest.fn(), push: jest.fn() })
    mockUsePathname.mockReturnValue('/home')
    mockUseSession.mockReturnValue({
      session: { token: 't', userId: 'u', merchantId: 'm' },
      ready: true,
      signOut: jest.fn(),
    })
  })

  it('renders a visually-hidden skip link targeting #main-content as the first focusable element', () => {
    render(
      <AppLayout>
        <p>Page content</p>
      </AppLayout>
    )

    const skipLink = screen.getByRole('link', { name: 'Skip to main content' })
    expect(skipLink).toHaveAttribute('href', '#main-content')
    expect(skipLink.className).toMatch(/\bsr-only\b/)
    expect(skipLink.className).toMatch(/focus:not-sr-only/)

    // First focusable element: nothing focusable appears before it in the DOM.
    const focusable = screen
      .getAllByRole('link')
      .concat(screen.queryAllByRole('button'))
    expect(focusable[0]).toBe(skipLink)
  })

  it('targets a main element with id="main-content"', () => {
    render(
      <AppLayout>
        <p>Page content</p>
      </AppLayout>
    )

    const main = document.getElementById('main-content')
    expect(main).not.toBeNull()
    expect(main?.tagName).toBe('MAIN')
    expect(screen.getByText('Page content')).toBeInTheDocument()
  })

  it('does not render the skip link (or sidebar) while the session is not ready', () => {
    mockUseSession.mockReturnValue({ session: null, ready: false, signOut: jest.fn() })

    render(
      <AppLayout>
        <p>Page content</p>
      </AppLayout>
    )

    expect(screen.queryByRole('link', { name: 'Skip to main content' })).not.toBeInTheDocument()
  })
})
