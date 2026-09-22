'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useSession } from '@/components/session-provider'

const CODE_LENGTH = 6
const RESEND_COOLDOWN_SECS = 30

type Step = 'email' | 'code'

export default function OtpLoginPage() {
  const { session, ready, requestOtp, verifyOtp } = useSession()
  const router = useRouter()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const codeInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (ready && session) router.replace('/charge')
  }, [ready, session, router])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => setCooldown((prev) => prev - 1), 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  useEffect(() => {
    if (step === 'code') codeInputRef.current?.focus()
  }, [step])

  async function sendCode() {
    if (!email.trim()) {
      setError('Enter your email first.')
      return
    }

    setError(null)
    setSubmitting(true)
    try {
      await requestOtp(email.trim())
      setStep('code')
      setCooldown(RESEND_COOLDOWN_SECS)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not send a code')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRequestCode(event: React.FormEvent) {
    event.preventDefault()
    await sendCode()
  }

  async function handleVerify(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (code.trim().length !== CODE_LENGTH) {
      setError(`Enter the ${CODE_LENGTH}-digit code.`)
      return
    }

    setSubmitting(true)
    try {
      await verifyOtp(email.trim(), code.trim())
      router.replace('/charge')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That code is incorrect or expired')
      setSubmitting(false)
    }
  }

  function changeEmail() {
    setStep('email')
    setCode('')
    setError(null)
    setCooldown(0)
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-6 py-12">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Aframp Pay</h1>
        <p className="text-muted-foreground text-sm">
          {step === 'email'
            ? 'Sign in with a one-time code — no password needed.'
            : `Enter the code we sent to ${email.trim()}.`}
        </p>
      </header>

      {step === 'email' ? (
        <form noValidate onSubmit={handleRequestCode} className="flex flex-col gap-4">
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
            {submitting ? 'Sending code…' : 'Send code'}
          </Button>
        </form>
      ) : (
        <form noValidate onSubmit={handleVerify} className="flex flex-col gap-4">
          {error && (
            <Alert variant="destructive">
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
              className="text-center text-lg tracking-[0.5em]"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            />
          </div>

          <Button type="submit" size="lg" disabled={submitting} className="mt-2">
            {submitting ? 'Verifying…' : 'Verify and sign in'}
          </Button>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={changeEmail}
              className="text-muted-foreground hover:text-foreground"
            >
              Use a different email
            </button>
            <button
              type="button"
              onClick={sendCode}
              disabled={cooldown > 0 || submitting}
              className="text-primary font-medium hover:underline disabled:pointer-events-none disabled:text-muted-foreground disabled:no-underline"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </button>
          </div>
        </form>
      )}

      <p className="text-muted-foreground text-center text-sm">
        <Link href="/login" className="text-primary font-medium hover:underline">
          Sign in with a password instead
        </Link>
      </p>
    </main>
  )
}
