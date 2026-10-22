'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { api } from '@/lib/api'
import { useAuthenticatedSession } from '@/components/session-provider'

export function PushNotificationToggle() {
  const { token } = useAuthenticatedSession()
  const { permission, subscribed, loading, error, subscribe, unsubscribe } = usePushNotifications()
  const [backendEnabled, setBackendEnabled] = useState<boolean | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)

  // Check backend status on mount
  useEffect(() => {
    let cancelled = false
    api
      .getPushSubscriptionStatus(token)
      .then((status) => {
        if (!cancelled) setBackendEnabled(status.enabled)
      })
      .catch(() => {
        if (!cancelled) setBackendEnabled(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  // Listen for subscription events from the hook and call backend
  useEffect(() => {
    function onSubscribe(event: Event) {
      const detail = (event as CustomEvent).detail
      api
        .registerPushSubscription(token, detail)
        .then(() => setBackendEnabled(true))
        .catch((err) => setApiError(err instanceof Error ? err.message : 'Could not save subscription'))
    }

    function onUnsubscribe() {
      api
        .unregisterPushSubscription(token)
        .then(() => setBackendEnabled(false))
        .catch((err) => setApiError(err instanceof Error ? err.message : 'Could not remove subscription'))
    }

    window.addEventListener('aframp:push-subscribe', onSubscribe)
    window.addEventListener('aframp:push-unsubscribe', onUnsubscribe)
    return () => {
      window.removeEventListener('aframp:push-subscribe', onSubscribe)
      window.removeEventListener('aframp:push-unsubscribe', onUnsubscribe)
    }
  }, [token])

  const isOn = subscribed && backendEnabled === true
  const isLoading = loading || backendEnabled === null

  if (permission === 'unsupported') {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-4">
        <BellOff className="size-5 shrink-0 text-dim" aria-hidden />
        <div>
          <p className="text-sm font-medium text-white">Push notifications</p>
          <p className="text-dim text-xs mt-0.5">
            Your browser or device does not support Web Push notifications. On iOS, make sure
            you have added Aframp to your Home Screen first.
          </p>
        </div>
      </div>
    )
  }

  if (permission === 'denied') {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-dashed border-destructive/30 bg-destructive/5 p-4">
        <BellOff className="size-5 shrink-0 text-destructive" aria-hidden />
        <div>
          <p className="text-sm font-medium text-white">Push notifications blocked</p>
          <p className="text-dim text-xs mt-0.5">
            You have blocked notification permissions. Enable them in your browser settings to
            receive payment alerts.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isOn ? (
            <Bell className="size-5 text-emerald-400" aria-hidden />
          ) : (
            <BellOff className="size-5 text-dim" aria-hidden />
          )}
          <div>
            <Label htmlFor="push-toggle" className="text-sm font-medium text-white cursor-pointer">
              Payment alerts
            </Label>
            <p className="text-dim text-xs">
              {isOn
                ? 'You will receive a notification when a payment is confirmed.'
                : 'Get notified instantly when a customer pays you.'}
            </p>
          </div>
        </div>

        {isLoading ? (
          <Loader2 className="size-5 animate-spin text-dim" aria-hidden />
        ) : (
          <Switch
            id="push-toggle"
            checked={isOn}
            onCheckedChange={(checked) => {
              setApiError(null)
              if (checked) void subscribe()
              else void unsubscribe()
            }}
            disabled={loading}
          />
        )}
      </div>

      {(error || apiError) && (
        <Alert variant="destructive" className="py-2">
          <AlertDescription className="text-xs">{error || apiError}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}