'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { KycGate } from '@/components/kyc/kyc-gate'
import { api, ApiError } from '@/lib/api'
import { OFFRAMP_ASSETS } from '@/lib/offramp-assets'
import { useOfframpRate } from '@/hooks/use-offramp-rate'
import { useAuthenticatedSession } from '@/components/session-provider'
import type { FiatCurrency } from '@/types/onramp'
import type { OfframpFeeBreakdown } from '@/types/offramp'

const FIAT_OPTIONS: FiatCurrency[] = ['NGN', 'KES', 'GHS', 'ZAR', 'UGX']

function OfframpForm() {
  const { token } = useAuthenticatedSession()
  const router = useRouter()

  const [assetId, setAssetId] = useState(OFFRAMP_ASSETS[0].id)
  const [fiatCurrency, setFiatCurrency] = useState<FiatCurrency>('NGN')
  const [amountInput, setAmountInput] = useState('')
  const [fees, setFees] = useState<OfframpFeeBreakdown | null>(null)
  const [feesLoading, setFeesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const selectedAsset = OFFRAMP_ASSETS.find((option) => option.id === assetId) ?? OFFRAMP_ASSETS[0]
  const amount = Number(amountInput)
  const rate = useOfframpRate(token, selectedAsset.asset, fiatCurrency)

  useEffect(() => {
    if (!amount || amount <= 0) {
      setFees(null)
      return
    }
    const controller = new AbortController()
    setFeesLoading(true)
    api
      .getOfframpFees(token, selectedAsset.asset, fiatCurrency, amount, controller.signal)
      .then(setFees)
      .catch((cause) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        setFees(null)
      })
      .finally(() => setFeesLoading(false))
    return () => controller.abort()
  }, [token, selectedAsset.asset, fiatCurrency, amount])

  async function submit() {
    if (!amount || amount <= 0) {
      setError('Enter an amount to sell.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const order = await api.createOfframpOrder(token, selectedAsset.id, amount, fiatCurrency)
      router.push(`/offramp/${order.id}`)
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : 'Could not create your cash-out order'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">Sell crypto</h1>
        <p className="text-dim mt-1 text-sm">Convert your balance to local currency.</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {rate.error && (
        <Alert variant="destructive">
          <AlertDescription>{rate.error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="asset">Asset</Label>
        <Select value={assetId} onValueChange={setAssetId}>
          <SelectTrigger id="asset" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OFFRAMP_ASSETS.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.icon} {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fiat">Receive currency</Label>
        <Select value={fiatCurrency} onValueChange={(v) => setFiatCurrency(v as FiatCurrency)}>
          <SelectTrigger id="fiat" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FIAT_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="amount">Amount ({selectedAsset.asset})</Label>
        <Input
          id="amount"
          inputMode="decimal"
          value={amountInput}
          onChange={(event) => setAmountInput(event.target.value)}
          placeholder="0.00"
        />
      </div>

      <div className="border-hairline flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
        <span className="text-dim">Rate</span>
        {rate.isLoading ? (
          <LoadingSpinner className="size-4" />
        ) : (
          <span className="font-medium">
            1 {selectedAsset.asset} ≈ {rate.rate.toLocaleString()} {fiatCurrency}
            <span className="text-dim ml-2">({rate.countdown}s)</span>
          </span>
        )}
      </div>

      {feesLoading && <LoadingSpinner className="size-4" />}
      {fees && !feesLoading && (
        <div className="border-hairline flex flex-col gap-2 rounded-lg border p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-dim">Offramp fee</span>
            <span>{fees.offrampFee.toLocaleString()} {fiatCurrency}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-dim">Network fee</span>
            <span>{fees.networkFee.toLocaleString()} {fiatCurrency}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-dim">Bank fee</span>
            <span>{fees.bankFee.toLocaleString()} {fiatCurrency}</span>
          </div>
          <div className="border-hairline flex justify-between border-t pt-2 font-semibold">
            <span>You receive</span>
            <span>{fees.receiveAmount.toLocaleString()} {fiatCurrency}</span>
          </div>
        </div>
      )}

      <Button
        size="lg"
        className="h-12"
        disabled={submitting || !amount || amount <= 0}
        onClick={submit}
      >
        {submitting ? 'Creating order…' : 'Continue'}
      </Button>
    </div>
  )
}

export default function OfframpPage() {
  return (
    <KycGate returnTo="/offramp">
      <OfframpForm />
    </KycGate>
  )
}
