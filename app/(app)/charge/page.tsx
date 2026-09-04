'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Delete } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api, ApiError } from '@/lib/api'
import { DECIMALS, parseAmountToStroops } from '@/lib/money'
import { useAuthenticatedSession } from '@/components/session-provider'
import { cn } from '@/lib/utils'

type ChargeAsset = 'XLM' | 'cNGN'

/**
 * The backend only emits a scannable SEP-0007 URI for an asset once it has
 * an issuer address configured. Today that's XLM only; cNGN becomes
 * selectable once NEXT_PUBLIC_CNGN_ISSUER is set, at which point the
 * backend is expected to have its matching issuer configured too.
 */
const CNGN_ISSUER = process.env.NEXT_PUBLIC_CNGN_ISSUER
const CNGN_ENABLED = Boolean(CNGN_ISSUER)

const ASSET_OPTIONS: { value: ChargeAsset; label: string; disabled: boolean }[] = [
  { value: 'XLM', label: 'XLM', disabled: false },
  { value: 'cNGN', label: CNGN_ENABLED ? 'cNGN' : 'cNGN — Coming soon', disabled: !CNGN_ENABLED },
]

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace'] as const

/** Stellar memo text is capped at 28 bytes; keep well under that. */
const MEMO_MAX_LENGTH = 28

export default function ChargePage() {
  const { token } = useAuthenticatedSession()
  const router = useRouter()
  const [input, setInput] = useState('')
  const [asset, setAsset] = useState<ChargeAsset>('XLM')
  const [memo, setMemo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const stroops = parseAmountToStroops(input)
  const canCharge = stroops !== null && stroops > 0n && !submitting

  function press(key: (typeof KEYS)[number]) {
    setError(null)
    setInput((current) => {
      if (key === 'backspace') return current.slice(0, -1)
      if (key === '.') return current.includes('.') ? current : `${current || '0'}.`

      const [, fraction] = current.split('.')
      if (fraction !== undefined && fraction.length >= DECIMALS) return current
      if (current === '0') return key
      return current + key
    })
  }

  async function charge() {
    if (stroops === null || stroops <= 0n) return
    if (asset === 'cNGN' && !CNGN_ENABLED) {
      setError('cNGN charges are coming soon.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const request = await api.createPaymentRequest(
        token,
        stroops,
        asset,
        undefined,
        memo.trim() || undefined
      )
      // Never silently fall back to XLM: if the asset we asked for has no
      // scannable code, surface that instead of showing the wrong currency.
      if (!request.sep7_uri && asset !== 'XLM') {
        setError(`${asset} isn't ready for scannable charges yet.`)
        setSubmitting(false)
        return
      }
      router.push(`/request/${request.id}`)
    } catch (cause) {
      if (cause instanceof ApiError && cause.message.includes('create a wallet')) {
        setError('Set up your payment address first, then come back here.')
      } else {
        setError(cause instanceof Error ? cause.message : 'Could not create the charge')
      }
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-sm flex-col gap-6">
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8">
        <p className="text-dim text-xs font-bold tracking-widest uppercase">Amount to charge</p>
        <p className="flex items-baseline gap-2 tabular-nums">
          <span className={cn('text-5xl font-bold tracking-tight', !input && 'text-dim')}>
            {input || '0'}
          </span>
          <span className="text-dim text-lg font-medium">{asset}</span>
        </p>

        <div className="flex items-center gap-2">
          <Select value={asset} onValueChange={(value) => setAsset(value as ChargeAsset)}>
            <SelectTrigger className="w-36" aria-label="Asset to charge in">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASSET_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!CNGN_ENABLED && <Badge variant="secondary">cNGN coming soon</Badge>}
        </div>

        <div className="w-full space-y-1.5">
          <Label htmlFor="memo" className="text-dim text-xs">
            Note / memo (optional)
          </Label>
          <Input
            id="memo"
            placeholder="e.g. Table 4"
            value={memo}
            maxLength={MEMO_MAX_LENGTH}
            onChange={(event) => setMemo(event.target.value)}
          />
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((key) => (
          <Button
            key={key}
            type="button"
            variant="secondary"
            onClick={() => press(key)}
            aria-label={key === 'backspace' ? 'Delete last digit' : key}
            className="h-16 text-xl font-medium"
          >
            {key === 'backspace' ? <Delete className="size-5" aria-hidden /> : key}
          </Button>
        ))}
      </div>

      <Button size="lg" className="h-14 text-base" disabled={!canCharge} onClick={charge}>
        {submitting ? 'Creating charge…' : 'Show payment code'}
      </Button>
    </div>
  )
}
