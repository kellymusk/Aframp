'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useSession } from '@/components/session-provider'

const MIN_PASSWORD_LENGTH = 8

export default function SignupPage() {
  const { session, ready, signUp } = useSession()
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (ready && session) router.replace('/charge')
  }, [ready, session, router])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in your business name, email, and password.')
      setSubmitting(false)
      return
    }

    // Mirrors the server's own check so the error lands next to the field.
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`)
      setSubmitting(false)
      return
    }

    setSubmitting(true)
    try {
      await signUp(email.trim(), password, name.trim())
      router.replace('/charge')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create your account')
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-6 py-12">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-muted-foreground text-sm">
          Takes a minute. You&apos;ll get a payment address straight after.
        </p>
      </header>

      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <Alert variant="destructive">
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
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <p className="text-muted-foreground text-xs">
            At least {MIN_PASSWORD_LENGTH} characters.
          </p>
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
