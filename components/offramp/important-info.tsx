'use client'

import { AlertCircle, Clock, RefreshCw, Smartphone } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface ImportantInfoProps {
  expiresAt: Date
  onRefresh?: () => void
}

export function ImportantInfo({ expiresAt, onRefresh }: ImportantInfoProps) {
  const [timeLeft, setTimeLeft] = useState<string>('')

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime()
      const distance = expiresAt.getTime() - now

      if (distance < 0) {
        setTimeLeft('Expired')
        clearInterval(timer)
      } else {
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((distance % (1000 * 60)) / 1000)
        setTimeLeft(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [expiresAt])

  const isExpired = timeLeft === 'Expired'

  return (
    <div className="space-y-4">
      <div
        className={cn(
          'rounded-2xl p-5 border transition-all duration-500 shadow-sm overflow-hidden relative',
          isExpired
            ? 'bg-destructive/5 border-destructive/20'
            : 'bg-accent/5 dark:bg-accent/10 border-accent/20'
        )}
      >
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'p-2 rounded-xl mt-0.5',
              isExpired
                ? 'bg-destructive/10 text-destructive'
                : 'bg-accent/10 text-accent-foreground'
            )}
          >
            <Clock className="h-5 w-5" />
          </div>
          <div className="space-y-2 flex-1">
            <div className="flex items-center justify-between">
              <h4
                className={cn(
                  'font-bold tracking-tight',
                  isExpired ? 'text-destructive' : 'text-accent'
                )}
              >
                {isExpired ? 'Rate Expired' : 'Rate locked until: 14:45'}
              </h4>
              {!isExpired && (
                <span className="text-xs font-bold text-accent/80">(10 mins remaining)</span>
              )}
            </div>
            <p
              className={cn(
                'text-sm font-medium leading-relaxed',
                isExpired ? 'text-destructive/80' : 'text-foreground/70'
              )}
            >
              {isExpired
                ? 'The exchange rate has expired. Please refresh to get the latest rate before sending funds.'
                : 'Funds typically arrive within 2-6 hours'}
            </p>
            {isExpired && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 border-destructive/30 text-destructive hover:bg-destructive hover:text-white rounded-xl font-bold transition-all h-10 px-4"
                onClick={onRefresh}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Rate
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-2xl border border-primary/10 group hover:bg-primary/10 transition-colors">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary group-hover:scale-110 transition-transform">
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="text-sm">
            <p className="font-bold text-foreground">SMS Notification</p>
            <p className="text-foreground/70 text-xs font-medium">
              You&apos;ll receive SMS when complete
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-4 bg-destructive/5 rounded-2xl border border-destructive/10 group hover:bg-destructive/10 transition-colors">
          <div className="p-2.5 bg-destructive/10 rounded-xl text-destructive group-hover:scale-110 transition-transform">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="text-sm">
            <p className="font-bold text-destructive">Irreversible</p>
            <p className="text-foreground/70 text-xs font-medium">This action cannot be undone</p>
          </div>
        </div>
      </div>
    </div>
  )
}
