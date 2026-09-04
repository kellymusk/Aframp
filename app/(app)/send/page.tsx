'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
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
import { api, ApiError, type Balance, type FeeEstimate, type Remittance } from '@/lib/api'
import { formatStroops, isWholeKobo, parseAmountToStroops } from '@/lib/money'
import { useAuthenticatedSession } from '@/components/session-provider'
import { Plus } from 'lucide-react'

const ASSETS = ['XLM', 'cNGN']
const STELLAR_ADDRESS_LENGTH = 56
const STORAGE_KEY = 'aframp_contacts'

interface Contact {
  id: string
  name: string
  address: string
  createdAt: string
}

interface SendState {
  address: string
  amount: string
  asset: string
  memo: string
  error: string | null
  feeEstimate: FeeEstimate | null
  loadingFee: boolean
  submitting: boolean
  remittances: Remittance[]
  showContacts: boolean
  contacts: Contact[]
}

const STATUS_LABEL: Record<Remittance['status'], string> = {
  pending: 'Pending',
  submitted: 'Submitted',
  confirmed: 'Confirmed',
  failed: 'Failed',
}

export default function SendPage() {
  const { token } = useAuthenticatedSession()
  const searchParams = useSearchParams()
  const [balances, setBalances] = useState<Balance[] | null>(null)
  const [state, setState] = useState<SendState>({
    address: searchParams.get('to') ?? '',
    amount: '',
    asset: 'XLM',
    memo: '',
    error: null,
    feeEstimate: null,
    loadingFee: false,
    submitting: false,
    remittances: [],
    showContacts: false,
    contacts: [],
  })

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const [nextBalances, nextRemittances] = await Promise.all([
          api.getBalances(token, signal),
          api.listRemittances(token, 20, signal),
        ])
        setBalances(nextBalances)
        setState((prev) => ({ ...prev, remittances: nextRemittances }))
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        if (cause instanceof ApiError && cause.status === 0) throw cause
        setState((prev) => ({
          ...prev,
          error: cause instanceof Error ? cause.message : 'Could not load your send details',
        }))
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

  // Load contacts from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Contact[]
        setState((prev) => ({ ...prev, contacts: parsed }))
      }
    } catch (error) {
      console.error('Failed to load contacts:', error)
    }
  }, [])

  // Load fee estimate when amount or asset changes
  useEffect(() => {
    const stroops = parseAmountToStroops(state.amount)
    if (stroops === null || stroops <= 0n) {
      setState((prev) => ({ ...prev, feeEstimate: null }))
      return
    }

    const loadFee = async () => {
      setState((prev) => ({ ...prev, loadingFee: true }))
      try {
        const estimate = await api.getRemittanceFeeEstimate(token, stroops, state.asset)
        setState((prev) => ({ ...prev, feeEstimate: estimate, loadingFee: false }))
      } catch {
        setState((prev) => ({ ...prev, feeEstimate: null, loadingFee: false }))
      }
    }

    const timer = setTimeout(loadFee, 500)
    return () => clearTimeout(timer)
  }, [state.amount, state.asset, token])

  const available = balances?.find((balance) => balance.asset === state.asset)?.available ?? 0n
  const stroops = parseAmountToStroops(state.amount)

  function validateAddress(): boolean {
    if (state.address.length !== STELLAR_ADDRESS_LENGTH) return false
    if (!state.address.startsWith('G')) return false
    return /^[A-Z0-9]{56}$/.test(state.address)
  }

  function validate(): string | null {
    if (!state.address) return 'Enter recipient address.'
    if (!validateAddress()) return 'Recipient address must be a valid 56-character Stellar address starting with G.'
    if (stroops === null || stroops <= 0n) return 'Enter an amount to send.'
    if (!isWholeKobo(stroops)) return 'Amount must be a whole number of stroops.'
    if (stroops > available) return 'That is more than your available balance.'
    return null
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const problem = validate()
    if (problem) {
      setState((prev) => ({ ...prev, error: problem }))
      return
    }

    setState((prev) => ({ ...prev, submitting: true, error: null }))
    try {
      await api.createRemittance(token, state.address, stroops!, state.asset, state.memo || undefined)
      setState((prev) => ({
        ...prev,
        address: '',
        amount: '',
        memo: '',
        feeEstimate: null,
        error: null,
      }))
      await load()
    } catch (cause) {
      setState((prev) => ({
        ...prev,
        error: cause instanceof Error ? cause.message : 'Send failed',
      }))
    } finally {
      setState((prev) => ({ ...prev, submitting: false }))
    }
  }

  if (!balances) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    )
  }

  const totalAmount = state.feeEstimate ? state.feeEstimate.total_stroops : stroops

  return (
    <div>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Send money</h1>
          <p className="text-dim mt-1 text-sm">
            {formatStroops(available)} {state.asset} available
          </p>
        </div>
        <Link href="/contacts">
          <Button variant="secondary" size="sm" className="gap-2">
            <Plus className="size-4" />
            Contacts
          </Button>
        </Link>
      </header>

      <div className="mt-6 max-w-xl space-y-5">
        <form
          onSubmit={submit}
          className="bg-panel border-hairline flex flex-col gap-4 rounded-2xl border p-5"
        >
          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="asset">Asset</Label>
            <Select
              value={state.asset}
              onValueChange={(asset) => setState((prev) => ({ ...prev, asset }))}
            >
              <SelectTrigger id="asset">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSETS.map((asset) => (
                  <SelectItem key={asset} value={asset}>
                    {asset}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Recipient Stellar address</Label>
            <div className="relative">
              <Input
                id="address"
                placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                value={state.address}
                onChange={(event) =>
                  setState((prev) => ({
                    ...prev,
                    address: event.target.value.toUpperCase(),
                    showContacts: event.target.value.length > 0 ? false : state.contacts.length > 0,
                  }))
                }
                onFocus={() =>
                  setState((prev) => ({
                    ...prev,
                    showContacts: prev.address.length === 0 && prev.contacts.length > 0,
                  }))
                }
              />
              {state.showContacts && state.contacts.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-panel border border-hairline rounded-lg z-10 max-h-48 overflow-y-auto">
                  {state.contacts.map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() =>
                        setState((prev) => ({
                          ...prev,
                          address: contact.address,
                          showContacts: false,
                        }))
                      }
                      className="w-full text-left p-3 hover:bg-raised transition-colors border-b last:border-b-0"
                    >
                      <p className="font-medium text-sm">{contact.name}</p>
                      <p className="text-dim text-xs font-mono truncate">{contact.address}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {state.address && !validateAddress() && (
              <p className="text-xs text-red-500">Invalid Stellar address</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount ({state.asset})</Label>
            <Input
              id="amount"
              inputMode="decimal"
              placeholder="0.00"
              value={state.amount}
              onChange={(event) => setState((prev) => ({ ...prev, amount: event.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="memo">Memo (optional)</Label>
            <Input
              id="memo"
              maxLength={28}
              placeholder="Add a note"
              value={state.memo}
              onChange={(event) => setState((prev) => ({ ...prev, memo: event.target.value }))}
            />
            <p className="text-dim text-xs">{state.memo.length}/28</p>
          </div>

          {state.feeEstimate && (
            <div className="bg-raised border-hairline rounded-lg border p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-dim">Amount</span>
                <span>{formatStroops(stroops ?? 0n)} {state.asset}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dim">Fee</span>
                <span>{formatStroops(state.feeEstimate.fee_stroops)} {state.asset}</span>
              </div>
              {state.feeEstimate.network_fee_stroops > 0n && (
                <div className="flex justify-between">
                  <span className="text-dim">Network fee</span>
                  <span>{formatStroops(state.feeEstimate.network_fee_stroops)} {state.asset}</span>
                </div>
              )}
              <div className="border-hairline border-t pt-2 flex justify-between font-bold">
                <span>Total</span>
                <span>{formatStroops(totalAmount)} {state.asset}</span>
              </div>
            </div>
          )}

          {state.loadingFee && stroops && stroops > 0n && (
            <p className="text-dim text-xs flex items-center gap-2">
              <LoadingSpinner className="size-3" />
              Calculating fee estimate...
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={state.submitting || !validateAddress() || !stroops || stroops <= 0n}
          >
            {state.submitting ? 'Sending…' : 'Send money'}
          </Button>
        </form>

        {state.remittances.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-dim text-xs font-bold tracking-widest uppercase">
              Recent sends
            </h2>
            <ul className="border-hairline divide-y">
              {state.remittances.map((remittance) => (
                <li key={remittance.id} className="space-y-1 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold tabular-nums text-white truncate">
                        {formatStroops(remittance.amount_stroops)} {remittance.asset}
                      </p>
                      <p className="text-dim text-xs truncate font-mono">
                        {remittance.destination_address}
                      </p>
                    </div>
                    <Badge
                      variant={
                        remittance.status === 'confirmed'
                          ? 'default'
                          : remittance.status === 'failed'
                            ? 'destructive'
                            : 'secondary'
                      }
                    >
                      {STATUS_LABEL[remittance.status]}
                    </Badge>
                  </div>
                  {remittance.tx_hash && (
                    <a
                      href={`https://stellar.expert/explorer/public/tx/${remittance.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 break-all"
                    >
                      View on Stellar Explorer
                    </a>
                  )}
                  {remittance.failure_reason && (
                    <p className="text-dim text-xs">{remittance.failure_reason}</p>
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
