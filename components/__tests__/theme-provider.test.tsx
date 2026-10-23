import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useTheme } from 'next-themes'
import { ThemeProvider } from '@/components/theme-provider'

function ThemePreferenceButton() {
  const { setTheme } = useTheme()
  return <button onClick={() => setTheme('light')}>Choose light theme</button>
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
  })

  it('persists a selected theme and reapplies it after remount', async () => {
    const user = userEvent.setup()
    const firstMount = render(
      <ThemeProvider>
        <ThemePreferenceButton />
      </ThemeProvider>
    )

    await user.click(screen.getByRole('button', { name: 'Choose light theme' }))
    await waitFor(() => expect(localStorage.getItem('theme')).toBe('light'))
    firstMount.unmount()
    document.documentElement.className = ''

    render(
      <ThemeProvider>
        <ThemePreferenceButton />
      </ThemeProvider>
    )

    await waitFor(() => expect(document.documentElement).toHaveClass('light'))
  })
})
