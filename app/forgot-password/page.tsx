'use client'

import { useState } from 'react'
import Link from 'next/link'
import { WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PasswordInput } from '@/components/ui/password-input'
import { AuthHeader } from '@/components/brand/auth-header'
import { api, ApiError, isOffline } from '@/lib/api'
import { isCommonPassword } from '@/lib/password-strength'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8
const CODE_LENGTH = 6

export default function ForgotPasswordPage() {
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  function fail(cause: unknown, fallback: string) {
    if (cause instanceof ApiError && cause.status === 429) {
      setError('Too many attempts. Please wait a moment before trying again.')
    } else {
      setError(cause instanceof Error ? cause.message : fallback)
      setOffline(isOffline(cause))
    }
    setSubmitting(false)
  }

  async function handleRequest(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setOffline(false)
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError('Enter a valid email address.')
      return
    }
    setSubmitting(true)
    try {
      const challenge = await api.requestPasswordReset(email.trim())
      setChallengeId(challenge.challenge_id)
      setSubmitting(false)
    } catch (cause) {
      fail(cause, 'Could not start the reset')
    }
  }

  async function handleConfirm(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setOffline(false)
    if (!challengeId) return
    if (code.trim().length !== CODE_LENGTH) {
      setError(`Enter the ${CODE_LENGTH}-digit code.`)
      return
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`)
      return
    }
    if (isCommonPassword(password)) {
      setError('That password is too common. Choose something harder to guess.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    try {
      await api.confirmPasswordReset(challengeId, code.trim(), password)
      setDone(true)
      setSubmitting(false)
    } catch (cause) {
      fail(cause, 'Could not reset your password')
    }
  }

  if (done) {
    return (
      <main className="font-brand mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-6 py-12">
        <AuthHeader
          title="Password updated"
          subtitle="You've been signed out everywhere. Sign in with your new password."
        />
        <Button asChild size="lg">
          <Link href="/login">Sign in</Link>
        </Button>
      </main>
    )
  }

  return (
    <main className="font-brand mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-6 py-12">
      <AuthHeader
        title="Reset your password"
        subtitle={
          challengeId
            ? "If that email has an account, we've texted a code to its verified phone."
            : "Enter your account email and we'll text a code to your verified phone."
        }
      />

      <form
        noValidate
        onSubmit={challengeId ? handleConfirm : handleRequest}
        className="flex flex-col gap-4"
      >
        {error && (
          <Alert variant={offline ? 'notice' : 'destructive'}>
            {offline && <WifiOff className="size-4" aria-hidden />}
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!challengeId ? (
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
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="code">6-digit code</Label>
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={CODE_LENGTH}
                required
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <PasswordInput
                id="new-password"
                autoComplete="new-password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Confirm new password</Label>
              <PasswordInput
                id="confirm-new-password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>
          </>
        )}

        <Button type="submit" size="lg" disabled={submitting} className="mt-2">
          {challengeId
            ? submitting
              ? 'Updating…'
              : 'Update password'
            : submitting
              ? 'Sending code…'
              : 'Send code'}
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        Remembered it?{' '}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Back to sign in
        </Link>
      </p>
    </main>
  )
}
