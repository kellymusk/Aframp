'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { useWalletConnection } from '@/hooks/use-wallet-connection'
// Note: Input component will be created separately
import { CountrySelector } from './country-selector'
import { CategoryGrid } from '@/components/bills/category-grid'

import { RecentBillers } from '@/components/bills/recent-billers'
import { ScheduledPayments } from '@/components/bills/scheduled-payments'

import { TransactionStats } from '@/components/bills/transaction-stats'

import { useBillsData } from '@/hooks/use-bills-data'

export function BillsPageClient() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCountry, setSelectedCountry] = useState('NG')
  const { categories, transactions, recentBillers, scheduledPayments, loading } =
    useBillsData(selectedCountry)
  const { address, connected } = useWalletConnection()
  const headerAddress = address ? `${address.slice(0, 4)}...${address.slice(-4)}` : ''

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              {connected && headerAddress ? (
                <div className="flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs">
                  <span className="h-2 w-2 rounded-full bg-success pulse-glow" />
                  {headerAddress}
                </div>
              ) : null}
              <CountrySelector
                selectedCountry={selectedCountry}
                onCountryChange={setSelectedCountry}
              />
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Page Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold font-cal-sans tracking-tight">Bill Payments</h1>
            <p className="text-muted-foreground">Pay your bills quickly and securely</p>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <div className="relative">
              <input
                type="text"
                placeholder="Search billers, categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 h-12 rounded-xl bg-muted/50 border border-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none transition-colors"
              />
            </div>
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                onClick={() => setSearchQuery('')}
              >
                ×
              </Button>
            )}
          </div>

          {/* Stats Overview */}
          <TransactionStats transactions={transactions} loading={loading} />

          {/* Category Grid */}
          <CategoryGrid
            categories={categories}
            searchQuery={debouncedSearch}
            selectedCountry={selectedCountry}
          />

          {/* Recent Billers */}
          <RecentBillers billers={recentBillers} searchQuery={debouncedSearch} loading={loading} />

          {/* Scheduled Payments */}
          <ScheduledPayments payments={scheduledPayments} loading={loading} />
        </motion.div>
      </main>
    </div>
  )
}
