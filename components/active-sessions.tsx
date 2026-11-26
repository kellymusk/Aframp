'use client'

import { useCallback, useEffect, useState } from 'react'
import { MonitorSmartphone } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useAuthenticatedSession } from '@/components/session-provider'
import { api, type DeviceSession } from '@/lib/api'
import { formatDateTime } from '@/lib/format-date'

/** Where the merchant is signed in, with a way to sign a lost device out. */
export function ActiveSessions() {
  const { token } = useAuthenticatedSession()
  const [sessions, setSessions] = useState<DeviceSession[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setSessions(await api.listSessions(token, signal))
        setError(null)
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        setError(cause instanceof Error ? cause.message : 'Could not load your sessions')
      }
    },
    [token]
  )

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  async function revoke(id: string) {
    setRevokingId(id)
    setError(null)
    try {
      await api.revokeSession(token, id)
      setSessions((current) => current?.filter((session) => session.id !== id) ?? null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not sign that device out')
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <section className="bg-panel border-hairline space-y-4 rounded-2xl border p-5">
      <div className="flex items-center gap-2">
        <MonitorSmartphone className="text-dim size-4" aria-hidden />
        <h3 className="font-bold text-white">Active sessions</h3>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {sessions === null && !error ? (
        <LoadingSpinner />
      ) : (
        <ul className="divide-hairline divide-y">
          {(sessions ?? []).map((session) => (
            <li key={session.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0 space-y-0.5">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <span className="truncate">{session.device ?? 'Unknown device'}</span>
                  {session.current && <Badge variant="secondary">This device</Badge>}
                </p>
                <p className="text-dim text-xs">
                  {session.ip ? `${session.ip} · ` : ''}Last active{' '}
                  {formatDateTime(session.last_seen_at)}
                </p>
              </div>
              {!session.current && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={revokingId === session.id}
                  aria-label={`Sign out ${session.device ?? 'unknown device'}`}
                  onClick={() => void revoke(session.id)}
                >
                  {revokingId === session.id ? 'Signing out…' : 'Sign out'}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
