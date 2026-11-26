'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  calculateFees,
  formatCurrency,
  getAmountValidationError,
  OZOW_BANKS,
  PROVIDER_CONFIGS,
} from '@/lib/payment-providers'
import { api } from '@/lib/api'

interface ZarOnrampProps {
  token: string
  onSuccess?: (txHash: string) => void
}

export function ZarOnramp({ token }: ZarOnrampProps) {
  const [amount, setAmount] = useState('')
  const [selectedBank, setSelectedBank] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const config = PROVIDER_CONFIGS.ozow
  const amountNum = parseFloat(amount) || 0
  const amountValidationError = amountNum > 0 ? getAmountValidationError(amountNum, 'ozow') : null
  const fees = amountNum > 0 && !amountValidationError ? calculateFees(amountNum, 'ozow') : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBank || getAmountValidationError(amountNum, 'ozow')) return

    setIsProcessing(true)
    setError(null)

    try {
      const returnUrl = `${window.location.origin}/charge?provider=ozow`
      const { payment_url } = await api.createOzowPayment(token, amountNum, selectedBank, returnUrl)

      // Validate the URL before redirecting: must be https:// and on the
      // expected Ozow domain to prevent open-redirect / javascript: attacks.
      let parsedUrl: URL
      try {
        parsedUrl = new URL(payment_url)
      } catch {
        throw new Error('Invalid payment URL received from server.')
      }
      if (
        parsedUrl.protocol !== 'https:' ||
        !parsedUrl.hostname.endsWith('ozow.com')
      ) {
        throw new Error('Payment URL failed security validation. Please contact support.')
      }

      // Redirect to Ozow payment page
      window.location.href = parsedUrl.href
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate payment')
      setIsProcessing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Buy Crypto with ZAR</CardTitle>
        <CardDescription>Instant bank transfer via Ozow - Funds arrive in minutes</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (ZAR)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="100.00"
              min={config.minAmount}
              max={config.maxAmount}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            {amountValidationError && (
              <p className="text-sm text-destructive">{amountValidationError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bank">Select Your Bank</Label>
            <Select value={selectedBank} onValueChange={setSelectedBank} required>
              <SelectTrigger id="bank">
                <SelectValue placeholder="Choose your bank" />
              </SelectTrigger>
              <SelectContent>
                {OZOW_BANKS.map((bank) => (
                  <SelectItem key={bank.code} value={bank.code}>
                    {bank.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {fees && (
            <div className="rounded-lg border bg-muted/50 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium">{formatCurrency(amountNum, 'ZAR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Processing fee (1.5%)</span>
                <span className="font-medium">{formatCurrency(fees.processingFee, 'ZAR')}</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-semibold">
                <span>Total Cost</span>
                <span>{formatCurrency(fees.totalCost, 'ZAR')}</span>
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={
              !selectedBank || Boolean(amountValidationError) || amountNum <= 0 || isProcessing
            }
          >
            {isProcessing ? 'Processing...' : 'Continue to Ozow'}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            You'll be redirected to Ozow to complete the payment securely
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
