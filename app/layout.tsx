import type React from 'react'
import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
import { Atkinson_Hyperlegible } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { SessionProvider } from '@/components/session-provider'
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

// Absolute base for Open Graph/Twitter image URLs. Without it, Next.js falls
// back to its own default (the production URL on Vercel).
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim()

export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  icons: { icon: '/icons/icon.svg', apple: '/icons/icon.svg' },
  title: 'Aframp — Pay, Send & Buy Crypto in Africa',
  description:
    "Buy crypto from as low as 2,000 cNGN. Pay bills, send money, and grow your business with Africa's first stablecoin payment platform.",
  keywords: ['Aframp', 'cNGN', 'Stellar', 'Nigeria', 'crypto', 'payments', 'stablecoin'],
  generator: 'Next.js',
}

export const viewport: Viewport = {
  themeColor: '#10b981',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Read the nonce injected by middleware.ts so we can apply it to the inline
  // service-worker registration script, satisfying the nonce-based CSP (#632).
  const headersList = await headers()
  const nonce = headersList.get('x-nonce') ?? undefined

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
          <InstallPromptBanner />
        </ThemeProvider>
        <script
          nonce={nonce}
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
