'use client'

import { useState } from 'react'
import { Clock, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Recipient {
  id: string
  name: string
  address: string
  avatar?: string
  initials: string
  color: string
  lastSent: string
  lastAmount: string
  asset: string
}

const MOCK_RECIPIENTS: Recipient[] = [
  {
    id: '1',
    name: 'Amara Diallo',
    address: 'GBSN2ZJBRFWTQHWRJQE4GKDJJDSGPVTLQNQCQX7QR5W5VKHNHQH',
    initials: 'AD',
    color: 'bg-violet-500',
    lastSent: '2 days ago',
    lastAmount: '50',
    asset: 'USDC',
  },
  {
    id: '2',
    name: 'Kwame Asante',
    address: 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGQKM1WZWAHK7NBAGQ',
    initials: 'KA',
    color: 'bg-amber-500',
    lastSent: '5 days ago',
    lastAmount: '120',
    asset: 'XLM',
  },
  {
    id: '3',
    name: 'Fatima Nkosi',
    address: 'GD5DJQDDBKGAYNEAXU562HYGOOSYAEEHG7JYKKRXZQ7XMOLXUV',
    initials: 'FN',
    color: 'bg-rose-500',
    lastSent: '1 week ago',
    lastAmount: '0.001',
    asset: 'BTC',
  },
  {
    id: '4',
    name: 'Emeka Obi',
    address: 'GBUWN6HQ3GIJUAKKLQHSZ6JCVGMHQOIAQIRYHE5JZZFIVLZABCH',
    initials: 'EO',
    color: 'bg-emerald-500',
    lastSent: '2 weeks ago',
    lastAmount: '200',
    asset: 'USDC',
  },
]

interface RecentRecipientsProps {
  onSelect: (address: string, name?: string, avatar?: string) => void
}

export function RecentRecipients({ onSelect }: RecentRecipientsProps) {
  const [selected, setSelected] = useState<string | null>(null)

  const handleSelect = (recipient: Recipient) => {
    setSelected(recipient.id)
    onSelect(recipient.address, recipient.name)
    setTimeout(() => setSelected(null), 600)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Recent
        </span>
      </div>

      {/* Avatar row — quick tap */}
      <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-none">
        {MOCK_RECIPIENTS.map((r) => (
          <button
            key={r.id}
            onClick={() => handleSelect(r)}
            className="flex flex-col items-center gap-1.5 shrink-0 group"
          >
            <div
              className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm transition-all duration-150',
                r.color,
                selected === r.id
                  ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-background scale-110'
                  : 'group-hover:scale-105'
              )}
            >
              {r.initials}
            </div>
            <span className="text-xs text-muted-foreground max-w-[52px] truncate">
              {r.name.split(' ')[0]}
            </span>
          </button>
        ))}
      </div>

      {/* List rows */}
      <div className="space-y-1 mt-1">
        {MOCK_RECIPIENTS.map((r) => (
          <button
            key={r.id}
            onClick={() => handleSelect(r)}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-150 group text-left',
              selected === r.id
                ? 'bg-emerald-500/10 border border-emerald-500/30'
                : 'hover:bg-muted/50 border border-transparent'
            )}
          >
            {/* Avatar */}
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0',
                r.color
              )}
            >
              {r.initials}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-tight truncate">{r.name}</p>
              <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">
                {r.address.slice(0, 8)}...{r.address.slice(-4)}
              </p>
            </div>

            {/* Last amount */}
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold">
                {r.lastAmount}{' '}
                <span className="text-xs text-muted-foreground font-normal">{r.asset}</span>
              </p>
              <p className="text-xs text-muted-foreground">{r.lastSent}</p>
            </div>

            <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </button>
        ))}
      </div>
    </div>
  )
}
