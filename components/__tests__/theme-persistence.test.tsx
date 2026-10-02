import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useTheme } from 'next-themes'
import { ThemeProvider } from '@/components/theme-provider'
import { ThemeToggle } from '@/components/theme-toggle'

function ActiveTheme() {
  const { theme } = useTheme()
  return <output data-testid="active-theme">{theme}</output>
}

describe('theme preference persistence', () => {
  beforeEach(() => {
    localStorage.clear()
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }))
  })

  it('restores the selected theme after the provider is remounted', async () => {
    const user = userEvent.setup()
    const { unmount } = render(
      <ThemeProvider>
        <ThemeToggle />
        <ActiveTheme />
      </ThemeProvider>
    )

    await user.click(await screen.findByRole('button', { name: 'Switch to light theme' }))
    await waitFor(() => expect(localStorage.getItem('theme')).toBe('light'))
    unmount()

    render(
      <ThemeProvider>
        <ActiveTheme />
      </ThemeProvider>
    )

    expect(await screen.findByTestId('active-theme')).toHaveTextContent('light')
  })
})