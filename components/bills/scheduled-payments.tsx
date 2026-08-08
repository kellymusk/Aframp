'use client'

import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Pause, Play, MoreHorizontal, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EmptyStateIllustration } from '@/components/ui/empty-state-illustration'

interface ScheduledPayment {
  id: string
  biller: string
  amount: number
  nextDate: string
  frequency: 'monthly' | 'weekly' | 'daily'
  status: 'active' | 'paused'
}

interface ScheduledPaymentsProps {
  payments: ScheduledPayment[]
  loading: boolean
}

export function ScheduledPayments({ payments, loading }: ScheduledPaymentsProps) {
  if (loading) {
    return (
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-40 bg-white/10 rounded-md animate-pulse"></div>
        </div>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i} className="border-white/5 bg-black/20 backdrop-blur-md">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="h-5 w-32 bg-white/10 rounded animate-pulse"></div>
                    <div className="h-4 w-48 bg-white/5 rounded animate-pulse"></div>
                  </div>
                  <div className="h-8 w-24 bg-white/10 rounded-full animate-pulse"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    )
  }

  if (payments.length === 0) {
    return (
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold font-cal-sans tracking-tight">Scheduled Payments</h2>
        </div>
        <Card className="border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-md relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-success/5 opacity-50" />
          <CardContent className="p-12 text-center relative z-10">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center relative">
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
              <Calendar className="h-10 w-10 text-muted-foreground relative z-10" />
            </div>
            <h3 className="font-bold text-xl mb-3 text-foreground">No scheduled payments</h3>
            <p className="text-muted-foreground mb-8 max-w-[250px] mx-auto leading-relaxed">
              Set up recurring payments to automate your bills and never miss a due date.
            </p>
            <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-8 transition-all hover:shadow-[0_0_20px_-5px_rgba(34,197,94,0.4)]">
              Schedule Payment
            </Button>
          </CardContent>
        </Card>
      </section>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-cal-sans tracking-tight">Scheduled Payments</h2>
        <Badge variant="outline" className="text-xs border-white/10 bg-white/5 px-3 py-1 rounded-full">
          <span className="text-primary mr-1">{payments.length}</span> scheduled
        </Badge>
      </div>

      <div className="space-y-4">
        {payments.map((payment, index) => (
          <motion.div
            key={payment.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05, duration: 0.4 }}
            className="group relative"
          >
            <div className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 pointer-events-none group-hover:shadow-[0_0_30px_-5px_rgba(34,197,94,0.15)]" />
            <Card className="relative border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-md transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04] overflow-hidden group-hover:-translate-y-1">
              <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-primary via-success to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-bold text-base truncate text-foreground group-hover:text-primary transition-colors duration-300">
                        {payment.biller}
                      </h3>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-[10px] uppercase tracking-wider font-semibold py-0.5 px-2 border-none',
                          payment.status === 'active'
                            ? 'bg-success/10 text-success'
                            : 'bg-white/10 text-muted-foreground'
                        )}
                      >
                        {payment.status}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-primary/70" />
                        <span>{formatDate(payment.nextDate)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                        <span className="capitalize">{payment.frequency}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                        <span className="text-foreground font-semibold">
                          ₦{payment.amount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      size="icon"
                      variant="ghost"
                      className={cn(
                        'h-9 w-9 rounded-full transition-all duration-300 border border-transparent',
                        payment.status === 'active'
                          ? 'text-yellow-500 hover:bg-yellow-500/10 hover:border-yellow-500/20'
                          : 'text-success hover:bg-success/10 hover:border-success/20'
                      )}
                    >
                      {payment.status === 'active' ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all duration-300"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
        
        {payments.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="pt-2"
          >
            <Button variant="ghost" className="w-full text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all group rounded-xl">
              <span className="font-medium">View All Scheduled Payments</span>
              <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
            </Button>
          </motion.div>
        )}
      </div>
    </section>
  )
}
