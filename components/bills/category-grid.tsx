'use client'

import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { CategoryIcon } from '@/components/bills/biller-icons'

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

const colorClasses: Record<string, string> = {
  blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20',
  green: 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20',
  purple: 'bg-purple-500/10 text-purple-500 border-purple-500/20 hover:bg-purple-500/20',
  orange: 'bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20',
  red: 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20',
  indigo: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20 hover:bg-indigo-500/20',
}

export function CategoryGrid({ categories, searchQuery, selectedCountry }: CategoryGridProps) {
  const filteredCategories = categories.filter(
    (category) =>
      category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (filteredCategories.length === 0 && searchQuery) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground">
          No categories found matching &quot;{searchQuery}&quot;
        </div>
      </div>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Categories</h2>
        <Badge variant="secondary" className="text-xs">
          {categories.length} categories
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.map((category, index) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ y: -4 }}
            className="group cursor-pointer"
          >
            <Card className="h-full border-border bg-card hover:border-primary/50 transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={cn(
                          'w-12 h-12 rounded-xl flex items-center justify-center transition-all group-hover:scale-110',
                          colorClasses[category.color]
                        )}
                      >
                        <CategoryIcon categoryId={category.id} className="h-6 w-6" />
                      </div>
                      {category.popular && (
                        <Badge variant="secondary" className="text-xs h-5">
                          Popular
                        </Badge>
                      )}
                    </div>

                    <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                      {category.name}
                    </h3>

                    <p className="text-sm text-muted-foreground mb-4">
                      {category.billerCount} billers available
                    </p>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{selectedCountry}</span>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>Browse</span>
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="transition-transform group-hover:translate-x-1"
                        >
                          <path d="m9 18 6-6-6-6" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
