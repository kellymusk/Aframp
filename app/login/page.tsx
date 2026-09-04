'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useSession } from '@/components/session-provider'
import { FREIGHTER_INSTALL_URL, FreighterNotInstalledError } from '@/lib/freighter'

export default function LoginPage() {
  const { session, ready, signIn, signInWithFreighter } = useSession()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [walletConnecting, setWalletConnecting] = useState(false)
  const [walletError, setWalletError] = useState<string | null>(null)
  const [freighterMissing, setFreighterMissing] = useState(false)

  useEffect(() => {
    if (ready && session) router.replace('/charge')
  }, [ready, session, router])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (submitting) return
    setError(null)
    setSubmitting(true)
    try {
      await signIn(email, password)
      router.replace('/charge')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sign in failed')
      setSubmitting(false)
    }
  }

  async function handleFreighterSignIn() {
    setWalletError(null)
    setFreighterMissing(false)
    setWalletConnecting(true)
    try {
      await signInWithFreighter()
      router.replace('/charge')
    } catch (cause) {
      if (cause instanceof FreighterNotInstalledError) {
        setFreighterMissing(true)
      } else {
        setWalletError(cause instanceof Error ? cause.message : 'Could not sign in with Freighter')
      }
      setWalletConnecting(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-6 py-12">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Aframp Pay</h1>
        <p className="text-muted-foreground text-sm">Sign in to start taking payments.</p>
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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-primary text-sm font-medium hover:underline">
              Forgot password?
            </Link>
          </div>
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

      <div className="flex items-center gap-3">
        <div className="bg-border h-px flex-1" />
        <span className="text-muted-foreground text-xs uppercase tracking-widest">or</span>
        <div className="bg-border h-px flex-1" />
      </div>

      <div className="space-y-2">
        {walletError && (
          <Alert variant="destructive">
            <AlertDescription>{walletError}</AlertDescription>
          </Alert>
        )}

        {freighterMissing ? (
          <Alert>
            <AlertDescription>
              Freighter isn&apos;t installed in this browser.{' '}
              <a
                href={FREIGHTER_INSTALL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-medium hover:underline"
              >
                Install the extension
              </a>{' '}
              and try again, or sign in with email above.
            </AlertDescription>
          </Alert>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={walletConnecting}
            onClick={handleFreighterSignIn}
            className="w-full"
          >
            {walletConnecting ? 'Connecting to Freighter…' : 'Connect with Freighter'}
          </Button>
        )}
      </div>

      <p className="text-muted-foreground text-center text-sm">
        New here?{' '}
        <Link href="/signup" className="text-primary font-medium hover:underline">
          Create a merchant account
        </Link>
      </p>
    </main>
  )
}
