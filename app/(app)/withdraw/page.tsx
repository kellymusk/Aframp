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
        // The route always responds 200 with a `source` field; a non-OK status
        // means something unexpected happened, so fall back to the bundled list.
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
        <p className="mt-1 text-sm text-muted-foreground">
          Send funds from your balance to a Nigerian bank account.
        </p>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <form onSubmit={submit} className="space-y-5 rounded-lg border p-5">
          <div className="space-y-2">
            <Label htmlFor="asset">Asset</Label>
            <Select value={asset} onValueChange={(value) => selectAsset(value as WithdrawalAsset)}>
              <SelectTrigger id="asset">
                <SelectValue placeholder="Select an asset" />
              </SelectTrigger>
              <SelectContent>
                {withdrawableAssets.map((option) => (
                  <SelectItem key={option} value={option}>
                    {getWithdrawalAssetConfig(option).label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Available: {formatStroops(available, config.asset)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bank">Bank</Label>
            <Select value={bankCode} onValueChange={setBankCode} disabled={banksLoading}>
              <SelectTrigger id="bank">
                <SelectValue placeholder={banksLoading ? 'Loading banks…' : 'Select a bank'} />
              </SelectTrigger>
              <SelectContent>
                {nigeriaBanks.map((bank) => (
                  <SelectItem key={bank.code} value={bank.code}>
                    {bank.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-number">Account number</Label>
            <Input
              id="account-number"
              inputMode="numeric"
              placeholder="0123456789"
              value={accountNumber}
              onChange={(event) => setAccountNumber(event.target.value)}
            />
          </div>

          {error && error !== 'backend-down' && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Processing…' : 'Cash out'}
          </Button>
        </form>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Recent cash-outs</h2>
          {withdrawals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cash-outs yet.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {withdrawals.map((withdrawal) => (
                <li key={withdrawal.id} className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium">
                      {formatStroops(withdrawal.amount, withdrawal.asset)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {bankName(withdrawal.bank_code)} · {withdrawal.account_number}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(withdrawal.created_at)}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[withdrawal.status]}>
                    {STATUS_LABEL[withdrawal.status]}
                  </Badge>
                </li>
              ))}
            </ul>
          )}

          {hasMore && (
            <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? 'Loading…' : 'Load older'}
            </Button>
          )}
        </section>
      </div>

      <AlertDialog open={confirmation !== null} onOpenChange={(open) => !open && setConfirmation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm cash-out</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmation && (
                <>
                  Send {formatStroops(confirmation.amount, confirmation.asset)} to{' '}
                  {confirmation.bankName} ({confirmation.accountNumber}). This cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmWithdrawal}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
