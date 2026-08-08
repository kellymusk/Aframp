import type React from 'react'
import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import CookieConsentBanner from '@/components/CookieConsentBanner'
import { ThemeProvider } from '@/components/theme-provider'
import OfflineBoundary from '@/components/error/OfflineBoundary'
import { KycProvider } from '@/contexts/kyc-context'
import { NotificationProvider } from '@/contexts/notification-context'
import { PwaUpdateBanner } from '@/components/pwa-update-banner'
import './globals.css'

export const metadata: Metadata = {
  title: 'Aframp - Buy Crypto, Pay Bills & Send Money in Africa',
  description:
    "Africa's premier cNGN stablecoin payment platform. Buy crypto from ₦2,000, pay bills instantly, and send money across 12 African countries.",
  keywords: [
    'cNGN',
    'stablecoin',
    'crypto',
    'Nigeria',
    'Africa',
    'payments',
    'bills',
    'fintech',
    'Aframp',
  ],
  generator: 'Next.js',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    title: 'Aframp - Buy Crypto, Pay Bills & Send Money in Africa',
    description:
      "Africa's premier cNGN stablecoin payment platform. Buy crypto from ₦2,000, pay bills instantly, and send money across 12 African countries.",
    type: 'website',
    locale: 'en_NG',
    siteName: 'Aframp',
  },
}

export const viewport: Viewport = {
  themeColor: '#10b981',
}

// This is a server component by default
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <KycProvider>
            <NotificationProvider>
              <OfflineBoundary>{children}</OfflineBoundary>
            </NotificationProvider>
          </KycProvider>
        </ThemeProvider>
        <CookieConsentBanner />
        <PwaUpdateBanner />
        <Analytics />
      </body>
    </html>
  )
}
