'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Star } from 'lucide-react'
import { BillerIcon } from '@/components/bills/biller-icons'

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
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-32 bg-muted rounded animate-pulse"></div>
          <div className="h-5 w-20 bg-muted rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-muted animate-pulse"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 bg-muted rounded animate-pulse"></div>
                    <div className="h-3 w-32 bg-muted rounded animate-pulse"></div>
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
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recent Billers</h2>
        </div>
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            No billers found matching &quot;{searchQuery}&quot;
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Recent Billers</h2>
        <Badge variant="secondary" className="text-xs">
          {billers.length} billers
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recentBillers.map((biller, index) => (
          <motion.div
            key={biller.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ y: -2 }}
          >
            <Link href={`/bills/pay/${biller.id}`} className="group cursor-pointer">
              <Card className="h-full border-border bg-card hover:border-primary/50 transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center group-hover:scale-105 transition-transform">
                      <BillerIcon billerId={biller.id} className="h-6 w-6 text-primary" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                          {biller.name}
                        </h3>
                        {biller.popular && (
                          <Star className="h-4 w-4 text-yellow-500 fill-current flex-shrink-0" />
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {biller.description}
                      </p>

                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs capitalize">
                          {biller.category.replace('-', ' ')}
                        </Badge>

                        <div className="h-8 px-3 text-xs flex items-center gap-1 rounded-md transition-colors group-hover:bg-primary group-hover:text-primary-foreground text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Pay Now
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
