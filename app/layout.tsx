import type React from "react"
import type { Metadata, Viewport } from "next"
import { Manrope, Outfit, Space_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
})

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-cal-sans",
})

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-instrument-sans",
})

export const metadata: Metadata = {
  title: "Aframp - Buy Crypto, Pay Bills & Send Money in Africa",
  description:
    "Africa's premier cNGN stablecoin payment platform. Buy crypto from ₦2,000, pay bills instantly, and send money across 12 African countries.",
  keywords: ["cNGN", "stablecoin", "crypto", "Nigeria", "Africa", "payments", "bills", "fintech", "Aframp"],
  generator: "v0.app",
}

export const viewport: Viewport = {
  themeColor: "#10b981",
}

// This is a server component by default
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${manrope.variable} ${outfit.variable} ${spaceMono.variable} font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
