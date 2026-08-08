'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Star, ArrowRight } from 'lucide-react'
import { BillerIcon } from '@/components/bills/biller-icons'
import { cn } from '@/lib/utils'
import { EmptyStateIllustration } from '@/components/ui/empty-state-illustration'

interface Biller {
  id: string
  name: string
  category: string
  logo: string
  description: string
  popular: boolean
}

interface RecentBillersProps {
  billers: Biller[]
  searchQuery: string
  loading: boolean
}

export function RecentBillers({ billers, searchQuery, loading }: RecentBillersProps) {
  const [recentBillers, setRecentBillers] = useState<Biller[]>([])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecentBillers([...billers].sort(() => Math.random() - 0.5).slice(0, 6))
  }, [billers])

  const filteredBillers = billers.filter(
    (biller) =>
      biller.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      biller.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      biller.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-40 bg-white/10 rounded-md animate-pulse"></div>
          <div className="h-6 w-24 bg-white/5 rounded-full animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-white/5 bg-black/20 backdrop-blur-md">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 animate-pulse"></div>
                  <div className="flex-1 space-y-3">
                    <div className="h-5 w-32 bg-white/10 rounded animate-pulse"></div>
                    <div className="h-4 w-40 bg-white/5 rounded animate-pulse"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    )
  }

  if (filteredBillers.length === 0 && searchQuery) {
    return (
      <section className="space-y-6 mt-12">
        <h2 className="text-2xl font-bold font-cal-sans tracking-tight">Recent Billers</h2>
        <div className="flex flex-col items-center gap-4 py-16 text-center rounded-2xl border border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-md">
          <EmptyStateIllustration variant="search" />
          <div>
            <p className="font-semibold text-foreground">No billers found</p>
            <p className="text-sm text-muted-foreground mt-1">
              We couldn&apos;t find any billers matching &quot;{searchQuery}&quot;
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-6 mt-12">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-cal-sans tracking-tight">Recent Billers</h2>
        <Badge variant="outline" className="text-xs border-white/10 bg-white/5 px-3 py-1 rounded-full">
          <span className="text-primary mr-1">{recentBillers.length}</span> billers
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {recentBillers.map((biller, index) => (
          <motion.div
            key={biller.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.4 }}
            className="group relative"
          >
            <div className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 pointer-events-none group-hover:shadow-[0_0_30px_-5px_rgba(34,197,94,0.15)]" />
            <Link href={`/bills/pay/${biller.id}`} className="block h-full">
              <Card className="relative h-full border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-md transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04] overflow-hidden group-hover:-translate-y-1">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-40 transition-opacity duration-500" />
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/10 group-hover:border-primary/20 transition-all duration-300">
                      <BillerIcon billerId={biller.id} className="h-7 w-7 text-primary" />
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <h3 className="font-bold text-base truncate text-foreground group-hover:text-primary transition-colors duration-300">
                            {biller.name}
                          </h3>
                          {biller.popular && (
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500/20 flex-shrink-0" />
                          )}
                        </div>

                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
                          {biller.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-auto">
                        <Badge variant="secondary" className="bg-white/5 hover:bg-white/10 text-xs text-muted-foreground capitalize border-none font-medium">
                          {biller.category.replace('-', ' ')}
                        </Badge>

                        <div className="h-8 px-3 text-xs font-semibold flex items-center gap-1.5 rounded-full transition-all duration-300 bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-[0_0_15px_-3px_rgba(34,197,94,0.5)]">
                          <span>Pay Now</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
