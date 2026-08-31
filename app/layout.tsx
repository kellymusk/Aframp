import type React from 'react'
import type { Metadata, Viewport } from 'next'
import { Atkinson_Hyperlegible, Manrope, Outfit, Space_Mono } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { SessionProvider } from '@/components/session-provider'
import { DemoModeProvider } from '@/components/demo-mode-provider'
import { InstallPromptBanner } from '@/components/pwa/install-prompt-banner'
import './globals.css'

// The Aframp brand typeface — picked for legibility at small sizes,
// which is what the balance and rate figures need.
const atkinson = Atkinson_Hyperlegible({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-atkinson',
  display: 'swap',
})

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Aframp — Pay, Send & Buy Crypto in Africa',
  description:
    "Buy crypto from as low as 2,000 cNGN. Pay bills, send money, and grow your business with Africa's first stablecoin payment platform.",
  keywords: ['Aframp', 'cNGN', 'Stellar', 'Nigeria', 'crypto', 'payments', 'stablecoin'],
  generator: 'Next.js',
}

export const viewport: Viewport = {
  themeColor: '#10b981',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${atkinson.variable} ${manrope.variable} ${outfit.variable} ${spaceMono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <DemoModeProvider>
            <SessionProvider>
              {children}
              <InstallPromptBanner />
            </SessionProvider>
          </DemoModeProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
