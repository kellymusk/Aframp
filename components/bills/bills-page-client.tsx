'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { useWalletConnection } from '@/hooks/use-wallet-connection'
import { CountrySelector } from './country-selector'
import { CategoryGrid } from '@/components/bills/category-grid'
import { RecentBillers } from '@/components/bills/recent-billers'
import { ScheduledPayments } from '@/components/bills/scheduled-payments'
import { TransactionStats } from '@/components/bills/transaction-stats'
import { useBillsData } from '@/hooks/use-bills-data'

export function BillsPageClient() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCountry, setSelectedCountry] = useState('NG')
  const { categories, transactions, recentBillers, scheduledPayments, loading, addBiller } =
    useBillsData(selectedCountry)
  const { address, connected } = useWalletConnection()
  const headerAddress = address ? `${address.slice(0, 4)}...${address.slice(-4)}` : ''

  const handleAddBiller = () => {
    const newBiller = {
      id: `custom-${Date.now()}`,
      name: 'Custom Utility',
      logo: '🏗️',
      category: 'electricity',
      minAmount: 100,
      maxAmount: 10000,
      popular: false,
      trending: false,
      description: 'Your added local utility provider.',
    }
    addBiller(newBiller)
  }

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background radial gradients for premium feel */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-success/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-50 border-b border-white/5 bg-background/60 backdrop-blur-xl"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all duration-300 group"
              >
                <div className="p-2 rounded-full bg-muted/30 group-hover:bg-primary/20 transition-colors">
                  <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                </div>
                <span className="font-medium">Back to Dashboard</span>
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              {connected && headerAddress ? (
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 backdrop-blur-md px-4 py-1.5 text-xs shadow-inner">
                  <span className="h-2 w-2 rounded-full bg-success pulse-glow" />
                  <span className="font-mono">{headerAddress}</span>
                </div>
              ) : null}
              <div className="p-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                <CountrySelector
                  selectedCountry={selectedCountry}
                  onCountryChange={setSelectedCountry}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-10 max-w-7xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-10"
        >
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold font-cal-sans tracking-tight">Bill Payments</h1>
              <p className="text-muted-foreground">Pay your bills quickly and securely</p>
            </div>
            <Button onClick={handleAddBiller}>Add New Biller</Button>
          </div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-block"
              >
                <span className="px-3 py-1 text-xs font-medium uppercase tracking-wider text-primary bg-primary/10 rounded-full border border-primary/20">
                  Payments
                </span>
              </motion.div>
              <h1 className="text-4xl md:text-5xl font-bold font-cal-sans tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground to-muted-foreground">
                Bill Payments
              </h1>
              <p className="text-lg text-muted-foreground max-w-md">
                Manage and pay your bills seamlessly with zero hidden fees and instant settlement.
              </p>
            </div>

            {/* Search Bar */}
            <div className="relative w-full md:w-96 group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-success/20 rounded-2xl blur-md opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-500" />
              <div className="relative flex items-center">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  placeholder="Search billers, categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-12 h-14 rounded-2xl bg-black/40 border border-white/10 text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary focus-visible:outline-none transition-all shadow-inner backdrop-blur-xl"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 p-0 rounded-full hover:bg-white/10"
                    onClick={() => setSearchQuery('')}
                  >
                    ×
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent rounded-3xl pointer-events-none -m-4 p-4" />
            <TransactionStats transactions={transactions} loading={loading} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Category Grid */}
              <CategoryGrid
                categories={categories}
                searchQuery={debouncedSearch}
                selectedCountry={selectedCountry}
              />

              {/* Recent Billers */}
              <RecentBillers billers={recentBillers} searchQuery={debouncedSearch} loading={loading} />
            </div>

            <div className="space-y-8">
              {/* Scheduled Payments */}
              <ScheduledPayments payments={scheduledPayments} loading={loading} />
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
