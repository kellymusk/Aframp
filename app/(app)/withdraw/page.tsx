'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  api,
  ApiError,
  type Balance,
  type ResolvedAccount,
  type Withdrawal,
  type WithdrawalStatus,
} from '@/lib/api'
import { formatStroops, isWholeKobo, parseAmountToStroops } from '@/lib/money'
import { BANKS } from '@/lib/banks'
import { useAuthenticatedSession } from '@/components/session-provider'
import { useSep24Flow } from '@/hooks/use-sep24-flow'

/** Withdrawals are cNGN-only server-side; XLM balances have no cash-out path. */
const ASSET = 'cNGN'
const ACCOUNT_NUMBER_LENGTH = 10
/** Paystack's own floor is NGN 50. */
const MINIMUM_STROOPS = 500_000_000n
/** Avoids firing a resolve request on every keystroke while typing the account number. */
const RESOLVE_DEBOUNCE_MS = 500

const STATUS_LABEL: Record<WithdrawalStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Paid out',
  failed: 'Failed',
}

export default function WithdrawPage() {
  const { token } = useAuthenticatedSession()
  const sep24 = useSep24Flow(token)
  const [balances, setBalances] = useState<Balance[] | null>(null)
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [amount, setAmount] = useState('')
  const [bankCode, setBankCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [resolvedAccount, setResolvedAccount] = useState<ResolvedAccount | null>(null)
  const [resolving, setResolving] = useState(false)
  const [resolveError, setResolveError] = useState<string | null>(null)

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
        if (cause instanceof ApiError && cause.status === 0)
          setError("Can't reach the payment server. Please try again in a moment.")
        else setError(cause instanceof Error ? cause.message : 'Could not load your cash-out details')
        setBalances([])
      }
    },
    [token]
  )

  // Refetch on an interval too, since the payout provider can flip a
  // withdrawal from pending -> completed/failed without any client action.
  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    const poll = setInterval(() => void load(), 15_000)
    return () => {
      controller.abort()
      clearInterval(poll)
    }
  }, [load])

  useEffect(() => {
    setResolvedAccount(null)
    setResolveError(null)

    if (accountNumber.length !== ACCOUNT_NUMBER_LENGTH || !bankCode) return

    const controller = new AbortController()
    const timer = setTimeout(() => {
      setResolving(true)
      api
        .resolveAccount(token, bankCode, accountNumber, controller.signal)
        .then(setResolvedAccount)
        .catch((cause) => {
          if (cause instanceof DOMException && cause.name === 'AbortError') return
          setResolveError(
            cause instanceof ApiError && cause.status === 404
              ? 'Account not found. Check the number and bank.'
              : cause instanceof Error
                ? cause.message
                : 'Could not verify this account.'
          )
        })
        .finally(() => setResolving(false))
    }, RESOLVE_DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [token, accountNumber, bankCode])

  const available = balances?.find((balance) => balance.asset === ASSET)?.available ?? 0n
  const stroops = parseAmountToStroops(amount)

  function validate(): string | null {
    if (stroops === null || stroops <= 0n) return 'Enter an amount to cash out.'
    if (!isWholeKobo(stroops)) return 'Amount must be a whole number of kobo.'
    if (stroops < MINIMUM_STROOPS)
      return `The smallest cash-out is ${formatStroops(MINIMUM_STROOPS)} ${ASSET}.`
    if (stroops > available) return 'That is more than your available balance.'
    if (!bankCode) return 'Choose your bank.'
    if (accountNumber.length !== ACCOUNT_NUMBER_LENGTH) {
      return `Account numbers are ${ACCOUNT_NUMBER_LENGTH} digits.`
    }
    if (!resolvedAccount) return 'We could not verify this account yet.'
    return null
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const problem = validate()
    if (problem) {
      setError(problem)
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const created = await api.createWithdrawal(token, stroops!, bankCode, accountNumber, ASSET)
      // Show the new withdrawal instantly instead of waiting on a refetch —
      // the list otherwise only picked up the new entry on the next manual
      // reload or the background poll.
      setWithdrawals((current) => [created, ...current])
      setAmount('')
      setBankCode('')
      setAccountNumber('')
      void load()
    } catch (cause) {
      // A 502 carries Paystack's own message — show it rather than a generic one.
      setError(cause instanceof Error ? cause.message : 'Cash-out failed')
    } finally {
      setSubmitting(false)
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
        <p className="text-dim mt-1 text-sm">
          {formatStroops(available)} {ASSET} available
        </p>
      </header>

      <div className="mt-6 max-w-xl space-y-5">
        {available === 0n && (
          <Alert>
            <AlertDescription>
              You have no {ASSET} to cash out yet. Payments currently arrive as XLM, which
              doesn&apos;t have a cash-out route — that opens up once {ASSET} payments go live.
            </AlertDescription>
          </Alert>
        )}

        <form
          onSubmit={submit}
          className="bg-panel border-hairline flex flex-col gap-4 rounded-2xl border p-5"
        >
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">Amount ({ASSET})</Label>
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
                {BANKS.map((bank) => (
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
              maxLength={ACCOUNT_NUMBER_LENGTH}
              placeholder="0123456789"
              value={accountNumber}
              disabled={available === 0n}
              onChange={(event) =>
                setAccountNumber(
                  event.target.value.replace(/\D/g, '').slice(0, ACCOUNT_NUMBER_LENGTH)
                )
              }
            />
            {resolving && <p className="text-dim text-xs">Verifying account…</p>}
            {resolvedAccount && (
              <p className="text-xs font-medium text-emerald-500">
                {resolvedAccount.account_name}
              </p>
            )}
            {resolveError && <p className="text-destructive text-xs">{resolveError}</p>}
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={submitting || available === 0n || !resolvedAccount}
          >
            {submitting ? 'Sending…' : 'Cash out'}
          </Button>
        </form>

        <div className="bg-panel border-hairline space-y-3 rounded-2xl border p-5">
          <h2 className="text-dim text-xs font-bold tracking-widest uppercase">
            Prefer your own rails?
          </h2>
          <p className="text-dim text-sm">
            Skip the bank form above and withdraw straight through the anchor&apos;s own
            interactive flow (SEP-0024) instead.
          </p>
          {sep24.error && (
            <Alert variant="destructive">
              <AlertDescription>{sep24.error}</AlertDescription>
            </Alert>
          )}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={sep24.busy === 'withdraw' || available === 0n}
            onClick={() => void sep24.startWithdraw(ASSET)}
          >
            {sep24.busy === 'withdraw' ? 'Opening anchor…' : 'Withdraw via anchor'}
          </Button>
        </div>

        {withdrawals.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-dim text-xs font-bold tracking-widest uppercase">
              Recent cash-outs
            </h2>
            <ul className="border-hairline divide-y">
              {withdrawals.map((withdrawal) => (
                <li key={withdrawal.id} className="space-y-1 py-3">
                  <div className="flex items-center justify-between gap-3">
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
