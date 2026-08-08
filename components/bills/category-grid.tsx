'use client'

import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { CategoryIcon } from '@/components/bills/biller-icons'
import { ArrowRight } from 'lucide-react'
import { EmptyStateIllustration } from '@/components/ui/empty-state-illustration'

interface BillCategory {
  id: string
  name: string
  icon: string
  billerCount: number
  color: string
  popular: boolean
}

interface CategoryGridProps {
  categories: BillCategory[]
  searchQuery: string
  selectedCountry: string
}

const colorClasses: Record<string, { bg: string, text: string, border: string, glow: string }> = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', glow: 'group-hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.3)]' },
  green: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20', glow: 'group-hover:shadow-[0_0_30px_-5px_rgba(34,197,94,0.3)]' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20', glow: 'group-hover:shadow-[0_0_30px_-5px_rgba(168,85,247,0.3)]' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', glow: 'group-hover:shadow-[0_0_30px_-5px_rgba(249,115,22,0.3)]' },
  red: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', glow: 'group-hover:shadow-[0_0_30px_-5px_rgba(239,68,68,0.3)]' },
  indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20', glow: 'group-hover:shadow-[0_0_30px_-5px_rgba(99,102,241,0.3)]' },
}

export function CategoryGrid({ categories, searchQuery, selectedCountry }: CategoryGridProps) {
  const filteredCategories = categories.filter(
    (category) =>
      category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (filteredCategories.length === 0 && searchQuery) {
    return (
      <div className="py-16 flex flex-col items-center gap-4 text-center">
        <EmptyStateIllustration variant="search" />
        <div>
          <p className="text-lg font-semibold text-foreground">No categories found</p>
          <p className="text-sm text-muted-foreground mt-1">
            We couldn&apos;t find any categories matching &quot;{searchQuery}&quot;
          </p>
        </div>
      </div>
    )
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-cal-sans tracking-tight">Categories</h2>
        <Badge variant="outline" className="text-xs border-white/10 bg-white/5 px-3 py-1 rounded-full">
          <span className="text-primary mr-1">{categories.length}</span> categories
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCategories.map((category, index) => {
          const styles = colorClasses[category.color] || colorClasses.blue

          return (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.4 }}
              className="group cursor-pointer relative"
            >
              <div className={cn('absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 pointer-events-none', styles.glow)} />
              <Card className="relative h-full border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-md transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04] overflow-hidden group-hover:-translate-y-1">
                <div className={cn('absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-current to-transparent opacity-20', styles.text)} />
                
                <CardContent className="p-6">
                  <div className="flex flex-col h-full justify-between">
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className={cn(
                            'w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 border',
                            styles.bg, styles.text, styles.border
                          )}
                        >
                          <CategoryIcon categoryId={category.id} className="h-7 w-7" />
                        </div>
                        {category.popular && (
                          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px] uppercase tracking-wider font-semibold py-0.5 px-2">
                            Popular
                          </Badge>
                        )}
                      </div>

                      <h3 className="font-bold text-xl mb-1 text-foreground group-hover:text-primary transition-colors duration-300">
                        {category.name}
                      </h3>

                      <p className="text-sm text-muted-foreground mb-6 font-medium">
                        {category.billerCount} billers available
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-success/80"></span>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{selectedCountry}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">
                        <span>Browse</span>
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
