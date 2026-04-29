'use client'

import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Pause, Play, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

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
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-40 bg-muted rounded animate-pulse"></div>
        </div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Card key={i} className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-muted rounded animate-pulse"></div>
                    <div className="h-3 w-24 bg-muted rounded animate-pulse"></div>
                  </div>
                  <div className="h-8 w-20 bg-muted rounded animate-pulse"></div>
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
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Scheduled Payments</h2>
        </div>
        <Card className="border-border bg-card">
          <CardContent className="p-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No scheduled payments</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Set up recurring payments to automate your bills
            </p>
            <Button variant="outline" size="sm">
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
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Scheduled Payments</h2>
        <Badge variant="secondary" className="text-xs">
          {payments.length} scheduled
        </Badge>
      </div>

      <div className="space-y-3">
        {payments.map((payment, index) => (
          <motion.div
            key={payment.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="border-border bg-card hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium truncate">{payment.biller}</h3>
                      <Badge
                        variant={payment.status === 'active' ? 'default' : 'secondary'}
                        className={cn(
                          'text-xs',
                          payment.status === 'active' &&
                            'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                        )}
                      >
                        {payment.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(payment.nextDate)}</span>
                      </div>
                      <div className="capitalize">{payment.frequency} payment</div>
                      <div className="font-medium text-foreground">
                        ₦{payment.amount.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      className={cn(
                        'h-8 w-8 p-0',
                        payment.status === 'active'
                          ? 'text-yellow-500 hover:bg-yellow-500/10'
                          : 'text-green-500 hover:bg-green-500/10'
                      )}
                    >
                      {payment.status === 'active' ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-muted-foreground hover:bg-muted"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
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
