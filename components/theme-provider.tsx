'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from 'next-themes'

// Colors come from the oklch tokens in app/globals.css (toggled by the `dark`
// class). Do not write theme CSS variables inline on <html>: that overrides
// those tokens (e.g. --muted / --accent).
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      {...props}
      attribute="class"
      enableSystem
      defaultTheme="system"
      storageKey="theme"
    >
      {children}
    </NextThemesProvider>
  )
}
