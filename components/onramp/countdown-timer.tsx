'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CountdownTimerProps {
  expiresAt: Date
  onExpire?: () => void
}

export function CountdownTimer({ expiresAt, onExpire }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{ minutes: number; seconds: number }>({
    minutes: 0,
    seconds: 0,
  })
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = expiresAt.getTime() - new Date().getTime()

      if (difference <= 0) {
        setIsExpired(true)
        onExpire?.()
        return { minutes: 0, seconds: 0 }
      }

      return {
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      }
    }

    const timer = setInterval(() => {
      const newTime = calculateTimeLeft()
      setTimeLeft(newTime)
    }, 1000)

    return () => clearInterval(timer)
  }, [expiresAt, onExpire])

  const isUrgent = timeLeft.minutes < 5

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
          Expires in {String(timeLeft.minutes).padStart(2, '0')}:
          {String(timeLeft.seconds).padStart(2, '0')}
        </span>
      )}
    </div>
  )
}
