import type React from 'react'
import type { Metadata, Viewport } from 'next'
import { Atkinson_Hyperlegible } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { SessionProvider } from '@/components/session-provider'
import './globals.css'

// The Aframp brand typeface — picked for legibility at small sizes,
// which is what the balance and rate figures need.
const atkinson = Atkinson_Hyperlegible({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-atkinson',
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
    <html lang="en" className={atkinson.variable} suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider>{children}</SessionProvider>
        </ThemeProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.error('SW registration failed:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}