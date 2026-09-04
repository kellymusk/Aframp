'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BANKS } from '@/lib/banks'
import { api, ApiError } from '@/lib/api'
import { useAuthenticatedSession } from '@/components/session-provider'
import { OFFRAMP_BANK_DETAILS_FIELDS, type OfframpOrder } from '@/types/offramp'

interface BankDetailsFormProps {
  order: OfframpOrder
  onSubmitted: (order: OfframpOrder) => void
}

/**
 * Collects payout details for an order still in `pending_bank_details`.
 * Field labels and validation switch on the order's fiat currency: NGN uses
 * a bank + 10-digit account number, KES/GHS use a single mobile money number.
 */
export function BankDetailsForm({ order, onSubmitted }: BankDetailsFormProps) {
  const { token } = useAuthenticatedSession()
  const fieldConfig = OFFRAMP_BANK_DETAILS_FIELDS[order.fiatCurrency]

  const [bankCode, setBankCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function validate(): string | null {
    if (fieldConfig.showBankSelect && !bankCode) return 'Choose your bank.'
    if (!accountNumber.trim()) return `Enter your ${fieldConfig.accountLabel.toLowerCase()}.`
    if (fieldConfig.accountLength !== null && accountNumber.trim().length !== fieldConfig.accountLength) {
      return `${fieldConfig.accountLabel} must be ${fieldConfig.accountLength} digits.`
    }
    if (!/^\d+$/.test(accountNumber.trim())) return `${fieldConfig.accountLabel} must be numeric.`
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
      const updated = await api.submitOfframpBankDetails(token, order.id, {
        bankCode: fieldConfig.showBankSelect ? bankCode : undefined,
        accountNumber: accountNumber.trim(),
      })
      onSubmitted(updated)
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : 'Could not save your payout details'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <div>
        <h2 className="text-lg font-bold">Where should we send it?</h2>
        <p className="text-dim mt-1 text-sm">
          You&apos;ll receive {order.fees.receiveAmount.toLocaleString()} {order.fiatCurrency}.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {fieldConfig.showBankSelect && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bankCode">Bank</Label>
          <Select value={bankCode} onValueChange={setBankCode}>
            <SelectTrigger id="bankCode" className="w-full">
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
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="accountNumber">{fieldConfig.accountLabel}</Label>
        <Input
          id="accountNumber"
          inputMode="numeric"
          value={accountNumber}
          onChange={(event) => setAccountNumber(event.target.value)}
          placeholder={fieldConfig.accountPlaceholder}
          maxLength={fieldConfig.accountLength ?? undefined}
        />
      </div>

      <Button type="submit" size="lg" className="h-12" disabled={submitting}>
        {submitting ? 'Saving…' : 'Confirm payout details'}
      </Button>
    </form>
  )
}
