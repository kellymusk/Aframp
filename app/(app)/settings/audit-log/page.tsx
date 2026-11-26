'use client'

import { useCallback, useEffect, useState } from 'react'
import { History, ShieldAlert } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyStateIllustration } from '@/components/ui/empty-state-illustration'
import { api, ApiError, type AuditLogEvent } from '@/lib/api'
import { useAuthenticatedSession } from '@/components/session-provider'

function formatWhen(iso?: string | null): string {
  if (!iso) return 'Unknown time'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function eventTitle(event: AuditLogEvent): string {
  if (event.description?.trim()) return event.description
  if (event.event_type?.trim()) return event.event_type.replace(/[_-]+/g, ' ')
  return 'Security event'
}

function eventBadge(event: AuditLogEvent): string | null {
  const type = event.event_type?.trim()
  return type ? type.replace(/[_-]+/g, ' ') : null
}

export default function AuditLogPage() {
  const { token } = useAuthenticatedSession()
  const [events, setEvents] = useState<AuditLogEvent[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [unavailable, setUnavailable] = useState(false)

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(null)
      setUnavailable(false)
      try {
        const data = await api.listAuditLogEvents(token, signal)
        setEvents(Array.isArray(data) ? data : [])
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        if (cause instanceof ApiError && (cause.status === 404 || cause.status === 501)) {
          setUnavailable(true)
          setEvents([])
          return
        }
        setError(cause instanceof Error ? cause.message : 'Could not load audit log')
      }
    },
    [token]
  )

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  if (error) {
    return <ErrorState message={error} onRetry={() => void load()} />
  }

  if (!events) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="bg-muted flex size-10 items-center justify-center rounded-full">
          <History className="text-muted-foreground size-5" aria-hidden />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight">Audit log</h2>
          <p className="text-dim text-sm">
            Review recent security activity on your merchant account, including sign-ins, API key
            changes, email changes, and cash-outs.
          </p>
        </div>
      </div>

      {unavailable && (
        <Alert className="border-amber-500/30 bg-amber-500/10">
          <ShieldAlert className="size-4 text-amber-400" aria-hidden />
          <AlertTitle className="text-amber-200">Audit log coming soon</AlertTitle>
          <AlertDescription className="text-amber-100/80">
            The backend audit log endpoint isn&apos;t available in this environment yet. Once the
            backend contract ships (see kellymusk/aframp-backend#1341), this page will display your
            recent security events here.
          </AlertDescription>
        </Alert>
      )}

      {events.length === 0 ? (
        <div className="bg-panel border-hairline flex flex-col items-center gap-3 rounded-2xl border py-12 text-center">
          <EmptyStateIllustration variant="empty" className="size-16" />
          <p className="text-dim text-sm max-w-sm">
            {unavailable
              ? 'No security events can be shown until the audit log service is connected.'
              : 'No recent security events yet. Sign-ins, API key changes, email changes, and cash-outs will appear here.'}
          </p>
        </div>
      ) : (
        <div className="bg-panel border-hairline rounded-2xl border overflow-hidden">
          <ul className="divide-y">
            {events.map((event, index) => {
              const badge = eventBadge(event)
              return (
                <li
                  key={event.id ?? `${event.created_at ?? 'event'}-${index}`}
                  className="px-5 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium text-white">{eventTitle(event)}</p>
                      <p className="text-dim text-xs">
                        {formatWhen(event.created_at)}
                        {event.ip_address ? ` · IP ${event.ip_address}` : ''}
                      </p>
                    </div>
                    {badge && (
                      <Badge variant="secondary" className="shrink-0 text-xs capitalize">
                        {badge}
                      </Badge>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
