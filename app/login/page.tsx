'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useSession } from '@/components/session-provider'
import { isOffline } from '@/lib/api'
import {
  getPaymentIntent,
  getPostAuthPath,
  getSignupPath,
  getVerifyPath,
} from '@/lib/payment-intent'

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center">
          <LoadingSpinner />
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const { session, ready, signIn } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const intent = getPaymentIntent(searchParams.get('intent'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (ready && session) router.replace(getPostAuthPath(intent))
  }, [ready, session, router, intent])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setOffline(false)

    if (!email.trim() || !password.trim()) {
      setError('Please enter both your email and password.')
      setSubmitting(false)
      return
    }

    setSubmitting(true)
    try {
      const result = await signIn(email.trim(), password)
      if ('challenge_id' in result) {
        router.push(getVerifyPath(result.challenge_id, 'login', intent))
      } else {
        router.replace(getPostAuthPath(intent))
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sign in failed')
      setOffline(isOffline(cause))
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-6 py-12">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Aframp Pay</h1>
        <p className="text-muted-foreground text-sm">Sign in to start taking payments.</p>
      </header>

      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
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
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
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
        <Link href={getSignupPath(intent)} className="text-primary font-medium hover:underline">
          Create a merchant account
        </Link>
      </p>
    </main>
  )
}
