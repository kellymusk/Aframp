'use client'

import { useTheme } from 'next-themes'
import { Monitor, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'

/**
 * Cycles through: system → light → dark → system …
 * - Reads `resolvedTheme` for the icon so it always reflects the actual rendered theme.
 * - `aria-label` is dynamic so screen readers announce the *next* action.
 * - Renders a placeholder on the server to avoid hydration mismatch.
 */
export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" aria-label="Toggle theme">
        <span className="sr-only">Toggle theme</span>
      </Button>
    )
  }

  function nextTheme() {
    if (theme === 'system') return 'light'
    if (theme === 'light') return 'dark'
    return 'system'
  }

  function ariaLabel() {
    if (theme === 'system') return 'Switch to light theme'
    if (theme === 'light') return 'Switch to dark theme'
    return 'Switch to system theme'
  }

  const Icon =
    theme === 'system'
      ? Monitor
      : resolvedTheme === 'dark'
        ? Sun
        : Moon

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
      onClick={() => setTheme(nextTheme())}
      aria-label={ariaLabel()}
    >
      <Icon className="h-5 w-5" />
    </Button>
  )
}
