'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeftRight, ArrowUp, ArrowDown, Zap, Coins, CreditCard } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface QuickActionsProps {
  onSwap: () => void
  onSend: () => void
  onReceive: () => void
}

const actions = [
  { icon: ArrowLeftRight, label: 'Swap', action: 'swap', color: 'text-blue-500' },
  { icon: ArrowUp, label: 'Send', action: 'send', color: 'text-green-500' },
  { icon: ArrowDown, label: 'Receive', action: 'receive', color: 'text-purple-500' },
  // Lightning Network / instant payment feature is not yet implemented.
  // Marked as comingSoon so users see a tooltip instead of a dead click (#274).
  { icon: Zap, label: 'Lightning', action: 'lightning', color: 'text-yellow-500', comingSoon: true },
  { icon: Coins, label: 'Onramp', action: 'onramp', color: 'text-orange-500' },
  { icon: CreditCard, label: 'Pay Bills', action: 'bills', color: 'text-pink-500' },
] as const

export function QuickActions({ onSwap, onSend, onReceive }: QuickActionsProps) {
  const router = useRouter()
  const [tooltip, setTooltip] = useState<string | null>(null)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl p-6 border border-border shadow-sm"
    >
      <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
        {actions.map((action, index) => {
          const isComingSoon = 'comingSoon' in action && action.comingSoon

          return (
            <div key={action.label} className="relative flex flex-col items-center">
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={!isComingSoon ? { scale: 1.05 } : undefined}
                whileTap={!isComingSoon ? { scale: 0.95 } : undefined}
                disabled={isComingSoon}
                aria-label={isComingSoon ? `${action.label} — coming soon` : action.label}
                onClick={() => {
                  if (isComingSoon) return
                  if (action.action === 'swap') onSwap()
                  else if (action.action === 'send') onSend()
                  else if (action.action === 'receive') onReceive()
                  else if (action.action === 'onramp') router.push('/onramp')
                  else if (action.action === 'bills') router.push('/bills')
                }}
                onMouseEnter={() => isComingSoon && setTooltip(action.label)}
                onMouseLeave={() => setTooltip(null)}
                onFocus={() => isComingSoon && setTooltip(action.label)}
                onBlur={() => setTooltip(null)}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-xl bg-muted transition-colors w-full',
                  isComingSoon
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-muted/80'
                )}
              >
                <action.icon className={cn('w-6 h-6', action.color)} />
                <span className="text-xs font-medium text-foreground">{action.label}</span>
              </motion.button>

              {/* Coming soon tooltip — shown on hover/focus for disabled actions */}
              {isComingSoon && tooltip === action.label && (
                <div
                  role="tooltip"
                  className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-popover text-popover-foreground border border-border px-2.5 py-1 text-xs shadow-md z-10 pointer-events-none"
                >
                  Coming soon
                  <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-popover border-b border-r border-border rotate-45 -mt-1" />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
