'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useSession } from '@/components/session-provider'
import { isOffline } from '@/lib/api'
import { CHALLENGE_SESSION_KEY } from '@/lib/otp-challenge'

import { getPasswordStrength, isCommonPassword } from '@/lib/password-strength'
import { PasswordInput } from '@/components/ui/password-input'
import { AuthHeader } from '@/components/brand/auth-header'

const MIN_PASSWORD_LENGTH = 8

const STRENGTH_COLOR = [
  'bg-destructive',
  'bg-destructive',
  'bg-yellow-500',
  'bg-green-500',
  'bg-green-600',
]

export default function SignupPage() {
  const { session, ready, signUp } = useSession()
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phone, setPhone] = useState('')
  const strength = getPasswordStrength(password)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (ready && session) router.replace('/charge')
  }, [ready, session, router])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setOffline(false)

    if (!name.trim() || !email.trim() || !password.trim() || !phone.trim()) {
      setError('Please fill in your business name, email, password, and phone number.')
      setSubmitting(false)
      return
    }

    // Mirrors the server's own check so the error lands next to the field.
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`)
      setSubmitting(false)
      return
    }

    if (isCommonPassword(password)) {
      setError('That password is too common. Choose something harder to guess.')
      setSubmitting(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setSubmitting(false)
      return
    }

    setSubmitting(true)
    try {
      const challenge = await signUp(email.trim(), password, name.trim(), phone.trim())
      // #638: store challenge_id in sessionStorage instead of the URL
      sessionStorage.setItem(CHALLENGE_SESSION_KEY, challenge.challenge_id)
      router.push('/verify?flow=signup')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create your account')
      setOffline(isOffline(cause))
      setSubmitting(false)
    }
  }

  return (
    <main className="font-brand mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-6 py-12">
      <AuthHeader
        title="Create your account"
        subtitle="Takes a minute. You'll get a payment address straight after."
      />

      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <Alert variant={offline ? 'notice' : 'destructive'}>
            {offline && <WifiOff className="size-4" aria-hidden />}
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">Business name</Label>
          <Input
            id="name"
            autoComplete="organization"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone number</Label>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="0801 234 5678"
            required
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
          <p className="text-muted-foreground text-xs">
            We&apos;ll text you a code to verify it — every sign-in after this uses it too.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {password ? (
            <div aria-live="polite" className="space-y-1">
              <div className="flex gap-1" aria-hidden>
                {[1, 2, 3, 4].map((segment) => (
                  <div
                    key={segment}
                    className={`h-1 flex-1 rounded-full ${
                      strength.score >= segment ? STRENGTH_COLOR[strength.score] : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
              <p className="text-muted-foreground text-xs">
                Strength: {strength.label}
                {strength.isCommon && ' — this is a very common password'}
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">
              At least {MIN_PASSWORD_LENGTH} characters. Mix letters, numbers and symbols.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm password</Label>
          <PasswordInput
            id="confirm-password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          {confirmPassword && confirmPassword !== password && (
            <p className="text-destructive text-xs">Passwords don&apos;t match.</p>
          )}
        </div>

        <Button type="submit" size="lg" disabled={submitting} className="mt-2">
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{' '}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  )
}
