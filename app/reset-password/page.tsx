'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useSession } from '@/components/session-provider'
import { api, ApiError } from '@/lib/api'

const MIN_PASSWORD_LENGTH = 8

function calculatePasswordStrength(password: string): 'weak' | 'fair' | 'strong' {
  if (password.length < 8) return 'weak'
  if (password.length < 12) return 'fair'

  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)

  const diversity = [hasUppercase, hasLowercase, hasNumbers, hasSpecial].filter(Boolean).length

  if (password.length >= 16 && diversity >= 3) return 'strong'
  if (password.length >= 12 && diversity >= 2) return 'fair'
  return 'weak'
}

export default function ResetPasswordPage() {
  const { session, ready } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const passwordStrength = calculatePasswordStrength(password)

  useEffect(() => {
    if (ready && session) router.replace('/charge')
  }, [ready, session, router])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (submitting) return
    setError(null)

    if (!token) {
      setError('Invalid or missing reset token')
      return
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setSubmitting(true)
    try {
      await api.resetPassword(token, password)
      setSuccess(true)
    } catch (cause) {
      const message =
        cause instanceof ApiError && cause.status === 400
          ? 'Invalid or expired reset token. Please request a new password reset.'
          : cause instanceof Error
            ? cause.message
            : 'Could not reset your password'
      setError(message)
      setSubmitting(false)
    }
  }

  if (!token) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-6 py-12">
        <Alert variant="destructive">
          <AlertDescription>Invalid or missing reset token</AlertDescription>
        </Alert>
        <Link href="/forgot-password" className="text-primary font-medium hover:underline">
          Request a new password reset
        </Link>
      </main>
    )
  }

  if (success) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-6 py-12">
        <header className="space-y-2">
          <h1 className="font-display text-3xl font-semibold tracking-tight">Password reset successful</h1>
          <p className="text-muted-foreground text-sm">Your password has been updated. You can now sign in with your new password.</p>
        </header>

        <Link href="/login" className="text-primary font-medium hover:underline">
          Go to sign in
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-6 py-12">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Set a new password</h1>
        <p className="text-muted-foreground text-sm">Choose a strong password to secure your account.</p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            {password && (
              <Badge
                variant={
                  passwordStrength === 'strong'
                    ? 'default'
                    : passwordStrength === 'fair'
                      ? 'secondary'
                      : 'destructive'
                }
                className="text-xs"
              >
                {passwordStrength === 'strong'
                  ? 'Strong'
                  : passwordStrength === 'fair'
                    ? 'Fair'
                    : 'Weak'}
              </Badge>
            )}
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {password.length > 0 && password.length < MIN_PASSWORD_LENGTH && (
            <p className="text-destructive text-xs">
              Use at least {MIN_PASSWORD_LENGTH} characters for your password.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm password</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          {confirmPassword && password !== confirmPassword && (
            <p className="text-destructive text-xs">Passwords do not match</p>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={submitting || password.length < MIN_PASSWORD_LENGTH}
          className="mt-2"
        >
          {submitting ? 'Resetting password…' : 'Reset password'}
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        Remember your password?{' '}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  )
}
