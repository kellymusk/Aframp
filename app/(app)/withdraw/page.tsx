'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ConfirmWithdrawalDialog } from '@/components/withdraw/confirm-withdrawal-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api, ApiError, type Balance, type Withdrawal, type WithdrawalStatus } from '@/lib/api'
import { formatStroops, parseAmountToStroops } from '@/lib/money'
import { useAuthenticatedSession } from '@/components/session-provider'
import {
  getBankOptions,
  getWithdrawableAssets,
  getWithdrawalAssetConfig,
  validateWithdrawal,
  type WithdrawalAsset,
} from '@/lib/withdraw'

const STATUS_LABEL: Record<WithdrawalStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Paid out',
  failed: 'Failed',
}

export default function WithdrawPage() {
  const { token } = useAuthenticatedSession()
  const [balances, setBalances] = useState<Balance[] | null>(null)
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [asset, setAsset] = useState<WithdrawalAsset>('cNGN')
  const [amount, setAmount] = useState('')
  const [bankCode, setBankCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const submissionInFlight = useRef(false)

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const [nextBalances, nextWithdrawals] = await Promise.all([
          api.getBalances(token, signal),
          api.listWithdrawals(token, 20, signal),
        ])
        setBalances(nextBalances)
        setWithdrawals(nextWithdrawals)
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        if (cause instanceof ApiError && cause.status === 0) {
          setError('backend-down')
          setBalances([])
          return
        }
        setError(cause instanceof Error ? cause.message : 'Could not load your cash-out details')
        setBalances([])
      }
    },
    [token]
  )

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  const withdrawableAssets = useMemo(() => getWithdrawableAssets(balances ?? []), [balances])
  const config = getWithdrawalAssetConfig(asset)
  // Spendable balance in stroops (1 unit = 10,000,000) — never display raw,
  // always via `formatStroops` from lib/money.ts.
  const available = balances?.find((balance) => balance.asset === asset)?.available ?? 0n
  // `amount` is the user's decimal string; this is the same value in stroops,
  // which is what every comparison below and the backend both expect. Null when
  // unparseable. See lib/money.ts for the unit and the two helpers.
  const stroops = parseAmountToStroops(amount)

  const selectAsset = useCallback((next: WithdrawalAsset) => {
    setAsset(next)
    setAmount('')
    setBankCode('')
    setAccountNumber('')
  }, [])

  // If the selected asset no longer has a balance (e.g. after a cash-out), fall
  // back to the first asset the merchant can still cash out.
  useEffect(() => {
    if (withdrawableAssets.length === 0 || withdrawableAssets.includes(asset)) return
    selectAsset(withdrawableAssets[0])
  }, [withdrawableAssets, asset, selectAsset])

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (submissionInFlight.current) return

    const problem = validateWithdrawal(stroops, config, available, bankCode, accountNumber)
    if (problem) {
      setError(problem)
      return
    }

    setError(null)
    setConfirmationOpen(true)
  }

  async function confirmWithdrawal() {
    if (submissionInFlight.current) return
    submissionInFlight.current = true

    setSubmitting(true)
    setError(null)
    try {
      // `stroops!` is in stroops, not whole asset units; validation has ruled out null.
      await api.createWithdrawal(token, stroops!, bankCode, accountNumber, asset)
      setAmount('')
      setBankCode('')
      setAccountNumber('')
      await load()
    } catch (cause) {
      // A 502 carries Paystack's own message — show it rather than a generic one.
      setError(cause instanceof Error ? cause.message : 'Cash-out failed')
    } finally {
      submissionInFlight.current = false
      setSubmitting(false)
      setConfirmationOpen(false)
    }
  }

  if (!balances) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Cash out</h1>
        {/* `available` is stroops; formatStroops (lib/money.ts) is the only
            sanctioned way to turn it into a readable figure. */}
        <p className="text-dim mt-1 text-sm">
          {formatStroops(available)} {asset} available
        </p>
      </header>

      <div className="mt-6 max-w-xl space-y-5">
        {withdrawableAssets.length === 0 && (
          <Alert>
            <AlertDescription>
              You have no balance to cash out yet. Payments currently arrive as XLM, which
              doesn&apos;t have a cash-out route — that opens up once your payments go live.
            </AlertDescription>
          </Alert>
        )}

        <form
          onSubmit={submit}
          className="bg-panel border-hairline flex flex-col gap-4 rounded-2xl border p-5"
        >
          {error && (
            <Alert variant="destructive">
              <AlertDescription>
                {error === 'backend-down'
                  ? "We can't connect to the payment server right now. Please try again in a moment."
                  : error}
              </AlertDescription>
            </Alert>
          )}

          {withdrawableAssets.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="asset">Asset</Label>
              <Select
                value={asset}
                onValueChange={(value) => selectAsset(value as WithdrawalAsset)}
              >
                <SelectTrigger id="asset">
                  <SelectValue placeholder="Choose an asset" />
                </SelectTrigger>
                <SelectContent>
                  {withdrawableAssets.map((withdrawable) => (
                    <SelectItem key={withdrawable} value={withdrawable}>
                      {withdrawable}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">Amount ({asset})</Label>
            <Input
              id="amount"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              disabled={available === 0n}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bank">Bank</Label>
            <Select value={bankCode} onValueChange={setBankCode} disabled={available === 0n}>
              <SelectTrigger id="bank">
                <SelectValue placeholder="Choose your bank" />
              </SelectTrigger>
              <SelectContent>
                {getBankOptions(asset).map((bank) => (
                  <SelectItem key={bank.code} value={bank.code}>
                    {bank.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="account">Account number</Label>
            <Input
              id="account"
              inputMode="numeric"
              maxLength={config.accountNumberLength}
              placeholder="0123456789"
              value={accountNumber}
              disabled={available === 0n}
              onChange={(event) =>
                setAccountNumber(
                  event.target.value.replace(/\D/g, '').slice(0, config.accountNumberLength)
                )
              }
            />
          </div>

          <Button type="submit" size="lg" disabled={submitting || available === 0n}>
            {submitting ? 'Sending…' : 'Cash out'}
          </Button>
        </form>

        <ConfirmWithdrawalDialog
          open={confirmationOpen}
          onOpenChange={(open) => {
            if (!submitting) setConfirmationOpen(open)
          }}
          amount={amount}
          asset={asset}
          submitting={submitting}
          onConfirm={() => void confirmWithdrawal()}
        />

        {withdrawals.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-dim text-xs font-bold tracking-widest uppercase">
              Recent cash-outs
            </h2>
            <ul className="border-hairline divide-y">
              {withdrawals.map((withdrawal) => (
                <li key={withdrawal.id} className="space-y-1 py-3">
                  <div className="flex items-center justify-between gap-3">
                    {/* amount_stroops arrives as a bigint from the backend —
                        formatStroops (lib/money.ts) divides by 10,000,000. */}
                    <span className="font-bold tabular-nums text-white">
                      {formatStroops(withdrawal.amount_stroops)} {withdrawal.asset}
                    </span>
                    <Badge
                      variant={
                        withdrawal.status === 'completed'
                          ? 'default'
                          : withdrawal.status === 'failed'
                            ? 'destructive'
                            : 'secondary'
                      }
                    >
                      {STATUS_LABEL[withdrawal.status] ?? withdrawal.status}
                    </Badge>
                  </div>
                  {withdrawal.failure_reason && (
                    <p className="text-dim text-xs">{withdrawal.failure_reason}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
