import React from 'react'
import { render, waitFor, cleanup } from '@testing-library/react'

jest.mock('next-themes', () => {
  return {
    __esModule: true,
    ThemeProvider: ({ children }: any) => <div>{children}</div>,
    useTheme: jest.fn(),
  }
})

import { ThemeProvider } from '../theme-provider'
import { useTheme } from 'next-themes'

afterEach(() => {
  cleanup()
  // remove any css vars we set
  ;['bg', 'text', 'muted', 'accent'].forEach((k) =>
    document.documentElement.style.removeProperty(`--${k}`),
  )
})

test('applies dark CSS custom properties when theme is dark', async () => {
  ;(useTheme as jest.Mock).mockReturnValue({ resolvedTheme: 'dark' })

  render(
    <ThemeProvider>
      <div>child</div>
    </ThemeProvider>,
  )

  await waitFor(() => {
    expect(getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()).toBe('#0b1220')
    expect(getComputedStyle(document.documentElement).getPropertyValue('--text').trim()).toBe('#e6eef8')
  })
})

test('applies light CSS custom properties when theme is light', async () => {
  ;(useTheme as jest.Mock).mockReturnValue({ resolvedTheme: 'light' })

  render(
    <ThemeProvider>
      <div>child</div>
    </ThemeProvider>,
  )

  await waitFor(() => {
    expect(getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()).toBe('#ffffff')
    expect(getComputedStyle(document.documentElement).getPropertyValue('--text').trim()).toBe('#0b1220')
  })
})
