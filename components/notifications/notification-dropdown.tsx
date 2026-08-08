'use client'

import { useCallback, useMemo, useState } from 'react'
import {
  Bell,
  CheckCheck,
  Loader2,
  ArrowDownLeft,
  ArrowUpRight,
  BadgeCheck,
  TrendingUp,
  Info,
  RefreshCw,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useNotifications, type NotificationItem } from '@/contexts/notification-context'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

// ── Per-category icon + colour ──────────────────────────────────────────────
const CATEGORY_META: Record<
  NotificationItem['category'],
  { icon: React.ElementType; colour: string }
> = {
  payment:     { icon: ArrowDownLeft, colour: 'text-emerald-500' },
  onramp:      { icon: ArrowDownLeft, colour: 'text-blue-500' },
  offramp:     { icon: ArrowUpRight,  colour: 'text-orange-500' },
  price_alert: { icon: TrendingUp,    colour: 'text-yellow-500' },
  kyc:         { icon: BadgeCheck,    colour: 'text-purple-500' },
  system:      { icon: Info,          colour: 'text-muted-foreground' },
}

function CategoryIcon({ category }: { category: NotificationItem['category'] }) {
  const { icon: Icon, colour } = CATEGORY_META[category] ?? CATEGORY_META.system
  return <Icon className={cn('h-4 w-4 shrink-0 mt-0.5', colour)} aria-hidden />
}

function TimeAgo({ iso }: { iso: string }) {
  try {
    return (
      <span className="text-[11px] text-muted-foreground tabular-nums">
        {formatDistanceToNow(new Date(iso), { addSuffix: true })}
      </span>
    )
  } catch {
    return null
  }
}

// ── Priority dot ────────────────────────────────────────────────────────────
const PRIORITY_DOT: Record<NotificationItem['priority'], string | null> = {
  high:   'bg-red-500',
  normal: null,
  low:    null,
}

export function NotificationDropdown() {
  const { notifications, unreadCount, loading, markRead, markAllRead, refresh } =
    useNotifications()
  const [open, setOpen] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)

  // Show max 30 in the dropdown; newest first
  const visible = useMemo(() => notifications.slice(0, 30), [notifications])

  const handleMarkAll = useCallback(async () => {
    setMarkingAll(true)
    try {
      await markAllRead()
    } finally {
      setMarkingAll(false)
    }
  }, [markAllRead])

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative rounded-full"
          aria-label={
            unreadCount > 0
              ? `Notifications — ${unreadCount} unread`
              : 'Notifications'
          }
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full
                         bg-primary text-[10px] font-semibold text-primary-foreground
                         flex items-center justify-center"
              aria-hidden
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0">
        {/* Header */}
        <DropdownMenuLabel className="px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Notifications</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <span className="text-xs text-muted-foreground">{unreadCount} unread</span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 rounded-full"
                onClick={refresh}
                aria-label="Refresh notifications"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        )}

        {/* Empty */}
        {!loading && visible.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            You're all caught up ✓
          </div>
        )}

        {/* Items */}
        {!loading &&
          visible.map((item) => {
            const priorityDot = PRIORITY_DOT[item.priority]
            return (
              <DropdownMenuItem
                key={item.id}
                className="flex items-start gap-3 px-4 py-3 cursor-default focus:bg-muted/50"
                onSelect={(e) => e.preventDefault()}
              >
                <CategoryIcon category={item.category} />

                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={cn(
                        'text-sm font-medium leading-snug truncate',
                        item.isRead ? 'text-muted-foreground' : 'text-foreground'
                      )}
                    >
                      {item.title}
                      {priorityDot && (
                        <span
                          className={cn(
                            'inline-block w-1.5 h-1.5 rounded-full ml-1.5 align-middle',
                            priorityDot
                          )}
                          aria-label="High priority"
                        />
                      )}
                    </p>
                    {!item.isRead && (
                      <button
                        type="button"
                        onClick={() => void markRead(item.id)}
                        className="rounded-full p-1 text-muted-foreground
                                   hover:bg-muted hover:text-foreground shrink-0"
                        aria-label={`Mark "${item.title}" as read`}
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{item.message}</p>
                  <TimeAgo iso={item.createdAt} />
                </div>
              </DropdownMenuItem>
            )
          })}

        {/* Footer — mark all read */}
        {visible.length > 0 && unreadCount > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-4 py-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => void handleMarkAll()}
                disabled={markingAll}
              >
                {markingAll ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCheck className="mr-2 h-3.5 w-3.5" />
                )}
                Mark all as read
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
