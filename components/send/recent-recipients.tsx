import { ChevronRight } from 'lucide-react'

interface RecentRecipient {
  address: string
  name: string
  avatar?: string
}

interface RecentRecipientsProps {
  onSelect: (address: string, name?: string, avatar?: string) => void
}

const RECENT_RECIPIENTS: RecentRecipient[] = [
  { address: 'GBA4B7H...S7N8', name: 'Ava Thompson', avatar: 'AT' },
  { address: 'GDQ2N8X...X2C9', name: 'Noah Kim', avatar: 'NK' },
  { address: 'GCK6M2Z...F5Q1', name: 'Mila Garcia', avatar: 'MG' },
]

export function RecentRecipients({ onSelect }: RecentRecipientsProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Recent recipients
        </span>
        <button type="button" className="text-xs text-emerald-500 font-medium hover:text-emerald-600">
          View all
        </button>
      </div>

      <div className="space-y-2">
        {RECENT_RECIPIENTS.map((recipient) => (
          <button
            key={recipient.address}
            type="button"
            onClick={() => onSelect(recipient.address, recipient.name, recipient.avatar)}
            className="w-full flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5 text-left transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/5"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-semibold text-emerald-500">
              {recipient.avatar ?? recipient.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-foreground">{recipient.name}</div>
              <div className="truncate font-mono text-[11px] text-muted-foreground">{recipient.address}</div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  )
}
