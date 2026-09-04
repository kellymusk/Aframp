'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { api, ApiError, type Wallet } from '@/lib/api'
import { useAuthenticatedSession, useSession } from '@/components/session-provider'

export default function WalletPage() {
  const { token } = useAuthenticatedSession()
  const { me } = useSession()
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setWallet(await api.getWallet(token))
      setError(null)
    } catch (cause) {
      // 400 "no wallet created yet" is the expected state for a new merchant.
      if (cause instanceof ApiError && cause.status === 400) setWallet(null)
      else if (cause instanceof ApiError && cause.status === 0)
        setError('backend-down')
      else setError(cause instanceof Error ? cause.message : 'Could not load your account')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  async function createWallet() {
    setCreating(true)
    setError(null)
    try {
      setWallet(await api.createWallet(token))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not set up your address')
    } finally {
      setCreating(false)
    }
  }

  async function copyAddress() {
    if (!wallet) return
    await navigator.clipboard.writeText(wallet.address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div>
      <header>
        <h1 className="truncate text-2xl font-bold tracking-tight">
          {me?.merchant_name ?? me?.name ?? 'Account'}
        </h1>
        {me?.email && <p className="text-dim mt-1 truncate text-sm">{me.email}</p>}
      </header>

      <div className="mt-6 max-w-xl space-y-5">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              {error === 'backend-down'
                ? "We can't connect to the payment server right now. Please try again in a moment."
                : error}
            </AlertDescription>
          </Alert>
        )}

        {wallet ? (
          <section className="bg-panel border-hairline space-y-3 rounded-2xl border p-5">
            <h2 className="text-dim text-xs font-bold tracking-widest uppercase">
              Your payment address
            </h2>
            <p className="bg-raised rounded-xl p-4 text-xs break-all text-white">
              {wallet.address}
            </p>
            <Button variant="outline" onClick={copyAddress} className="w-full">
              {copied ? (
                <>
                  <Check className="size-4" aria-hidden /> Copied
                </>
              ) : (
                <>
                  <Copy className="size-4" aria-hidden /> Copy address
                </>
              )}
            </Button>
            <p className="text-dim text-xs">
              Aframp keeps this address secure for you. Customers pay into it when they scan a
              charge — you never need to share it directly.
            </p>
          </section>
        ) : !error ? (
          <section className="bg-panel border-hairline space-y-3 rounded-2xl border p-5">
            <h2 className="text-lg font-bold">Set up your payment address</h2>
            <p className="text-dim text-sm">
              You need one before you can take your first payment. It only takes a moment.
            </p>
            <Button size="lg" className="w-full" disabled={creating} onClick={createWallet}>
              {creating ? 'Setting up…' : 'Create payment address'}
            </Button>
          </section>
        ) : null}
      </div>
    </div>
  )
}