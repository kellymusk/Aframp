'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
  type Me,
  type Withdrawal,
  type WithdrawalStatus,
} from '@/lib/api'
import { formatStroops, parseAmountToStroops } from '@/lib/money'
import { useAuthenticatedSession } from '@/components/session-provider'
import {
  getBankOptions,
  getWithdrawableAssets,
  getWithdrawalAssetConfig,
  validateWithdrawal,
  type WithdrawalAsset,
} from '@/lib/withdraw'
import { BANKS, type Bank } from '@/lib/banks'
import { formatDateTime } from '@/lib/format-date'

const STATUS_LABEL: Record<WithdrawalStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Paid out',
  failed: 'Failed',
}

const STATUS_VARIANT: Record<WithdrawalStatus, 'default' | 'secondary' | 'destructive'> = {
  pending: 'secondary',
  processing: 'secondary',
  completed: 'default',
  failed: 'destructive',
}

const PAGE_SIZE = 20

export default function WithdrawPage() {
  const { token } = useAuthenticatedSession()
  const [me, setMe] = useState<Me | null>(null)
  const [balances, setBalances] = useState<Balance[] | null>(null)
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [asset, setAsset] = useState<WithdrawalAsset>('cNGN')
  const [amount, setAmount] = useState('')
  const [bankCode, setBankCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [nigeriaBanks, setNigeriaBanks] = useState<Bank[]>(BANKS)
  const bankName = (code: string) =>
    nigeriaBanks.find((bank) => bank.code === code)?.name ??
    BANKS.find((bank) => bank.code === code)?.name ??
    code
  const [banksLoading, setBanksLoading] = useState(false)

  useEffect(() => {
    let isMounted = true
    async function loadBanks() {
      setBanksLoading(true)
      try {
        const res = await fetch('/api/banks')
        if (!res.ok) throw new Error('Failed to fetch banks')
        const json = await res.json()
        const list = Array.isArray(json) ? json : json?.data
        if (Array.isArray(list) && list.length > 0 && isMounted) {
          setNigeriaBanks(
            list.map((b: { code: string | number; name: string }) => ({
              code: String(b.code),
              name: String(b.name),
            }))
          )
        }
      } catch {
        if (isMounted) {
          setNigeriaBanks(BANKS)
        }
      } finally {
        if (isMounted) {
          setBanksLoading(false)
        }
      }
    }

    void loadBanks()
    return () => {
      isMounted = false
    }
  }, [])

  const [limit, setLimit] = useState(PAGE_SIZE)
  const [loadingMore, setLoadingMore] = useState(false)
  // The API only takes a limit, so a full page back means there may be older entries.
  const hasMore = withdrawals.length >= limit

  const [confirmation, setConfirmation] = useState<{
    amount: bigint
    asset: WithdrawalAsset
    bankCode: string
    bankName: string
    accountNumber: string
  } | null>(null)

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const [nextMe, nextBalances, nextWithdrawals] = await Promise.all([
          api.getMe(token, signal),
          api.getBalances(token, signal),
          api.listWithdrawals(token, limit, signal),
        ])
        setMe(nextMe)
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
    [token, limit]
  )

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  async function loadMore() {
    const nextLimit = limit + PAGE_SIZE
    setLoadingMore(true)
    try {
      setWithdrawals(await api.listWithdrawals(token, nextLimit))
      setLimit(nextLimit)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load older cash-outs')
    } finally {
      setLoadingMore(false)
    }
  }

  const withdrawableAssets = useMemo(() => getWithdrawableAssets(balances ?? []), [balances])
  const config = getWithdrawalAssetConfig(asset)
  const available = balances?.find((balance) => balance.asset === asset)?.available ?? 0n
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
    if (withdrawableAssets.length > 0 && !withdrawableAssets.includes(asset)) {
      selectAsset(withdrawableAssets[0])
    }
  }, [withdrawableAssets, asset, selectAsset])

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const problem = validateWithdrawal(stroops, config, available, bankCode, accountNumber)
    if (problem) {
      setError(problem)
      return
    }

    const bankName = getBankOptions(asset).find((bank) => bank.code === bankCode)?.name ?? bankCode
    setError(null)
    setConfirmation({ amount: stroops!, asset, bankCode, bankName, accountNumber })
  }

  async function confirmWithdrawal() {
    if (!confirmation) return

    const request = confirmation
    setConfirmation(null)
    setSubmitting(true)
    setError(null)
    try {
      await api.createWithdrawal(
        token,
        request.amount,
        request.bankCode,
        request.accountNumber,
        request.asset
      )
      setAmount('')
      setBankCode('')
      setAccountNumber('')
      await load()
    } catch (cause) {
      // A 502 carries Paystack's own message — show it rather than a generic one.
      setError(cause instanceof Error ? cause.message : 'Cash-out failed')
    } finally {
      setSubmitting(false)
    }
  }

  // A failed load leaves `me` null; fall through so the error below is shown.
  if (!balances || (!me && !error)) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    )
  }

  if (me && me.kyc_status !== 'approved') {
    return (
      <div>
        <header>
          <h1 className="text-2xl font-bold tracking-tight">Cash out</h1>
        </header>

        <div className="mt-6 max-w-xl space-y-5">
          <Alert>
            <AlertDescription>
              {me.kyc_status === 'pending'
                ? 'Your identity verification is still being reviewed. You can cash out once it is approved.'
                : 'Verify your identity before you can cash out.'}
            </AlertDescription>
          </Alert>

          <Button asChild>
            <Link href="/kyc">Complete verification</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Cash out</h1>
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
            <div className="flex items-center justify-between">
              <Label htmlFor="amount">Amount ({asset})</Label>
              <button
                type="button"
                className="text-brand text-xs font-semibold hover:underline disabled:opacity-50"
                disabled={available === 0n}
                onClick={() =>
                  // Round down to the smallest unit the bank can pay out.
                  setAmount(
                    formatStroops(available - (available % config.minimumPrecisionStroops)).replace(
                      /,/g,
                      ''
                    )
                  )
                }
              >
                Max
              </button>
            </div>
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
            <Select
              value={bankCode}
              onValueChange={setBankCode}
              disabled={available === 0n || banksLoading}
            >
              <SelectTrigger id="bank">
                <SelectValue placeholder={banksLoading ? 'Loading banks…' : 'Choose your bank'} />
              </SelectTrigger>
              <SelectContent>
                {(asset === 'cNGN' ? nigeriaBanks : getBankOptions(asset)).map((bank) => (
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
              placeholder={`${config.accountNumberLength}-digit account number`}
              value={accountNumber}
              disabled={available === 0n}
              onChange={(event) =>
                setAccountNumber(
                  event.target.value.replace(/\D/g, '').slice(0, config.accountNumberLength)
                )
              }
            />
          </div>

          <Button type="submit" disabled={submitting || available === 0n}>
            {submitting ? 'Submitting…' : 'Cash out'}
          </Button>
        </form>

        <AlertDialog
          open={confirmation !== null}
          onOpenChange={(open) => {
            if (!open) setConfirmation(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm cash-out</AlertDialogTitle>
              <AlertDialogDescription>
                Review the details before sending your withdrawal.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {confirmation && (
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Amount</dt>
                <dd className="font-medium">
                  {formatStroops(confirmation.amount)} {confirmation.asset}
                </dd>
                <dt className="text-muted-foreground">Asset</dt>
                <dd>{confirmation.asset}</dd>
                <dt className="text-muted-foreground">Bank</dt>
                <dd>{confirmation.bankName}</dd>
                <dt className="text-muted-foreground">Account</dt>
                <dd>••••••{confirmation.accountNumber.slice(-4)}</dd>
              </dl>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
              <AlertDialogAction disabled={submitting} onClick={() => void confirmWithdrawal()}>
                {submitting ? 'Sending…' : 'Confirm cash out'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Recent cash-outs</h2>
          {withdrawals.length === 0 ? (
            <p className="text-dim text-sm">No cash-outs yet.</p>
          ) : (
            <ul className="space-y-2">
              {withdrawals.map((withdrawal) => (
                <li
                  key={withdrawal.id}
                  className="bg-panel border-hairline flex items-center justify-between gap-3 rounded-xl border p-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {formatStroops(withdrawal.amount_stroops)} {withdrawal.asset}
                    </p>
                    <p className="text-dim text-xs">
                      {formatDateTime(withdrawal.created_at)}
                      {withdrawal.bank_code && ` · ${bankName(withdrawal.bank_code)}`}
                      {withdrawal.account_number && ` ••••${withdrawal.account_number.slice(-4)}`}
                    </p>
                    {withdrawal.status === 'failed' && withdrawal.failure_reason && (
                      <p className="text-neg mt-1 text-xs">{withdrawal.failure_reason}</p>
                    )}
                  </div>
                  <Badge variant={STATUS_VARIANT[withdrawal.status]} className="shrink-0">
                    {STATUS_LABEL[withdrawal.status]}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          {hasMore && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={loadMore}
              disabled={loadingMore}
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </Button>
          )}
        </section>
      </div>
    </div>
  )
}
