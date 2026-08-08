'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowDownUp, ShieldCheck, Users, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

const mockStats = [
  {
    title: 'Total Orders',
    value: '4,821',
    change: '+8.2% this week',
    icon: ArrowDownUp,
    color: 'text-sky-400',
    bgColor: 'bg-sky-400/10',
    borderColor: 'border-sky-400/20',
    glowColor: 'group-hover:shadow-[0_0_30px_-5px_rgba(56,189,248,0.3)]',
  },
  {
    title: 'Pending KYC',
    value: '136',
    change: '12 awaiting review',
    icon: ShieldCheck,
    color: 'text-amber-400',
    bgColor: 'bg-amber-400/10',
    borderColor: 'border-amber-400/20',
    glowColor: 'group-hover:shadow-[0_0_30px_-5px_rgba(251,191,36,0.3)]',
  },
  {
    title: 'Active Users',
    value: '2,390',
    change: '+134 this month',
    icon: Users,
    color: 'text-violet-400',
    bgColor: 'bg-violet-400/10',
    borderColor: 'border-violet-400/20',
    glowColor: 'group-hover:shadow-[0_0_30px_-5px_rgba(167,139,250,0.3)]',
  },
  {
    title: 'Total Volume',
    value: '₦482M',
    change: '+22.4% this month',
    icon: TrendingUp,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10',
    borderColor: 'border-emerald-400/20',
    glowColor: 'group-hover:shadow-[0_0_30px_-5px_rgba(52,211,153,0.3)]',
  },
]

export default function AdminPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Platform-wide metrics and activity</p>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {mockStats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, duration: 0.5, ease: 'easeOut' }}
            className="group relative"
          >
            <div className={cn('absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 pointer-events-none group-hover:opacity-100', stat.glowColor)} />
            <Card className={cn(
              'relative h-full overflow-hidden border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-md transition-all duration-300',
              'hover:border-white/10 hover:bg-white/[0.04] hover:-translate-y-1'
            )}>
              <div className={cn('absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-current to-transparent opacity-20', stat.color)} />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  {stat.title}
                </CardTitle>
                <div className={cn('p-2.5 rounded-xl border transition-all duration-300 group-hover:scale-110', stat.bgColor, stat.borderColor)}>
                  <stat.icon className={cn('h-4 w-4', stat.color)} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground to-muted-foreground">
                  {stat.value}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Badge
                    variant="outline"
                    className={cn('text-xs font-medium px-2 py-0.5 border-none shadow-none', stat.bgColor, stat.color)}
                  >
                    {stat.change}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </section>
    </div>
  )
}
