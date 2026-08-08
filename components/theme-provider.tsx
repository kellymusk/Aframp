'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  useTheme,
  type ThemeProviderProps,
} from 'next-themes'

const ROOT_CSS_VARS: Record<string, { light: string; dark: string }> = {
  'bg': { light: '#ffffff', dark: '#0b1220' },
  'text': { light: '#0b1220', dark: '#e6eef8' },
  'muted': { light: '#6b7280', dark: '#9aa4b2' },
  'accent': { light: '#0ea5e9', dark: '#38bdf8' },
}

function ThemeCustomProps() {
  const { resolvedTheme } = useTheme() as { resolvedTheme?: string }

  React.useEffect(() => {
    const theme = resolvedTheme ?? 'light'
    Object.entries(ROOT_CSS_VARS).forEach(([name, val]) => {
      const value = theme === 'dark' ? val.dark : val.light
      try {
        document.documentElement.style.setProperty(`--${name}`, value)
      } catch (e) {
        // ignore in non-DOM environments
      }
    })
  }, [resolvedTheme])

  return null
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      {...props}
      attribute="class"
      enableSystem
      defaultTheme="system"
      storageKey="theme"
    >
      <ThemeCustomProps />
      {children}
    </NextThemesProvider>
  )
}
