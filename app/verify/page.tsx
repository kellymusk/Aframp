'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useSession } from '@/components/session-provider'
import { ApiError, isOffline } from '@/lib/api'
import { CHALLENGE_SESSION_KEY } from '@/lib/otp-challenge'
import { AuthHeader } from '@/components/brand/auth-header'

const CODE_LENGTH = 6

type Flow = 'signup' | 'login'

/** Errors where the challenge itself is dead — no amount of retrying the
 * code helps, the only way forward is starting over. */
const TERMINAL_CODES = new Set(['OTP_EXPIRED', 'OTP_LOCKED', 'OTP_CHALLENGE_NOT_FOUND'])

/** `useSearchParams` opts the tree into client-side rendering, which Next
 * requires a Suspense boundary around during static prerendering. */
export default function VerifyOtpPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center">
          <LoadingSpinner />
        </main>
      }
    >
      <VerifyOtpForm />
    </Suspense>
  )
}

function VerifyOtpForm() {
  const { session, ready, completeOtp } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const flow: Flow = searchParams.get('flow') === 'signup' ? 'signup' : 'login'

  // #638: read challenge_id from sessionStorage instead of the URL
  const [challengeId, setChallengeId] = useState<string | null>(null)

  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const [terminal, setTerminal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const codeInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (ready && session) router.replace(flow === 'login' ? '/home' : '/charge')
  }, [ready, session, router, flow])

  // Read challenge_id from sessionStorage on mount. If missing, the user
  // arrived here directly (bookmark, back button) — send them to login.
  useEffect(() => {
    const stored = sessionStorage.getItem(CHALLENGE_SESSION_KEY)
    if (!stored) {
      router.replace('/login')
    } else {
      setChallengeId(stored)
    }
  }, [router])

  useEffect(() => {
    codeInputRef.current?.focus()
  }, [])

  async function handleVerify(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setOffline(false)

    if (!challengeId) return
    if (code.trim().length !== CODE_LENGTH) {
      setError(`Enter the ${CODE_LENGTH}-digit code.`)
      return
    }

    setSubmitting(true)
    try {
      await completeOtp(challengeId, code.trim())
      // #638: clear the challenge_id from sessionStorage on success
      sessionStorage.removeItem(CHALLENGE_SESSION_KEY)
      router.replace(flow === 'login' ? '/home' : '/charge')
    } catch (cause) {
      // #638: clear the challenge_id from sessionStorage on terminal failure
      if (cause instanceof ApiError && cause.code && TERMINAL_CODES.has(cause.code)) {
        sessionStorage.removeItem(CHALLENGE_SESSION_KEY)
        setTerminal(true)
        setError(
          cause.code === 'OTP_LOCKED'
            ? 'Too many incorrect attempts. Start over to get a new code.'
            : 'That code has expired. Start over to get a new one.'
        )
      } else {
        // Wrong code (or a network blip) — let them try again without losing the challenge.
        setError(cause instanceof Error ? cause.message : 'That code is incorrect')
        setOffline(isOffline(cause))
        setCode('')
        codeInputRef.current?.focus()
      }
      setSubmitting(false)
    }
  }

  if (!challengeId) return null

  const restartHref = flow === 'signup' ? '/signup' : '/login'

  return (
    <main className="font-brand mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-6 py-12">
      <AuthHeader
        title="Check your phone"
        subtitle={
          flow === 'signup'
            ? 'Enter the code we texted you to finish creating your account.'
            : 'Enter the code we texted you to finish signing in.'
        }
      />

      <form noValidate onSubmit={handleVerify} className="flex flex-col gap-4">
        {error && (
          <Alert variant={offline ? 'notice' : 'destructive'}>
            {offline && <WifiOff className="size-4" aria-hidden />}
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="code">6-digit code</Label>
          <Input
            id="code"
            ref={codeInputRef}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={CODE_LENGTH}
            required
            disabled={terminal}
            className="text-center text-lg tracking-[0.5em]"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
          />
        </div>

        {terminal ? (
          <Button asChild size="lg" className="mt-2">
            <Link href={restartHref}>Start over</Link>
          </Button>
        ) : (
          <Button type="submit" size="lg" disabled={submitting} className="mt-2">
            {submitting ? 'Verifying…' : 'Verify'}
          </Button>
        )}
      </form>

      {!terminal && (
        <p className="text-muted-foreground text-center text-sm">
          Didn&apos;t get a code?{' '}
          <Link href={restartHref} className="text-primary font-medium hover:underline">
            Start over
          </Link>{' '}
          to have it resent.
        </p>
      )}
    </main>
  )
}
