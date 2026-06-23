'use client'

import { useEffect, useState } from 'react'
import { Bell, Mail, ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import type { PriceAlertEvent, PriceAlertRule } from '@/lib/price-alerts'

interface PriceAlertStore {
  rules: PriceAlertRule[]
  history: PriceAlertEvent[]
  currentPrice: number
}

const INITIAL_RULE = {
  email: '',
  direction: 'below' as const,
  threshold: 1000,
  channels: {
    email: true,
    push: true,
  },
}

export default function PriceAlertPage() {
  const [store, setStore] = useState<PriceAlertStore | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [checking, setChecking] = useState(false)
  const [rule, setRule] = useState(INITIAL_RULE)

  useEffect(() => {
    fetchStore()
  }, [])

  const fetchStore = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/pricealerts', { cache: 'no-store' })
      const data = (await response.json()) as PriceAlertStore
      setStore(data)
    } catch (error) {
      console.error(error)
      toast.error('Unable to load price alert settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    setSaving(true)

    try {
      const response = await fetch('/api/pricealerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
      })

      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || 'Unable to save alert')
        return
      }

      toast.success('Price alert saved')
      setRule(INITIAL_RULE)
      await fetchStore()
    } catch (error) {
      console.error(error)
      toast.error('Unable to save alert')
    } finally {
      setSaving(false)
    }
  }

  const handleCheckNow = async () => {
    setChecking(true)
    try {
      const response = await fetch('/api/pricealerts/check', {
        method: 'POST',
      })
      const data = await response.json()
      if (response.ok) {
        toast.success(
          data.events && data.events.length > 0
            ? 'Price alert notifications triggered'
            : 'No alerts matched the current price'
        )
        setStore(data)
      } else {
        toast.error(data.error || 'Unable to run price check')
      }
    } catch (error) {
      console.error(error)
      toast.error('Unable to run price check')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="space-y-10 py-10">
      <div className="space-y-4">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
            <Bell className="h-4 w-4" /> Price alert notifications
          </div>
          <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-5xl">
            Track cNGN and never miss a move.
          </h1>
          <p className="text-base leading-8 text-muted-foreground sm:text-lg">
            Save custom cNGN thresholds, review alert history, and trigger backend checks for email and push notifications.
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Set a new alert threshold</CardTitle>
            <CardDescription>
              When cNGN crosses your target, Aframp will queue email or push notifications for you.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={rule.email}
                  onChange={(event) => setRule({ ...rule, email: event.target.value })}
                  placeholder="you@aframp.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="threshold">Threshold (₦)</Label>
                <Input
                  id="threshold"
                  type="number"
                  min={1}
                  value={rule.threshold}
                  onChange={(event) =>
                    setRule({
                      ...rule,
                      threshold: Number(event.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Direction</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={rule.direction === 'below' ? 'secondary' : 'ghost'}
                    onClick={() => setRule({ ...rule, direction: 'below' })}
                  >
                    Below
                  </Button>
                  <Button
                    type="button"
                    variant={rule.direction === 'above' ? 'secondary' : 'ghost'}
                    onClick={() => setRule({ ...rule, direction: 'above' })}
                  >
                    Above
                  </Button>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Email</Label>
                  <Switch
                    checked={rule.channels.email}
                    onCheckedChange={(checked) =>
                      setRule({
                        ...rule,
                        channels: { ...rule.channels, email: checked },
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Push</Label>
                  <Switch
                    checked={rule.channels.push}
                    onCheckedChange={(checked) =>
                      setRule({
                        ...rule,
                        channels: { ...rule.channels, push: checked },
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <Button type="submit" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Saving…' : 'Save alert'}
              </Button>
              <Button type="button" variant="outline" onClick={handleCheckNow} disabled={checking}>
                {checking ? 'Checking…' : 'Check now'}
              </Button>
            </div>

            <Separator />

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-border/50 bg-secondary/50 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Current cNGN price</p>
                <p className="mt-3 text-3xl font-bold text-foreground">
                  {store?.currentPrice ? `₦${store.currentPrice.toLocaleString()}` : '—'}
                </p>
              </div>
              <div className="rounded-3xl border border-border/50 bg-secondary/50 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Active alerts</p>
                <p className="mt-3 text-3xl font-bold text-foreground">{store?.rules.length ?? 0}</p>
              </div>
              <div className="rounded-3xl border border-border/50 bg-secondary/50 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">History records</p>
                <p className="mt-3 text-3xl font-bold text-foreground">{store?.history.length ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Alert history</CardTitle>
              <CardDescription>Recent notifications from cNGN checks.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="rounded-3xl border border-dashed border-border/40 bg-secondary/50 p-8 text-center text-sm text-muted-foreground">
                  Loading alert history…
                </div>
              ) : !store?.history.length ? (
                <div className="rounded-3xl border border-dashed border-border/40 bg-secondary/50 p-8 text-center text-sm text-muted-foreground">
                  No alert history yet. Create a threshold and run the check.
                </div>
              ) : (
                store.history.slice(0, 6).map((event) => (
                  <div key={event.id} className="rounded-3xl border border-border/50 bg-secondary/60 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {event.channel === 'email' ? <Mail className="inline h-4 w-4 align-text-bottom text-primary" /> : <ArrowUp className="inline h-4 w-4 align-text-bottom text-primary" />} {' '}
                          {event.direction === 'below' ? 'Dropped below' : 'Risen above'} ₦{event.threshold.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">{new Date(event.notifiedAt).toLocaleString()}</p>
                      </div>
                      <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase text-primary">
                        {event.channel}
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">Current price was ₦{event.actualValue.toLocaleString()}. {event.message}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Active alert rules</CardTitle>
              <CardDescription>Rules are evaluated when you run a check or when the backend cron fires.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {store?.rules.length ? (
                store.rules.map((item) => (
                  <div key={item.id} className="rounded-3xl border border-border/50 bg-secondary/50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.direction === 'below' ? 'Below' : 'Above'} ₦{item.threshold.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{item.channels.email ? 'Email' : ''}{item.channels.email && item.channels.push ? ', ' : ''}{item.channels.push ? 'Push' : ''} · {item.email}</p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {item.lastTriggeredAt ? `Last triggered ${new Date(item.lastTriggeredAt).toLocaleString()}` : 'Never triggered'}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-border/40 bg-secondary/50 p-8 text-center text-sm text-muted-foreground">
                  No active alert rules yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
