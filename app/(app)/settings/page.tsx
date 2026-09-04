'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Bell, Mail, Save, Trash2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { PushNotificationToggle } from '@/components/push-notification-toggle'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { api, ApiError, type Me } from '@/lib/api'
import { useAuthenticatedSession, useSession } from '@/components/session-provider'

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function ProfilePage() {
  const { token } = useAuthenticatedSession()
  const { signOut, refreshMe, me: cachedMe } = useSession()
  const router = useRouter()

  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [merchantName, setMerchantName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true)
      setError(null)
      try {
        const data = await api.getMe(token, signal)
        setMe(data)
        setName(data.name ?? '')
        setMerchantName(data.merchant_name ?? '')
        setNewEmail(data.email ?? '')
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        if (cause instanceof ApiError && cause.status === 0) throw cause
        setError(cause instanceof Error ? cause.message : 'Could not load profile')
      } finally {
        setLoading(false)
      }
    },
    [token]
  )

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  // If session provider already has cached me data, use it to avoid flash
  useEffect(() => {
    if (cachedMe && !me) {
      setMe(cachedMe)
      setName(cachedMe.name ?? '')
      setMerchantName(cachedMe.merchant_name ?? '')
      setNewEmail(cachedMe.email ?? '')
      setLoading(false)
    }
  }, [cachedMe, me])

  function showSuccess(message: string) {
    setSuccess(message)
    setTimeout(() => setSuccess(null), 4000)
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault()
    setSavingProfile(true)
    setError(null)
    try {
      const updated = await api.updateProfile(token, {
        name: name.trim() || undefined,
        merchant_name: merchantName.trim() || undefined,
      })
      setMe(updated)
      await refreshMe()
      showSuccess('Profile updated successfully.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  async function sendEmailVerification(event: React.FormEvent) {
    event.preventDefault()
    const email = newEmail.trim()
    if (!email || email === me?.email) {
      setError('Enter a new email address to change it.')
      return
    }
    setSavingEmail(true)
    setError(null)
    try {
      await api.changeEmail(token, email)
      setEmailSent(true)
      showSuccess('Verification email sent. Check your inbox.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not request email change')
    } finally {
      setSavingEmail(false)
    }
  }

  async function deleteAccount() {
    setDeleting(true)
    setError(null)
    try {
      await api.deleteAccount(token)
      signOut()
      router.replace('/login')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete account')
      setDeleting(false)
    }
  }

  if (loading && !me) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    )
  }

  const displayName = me?.merchant_name ?? me?.name ?? 'Merchant'
  const displayEmail = me?.email ?? ''

  return (
    <div className="space-y-8">
      {/* Header with avatar */}
      <div className="flex items-center gap-4">
        <Avatar size="lg" className="bg-primary text-primary-foreground">
          <AvatarFallback className="text-lg font-bold">{getInitials(displayName)}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-lg font-bold tracking-tight text-white">{displayName}</h2>
          <p className="text-dim text-sm">{displayEmail}</p>
        </div>
      </div>

      {success && (
        <Alert className="border-emerald-500/30 bg-emerald-500/10">
          <AlertDescription className="text-emerald-200">{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Profile form */}
      <section className="bg-panel border-hairline rounded-2xl border p-5 space-y-4">
        <div className="flex items-center gap-2">
          <User className="size-4 text-dim" aria-hidden />
          <h3 className="font-bold text-white">Profile details</h3>
        </div>

        <form onSubmit={saveProfile} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Your name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="merchant-name">Business / merchant name</Label>
            <Input
              id="merchant-name"
              value={merchantName}
              onChange={(e) => setMerchantName(e.target.value)}
              placeholder="Your business name"
            />
            <p className="text-dim text-xs">
              This appears on your wallet page and in payment receipts.
            </p>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? (
                'Saving…'
              ) : (
                <>
                  <Save className="size-4" aria-hidden /> Save changes
                </>
              )}
            </Button>
          </div>
        </form>
      </section>

      {/* Email change */}
      <section className="bg-panel border-hairline rounded-2xl border p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="size-4 text-dim" aria-hidden />
          <h3 className="font-bold text-white">Email address</h3>
        </div>

        {emailSent ? (
          <Alert className="border-blue-500/30 bg-blue-500/10">
            <AlertDescription className="text-blue-200">
              A verification email has been sent to <strong>{newEmail}</strong>. Click the link in
              that email to confirm the change. You can still use your current email until then.
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={sendEmailVerification} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Current email</Label>
              <Input
                id="email"
                type="email"
                value={newEmail}
                onChange={(e) => {
                  setNewEmail(e.target.value)
                  setEmailSent(false)
                }}
                placeholder="you@example.com"
              />
              <p className="text-dim text-xs">
                Changing your email requires verification. We will send a confirmation link to the
                new address.
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="outline"
                disabled={savingEmail || !newEmail.trim() || newEmail.trim() === displayEmail}
              >
                {savingEmail ? 'Sending…' : 'Change email'}
              </Button>
            </div>
          </form>
        )}
      </section>

      {/* Push notifications */}
      <section className="bg-panel border-hairline rounded-2xl border p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="size-4 text-dim" aria-hidden />
          <h3 className="font-bold text-white">Notifications</h3>
        </div>
        <PushNotificationToggle />
      </section>

      <Separator />

      {/* Danger zone */}
      <section className="bg-panel border-hairline rounded-2xl border p-5 space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-destructive" aria-hidden />
          <h3 className="font-bold text-destructive">Danger zone</h3>
        </div>

        <p className="text-dim text-sm">
          Deleting your account permanently removes all your data, including payment history,
          wallet, and API keys. This action cannot be undone.
        </p>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full sm:w-auto">
              <Trash2 className="size-4" aria-hidden /> Delete account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete your merchant account, wallet, payment history, and all
                API keys. Any pending payments or withdrawals will be lost. This action{' '}
                <strong>cannot be undone</strong>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  void deleteAccount()
                }}
                disabled={deleting}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {deleting ? 'Deleting…' : 'Yes, delete my account'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  )
}
