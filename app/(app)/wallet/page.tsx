'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { AssetCards } from '@/components/wallet/asset-cards'
import { WalletQrCode } from '@/components/wallet/wallet-qr-code'
import { api, ApiError, type Balance, type Me, type Wallet } from '@/lib/api'
import { useAuthenticatedSession } from '@/components/session-provider'
import { useSep24Flow } from '@/hooks/use-sep24-flow'

export default function WalletPage() {
  const { token } = useAuthenticatedSession()
  const sep24 = useSep24Flow(token)
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [me, setMe] = useState<Me | null>(null)
  const [balances, setBalances] = useState<Balance[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // The JWT holds only ids, so identity comes from /me on every load.
      setMe(await api.getMe(token))
    } catch {
      // Non-fatal: the address below is the part that matters.
    }
    try {
      setWallet(await api.getWallet(token))
      setError(null)
    } catch (cause) {
      // 400 "no wallet created yet" is the expected state for a new merchant.
      if (cause instanceof ApiError && cause.status === 400) setWallet(null)
      else if (cause instanceof ApiError && cause.status === 0)
        setError("Can't reach the payment server. Please try again in a moment.")
      else setError(cause instanceof Error ? cause.message : 'Could not load your account')
    } finally {
      setLoading(false)
    }
    try {
      setBalances(await api.getBalances(token))
    } catch {
      // Non-fatal: the address above is what matters if this fails.
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

      <div className="mt-6 max-w-2xl space-y-5">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {wallet && balances.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-dim text-xs font-bold tracking-widest uppercase">Balances</h2>
            <AssetCards balances={balances} />
          </section>
        )}

        {wallet ? (
          <section className="bg-panel border-hairline space-y-3 rounded-2xl border p-5">
            <h2 className="text-dim text-xs font-bold tracking-widest uppercase">
              Your payment address
            </h2>
            <p className="bg-raised rounded-xl p-4 text-xs break-all text-white">
              {wallet.address}
            </p>
            <WalletQrCode address={wallet.address} />
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
        ) : null}

        {wallet && (
          <section className="bg-panel border-hairline space-y-3 rounded-2xl border p-5">
            <h2 className="text-dim text-xs font-bold tracking-widest uppercase">
              Deposit via anchor
            </h2>
            <p className="text-dim text-sm">
              Fund your balance directly through the SEP-0024 anchor flow — bank transfer, card,
              or other rails the anchor supports.
            </p>
            {sep24.error && (
              <Alert variant="destructive">
                <AlertDescription>{sep24.error}</AlertDescription>
              </Alert>
            )}
            <Button
              variant="outline"
              className="w-full"
              disabled={sep24.busy === 'deposit'}
              onClick={() => void sep24.startDeposit('cNGN')}
            >
              {sep24.busy === 'deposit' ? 'Opening anchor…' : 'Deposit'}
            </Button>
          </section>
        )}

        {!wallet && (
          <section className="bg-panel border-hairline space-y-3 rounded-2xl border p-5">
            <h2 className="text-lg font-bold">Set up your payment address</h2>
            <p className="text-dim text-sm">
              You need one before you can take your first payment. It only takes a moment.
            </p>
            <Button size="lg" className="w-full" disabled={creating} onClick={createWallet}>
              {creating ? 'Setting up…' : 'Create payment address'}
            </Button>
          </section>
        )}
      </div>
    </div>
  )
}
