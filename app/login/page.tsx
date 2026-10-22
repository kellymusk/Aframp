'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useSession } from '@/components/session-provider'
import { ApiError, isOffline } from '@/lib/api'
import { CHALLENGE_SESSION_KEY } from '@/lib/otp-challenge'
import { PasswordInput } from '@/components/ui/password-input'
import { AuthHeader } from '@/components/brand/auth-header'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// #868: only allow same-origin relative paths as post-login destinations.
// Reject absolute URLs, protocol-relative (//), backslash tricks, and
// anything that could escape the origin.
function safeNextPath(raw: string | null): string {
  if (!raw) return '/home'
  if (!raw.startsWith('/')) return '/home'
  if (raw.startsWith('//') || raw.startsWith('/\\')) return '/home'
  if (raw.includes('\\')) return '/home'
  // Reject control characters and whitespace that could smuggle a scheme.
  if (/[\u0000-\u001f\s]/.test(raw)) return '/home'
  return raw
}

export default function LoginPage() {
  const { session, ready, signIn } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = safeNextPath(searchParams.get('next'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const [rateLimited, setRateLimited] = useState(false)
  const [retryAfter, setRetryAfter] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (ready && session) router.replace(nextPath)
  }, [ready, session, router, nextPath])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setEmailError(null)
    setOffline(false)
    setRateLimited(false)
    setRetryAfter(null)

    if (!email.trim() || !password.trim()) {
      setError('Please enter both your email and password.')
      setSubmitting(false)
      return
    }

    if (!EMAIL_PATTERN.test(email.trim())) {
      setEmailError('Please enter a valid email address.')
      setSubmitting(false)
      return
    }

    setSubmitting(true)
    try {
      const result = await signIn(email.trim(), password)
      if ('challenge_id' in result) {
        // #638: store challenge_id in sessionStorage instead of the URL
        sessionStorage.setItem(CHALLENGE_SESSION_KEY, result.challenge_id)
        router.push('/verify?flow=login')
      } else {
        router.replace(nextPath)
      }
    } catch (cause) {
      // #637: handle 429 rate-limit separately with clear guidance
      if (cause instanceof ApiError && cause.status === 429) {
        setRateLimited(true)
        // Parse Retry-After header value if the backend embeds it in the
        // error code, e.g. code = "RETRY_AFTER_60"
        const match = typeof cause.code === 'string' ? cause.code.match(/(\d+)/) : null
        setRetryAfter(match ? parseInt(match[1], 10) : null)
        setError(null)
      } else {
        setError(cause instanceof Error ? cause.message : 'Sign in failed')
        setOffline(isOffline(cause))
      }
      setSubmitting(false)
    }
  }

  return (
    <main className="font-brand mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-6 py-12">
      <AuthHeader title="Sign in" subtitle="Sign in to start taking payments." />

      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        {rateLimited && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>
              Too many sign-in attempts. Please wait
              {retryAfter != null ? ` ${retryAfter} seconds` : ' a moment'} before trying again.
            </AlertDescription>
          </Alert>
        )}

        {error && !rateLimited && (
          <Alert variant={offline ? 'notice' : 'destructive'}>
            {offline && <WifiOff className="size-4" aria-hidden />}
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
            aria-invalid={emailError ? true : undefined}
            aria-describedby={emailError ? 'email-error' : undefined}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              if (emailError) setEmailError(null)
            }}
          />
          {emailError && (
            <p id="email-error" className="text-destructive text-sm" role="alert">
              {emailError}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <Button type="submit" size="lg" disabled={submitting} className="mt-2">
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        New here?{' '}
        <Link href="/signup" className="text-primary font-medium hover:underline">
          Create a merchant account
        </Link>
      </p>
    </main>
  )
}
