import type { Metadata } from 'next'
import type React from 'react'
import { AppShell } from './app-shell'

// Everything in this group is behind auth; keep it out of search results.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
