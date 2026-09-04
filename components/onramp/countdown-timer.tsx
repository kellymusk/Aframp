'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CountdownTimerProps {
  expiresAt: Date
  onExpire?: () => void
}

/** Below this many seconds remaining, the timer turns amber as a heads-up. */
const URGENT_THRESHOLD_SECONDS = 60

function secondsUntil(expiresAt: Date): number {
  return Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
}

export function CountdownTimer({ expiresAt, onExpire }: CountdownTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(() => secondsUntil(expiresAt))
  const isExpired = secondsLeft <= 0

  useEffect(() => {
    setSecondsLeft(secondsUntil(expiresAt))

    const timer = setInterval(() => {
      const next = secondsUntil(expiresAt)
      setSecondsLeft(next)
      if (next <= 0) {
        clearInterval(timer)
        onExpire?.()
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [expiresAt, onExpire])

  const isUrgent = !isExpired && secondsLeft < URGENT_THRESHOLD_SECONDS
  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
        isExpired
          ? 'bg-destructive/10 text-destructive'
          : isUrgent
            ? 'bg-warning/10 text-warning-foreground'
            : 'bg-muted text-muted-foreground'
      )}
    >
      <Clock className="h-4 w-4" />
      {isExpired ? (
        <span>Expired</span>
      ) : (
        <span>
          Expires in {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
      )}
    </div>
  )
}
