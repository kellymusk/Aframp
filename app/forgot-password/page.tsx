'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useSession } from '@/components/session-provider'
import { api, ApiError } from '@/lib/api'

export default function ForgotPasswordPage() {
  const { session, ready } = useSession()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (ready && session) router.replace('/charge')
  }, [ready, session, router])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (submitting) return
    setError(null)
    setSuccess(false)
    setSubmitting(true)
    try {
      await api.resetPasswordRequest(email)
      setSuccess(true)
      setEmail('')
    } catch (cause) {
      const message =
        cause instanceof ApiError && cause.status === 404
          ? 'Email address not found'
          : cause instanceof Error
            ? cause.message
            : 'Could not process password reset request'
      setError(message)
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-6 py-12">
        <header className="space-y-2">
          <h1 className="font-display text-3xl font-semibold tracking-tight">Check your email</h1>
          <p className="text-muted-foreground text-sm">
            We've sent a password reset link to your email address. Click the link to set a new password.
          </p>
        </header>

        <Link href="/login" className="text-primary font-medium hover:underline">
          Back to sign in
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-6 py-12">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Forgot password?</h1>
        <p className="text-muted-foreground text-sm">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

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

        <Button type="submit" size="lg" disabled={submitting} className="mt-2">
          {submitting ? 'Sending…' : 'Send reset link'}
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
