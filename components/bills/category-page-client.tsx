'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Search, Filter, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/theme-toggle'
import { CountrySelector } from './country-selector'
import { useBillsData, Biller } from '@/hooks/use-bills-data'
import { useWalletConnection } from '@/hooks/use-wallet-connection'

interface CategoryPageClientProps {
  categorySlug: string
}

export function CategoryPageClient({ categorySlug }: CategoryPageClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCountry, setSelectedCountry] = useState('NG')
  const { categories, recentBillers, loading } = useBillsData(selectedCountry)
  const { address, connected } = useWalletConnection()

  const category = categories.find((c) => c.id === categorySlug)
  const headerAddress = address ? `${address.slice(0, 4)}...${address.slice(-4)}` : ''

  const filteredBillers = useMemo(() => {
    return recentBillers.filter((biller) => {
      const matchesCategory = biller.category === categorySlug
      const matchesSearch =
        biller.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        biller.description.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [recentBillers, categorySlug, searchQuery])

  return (
    <div className="min-h-screen bg-background text-foreground font-atkinson">
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/bills"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Categories
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {connected && (
              <div className="hidden sm:flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                {headerAddress}
              </div>
            )}
            <CountrySelector
              selectedCountry={selectedCountry}
              onCountryChange={setSelectedCountry}
            />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-10 space-y-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-4xl shadow-sm border border-primary/20">
              {category?.icon || '🧾'}
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight capitalize font-cal-sans">
                {category?.name || categorySlug}
              </h1>
              <p className="text-muted-foreground text-lg">
                Fast and secure {category?.name.toLowerCase()} bill payments
              </p>
            </div>
          </motion.div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-10">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder={`Search for a provider...`}
              className="pl-11 h-14 bg-card border-border rounded-xl text-lg focus-visible:ring-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            className="h-14 px-6 gap-2 rounded-xl font-semibold border-border"
          >
            <Filter className="h-5 w-5" />
            Advanced Filters
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-[220px] rounded-2xl bg-muted animate-pulse border border-border"
              />
            ))}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredBillers.length > 0 ? (
              <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBillers.map((biller) => (
                  <BillerCard key={biller.id} biller={biller} />
                ))}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-border rounded-3xl bg-muted/20"
              >
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold">No billers found</h3>
                <p className="text-muted-foreground mb-6 text-center max-w-xs">
                  We couldn&apos;t find any {category?.name.toLowerCase()} providers matching &quot;
                  {searchQuery}&quot; in this country.
                </p>
                <Button variant="secondary" onClick={() => setSearchQuery('')}>
                  Clear Search Query
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>
    </div>
  )
}

function BillerCard({ biller }: { biller: Biller }) {
  return (
    <motion.div
      layout
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <Card className="group overflow-hidden border-border bg-card hover:border-primary/40 transition-all shadow-sm hover:shadow-md rounded-2xl">
        <CardContent className="p-7">
          <div className="flex items-start justify-between mb-6">
            <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center text-3xl shadow-inner border border-border group-hover:bg-primary/5 transition-colors">
              {biller.logo}
            </div>
            <div className="flex flex-col items-end gap-2">
              {biller.trending && (
                <Badge className="bg-green-500/10 text-green-600 border-none font-bold">
                  Trending
                </Badge>
              )}
              {biller.popular && (
                <Badge variant="outline" className="border-primary/20 text-primary font-bold">
                  Popular
                </Badge>
              )}
            </div>
          </div>
          <h3 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">
            {biller.name}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-8 leading-relaxed">
            {biller.description}
          </p>
          <Link href={`/bills/pay/${biller.id}`} className="block">
            <Button className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 rounded-xl text-base transition-transform active:scale-95 shadow-lg shadow-primary/20">
              Pay Now
            </Button>
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  )
}
