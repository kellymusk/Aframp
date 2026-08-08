'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Bell,
  Mail,
  Smartphone,
  TrendingUp,
  Shield,
  CreditCard,
  Gift,
  Megaphone,
  Check,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

interface NotificationPref {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  email: boolean
  push: boolean
  sms: boolean
}

const defaultPrefs: NotificationPref[] = [
  {
    id: 'transactions',
    label: 'Transaction Alerts',
    description: 'Get notified for sends, receives, and swaps',
    icon: <CreditCard className="w-4 h-4" />,
    email: true,
    push: true,
    sms: false,
  },
  {
    id: 'price-alerts',
    label: 'Price Alerts',
    description: 'Crypto price movements and thresholds',
    icon: <TrendingUp className="w-4 h-4" />,
    email: true,
    push: true,
    sms: false,
  },
  {
    id: 'security',
    label: 'Security Alerts',
    description: 'Login attempts, password changes, and suspicious activity',
    icon: <Shield className="w-4 h-4" />,
    email: true,
    push: true,
    sms: true,
  },
  {
    id: 'promotions',
    label: 'Promotions & Offers',
    description: 'Special deals, referral rewards, and campaigns',
    icon: <Gift className="w-4 h-4" />,
    email: false,
    push: false,
    sms: false,
  },
  {
    id: 'product-updates',
    label: 'Product Updates',
    description: 'New features, improvements, and announcements',
    icon: <Megaphone className="w-4 h-4" />,
    email: true,
    push: false,
    sms: false,
  },
]

type Channel = 'email' | 'push' | 'sms'

export function NotificationsTab() {
  const [prefs, setPrefs] = useState<NotificationPref[]>(defaultPrefs)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const togglePref = (id: string, channel: Channel) => {
    setPrefs((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [channel]: !p[channel] } : p))
    )
    setSaved(false)
  }

  const toggleAllEmail = () => {
    const allOn = prefs.every((p) => p.email)
    setPrefs((prev) => prev.map((p) => ({ ...p, email: !allOn })))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const allEmailOn = prefs.every((p) => p.email)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Quick Toggle */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                Email Notifications
              </CardTitle>
              <CardDescription>Master toggle for all email alerts</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="toggle-all-email" className="text-sm text-muted-foreground">
                {allEmailOn ? 'All on' : 'Toggle all'}
              </Label>
              <Switch
                id="toggle-all-email"
                checked={allEmailOn}
                onCheckedChange={toggleAllEmail}
                aria-label="Toggle all email notifications"
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Notification Categories */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            Notification Preferences
          </CardTitle>
          <CardDescription>Choose how you want to be notified for each category</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {/* Channel Headers */}
          <div className="grid grid-cols-[1fr_auto] gap-4 pb-3">
            <div />
            <div className="flex items-center gap-6 sm:gap-10 pr-1">
              <div className="flex flex-col items-center gap-1 min-w-[40px]">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                  Email
                </span>
              </div>
              <div className="flex flex-col items-center gap-1 min-w-[40px]">
                <Bell className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                  Push
                </span>
              </div>
              <div className="flex flex-col items-center gap-1 min-w-[40px]">
                <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                  SMS
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {prefs.map((pref, index) => (
            <motion.div
              key={pref.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="grid grid-cols-[1fr_auto] gap-4 py-4 items-center">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 rounded-md bg-primary/10 text-primary">
                    {pref.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{pref.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{pref.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 sm:gap-10 pr-1">
                  <div className="flex justify-center min-w-[40px]">
                    <Switch
                      id={`${pref.id}-email`}
                      checked={pref.email}
                      onCheckedChange={() => togglePref(pref.id, 'email')}
                      aria-label={`${pref.label} email notifications`}
                    />
                  </div>
                  <div className="flex justify-center min-w-[40px]">
                    <Switch
                      id={`${pref.id}-push`}
                      checked={pref.push}
                      onCheckedChange={() => togglePref(pref.id, 'push')}
                      aria-label={`${pref.label} push notifications`}
                    />
                  </div>
                  <div className="flex justify-center min-w-[40px]">
                    <Switch
                      id={`${pref.id}-sms`}
                      checked={pref.sms}
                      onCheckedChange={() => togglePref(pref.id, 'sms')}
                      aria-label={`${pref.label} SMS notifications`}
                    />
                  </div>
                </div>
              </div>
              {index < prefs.length - 1 && <Separator />}
            </motion.div>
          ))}
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button
          id="notifications-save-btn"
          size="sm"
          onClick={handleSave}
          disabled={saving}
          className="min-w-[140px]"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <>
              <Check className="w-4 h-4" />
              Preferences Saved
            </>
          ) : (
            'Save Preferences'
          )}
        </Button>
      </div>
    </motion.div>
  )
}
