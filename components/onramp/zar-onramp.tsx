'use client'

import { useEffect, useState } from 'react'
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
import { OZOW_BANKS, calculateFees, formatCurrency, validateOzowPaymentUrl } from '@/lib/payment-providers'
import { api } from '@/lib/api'
import { redirectTo } from '@/lib/navigation'

interface ZarOnrampProps {
  token: string
  onSuccess?: (txHash: string) => void
}

const OZOW_TRANSACTION_ID_KEY = 'ozow_transaction_id'

export function ZarOnramp({ token, onSuccess }: ZarOnrampProps) {
  const [amount, setAmount] = useState('')
  const [selectedBank, setSelectedBank] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const amountNum = parseFloat(amount) || 0
  const fees = amountNum > 0 ? calculateFees(amountNum, 'ozow') : null

  // Post-redirect verification: Ozow sends the user back to returnUrl with
  // ?provider=ozow but no transaction id, so we recover it from where
  // handleSubmit stashed it before leaving the page.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('provider') !== 'ozow') return

    const transactionId = sessionStorage.getItem(OZOW_TRANSACTION_ID_KEY)
    if (!transactionId) return

    let cancelled = false
    setIsVerifying(true)

    api
      .verifyOzowPayment(token, transactionId)
      .then((result) => {
        if (cancelled) return
        if (result.status === 'completed' || result.status === 'failed') {
          sessionStorage.removeItem(OZOW_TRANSACTION_ID_KEY)
        }
        if (result.status === 'completed' && result.tx_hash) {
          onSuccess?.(result.tx_hash)
        } else if (result.status === 'failed') {
          setError('Payment failed. Please try again.')
        }
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to verify payment')
      })
      .finally(() => {
        if (!cancelled) setIsVerifying(false)
      })

    return () => {
      cancelled = true
    }
  }, [token, onSuccess])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBank || amountNum < 10) return

    setIsProcessing(true)
    setError(null)

    try {
      const returnUrl = `${window.location.origin}/charge?provider=ozow`
      const { payment_url, transaction_id } = await api.createOzowPayment(
        token,
        amountNum,
        selectedBank,
        returnUrl
      )

      // Validate the payment URL before redirecting to prevent open-redirect
      // and javascript: injection attacks if the backend is ever compromised.
      validateOzowPaymentUrl(payment_url)

      // Safe to redirect
      window.location.href = payment_url
      // Validate the URL before redirecting: must be https:// and on the
      // expected Ozow domain to prevent open-redirect / javascript: attacks.
      let parsedUrl: URL
      try {
        parsedUrl = new URL(payment_url)
      } catch {
        throw new Error('Invalid payment URL received from server.')
      }
      if (parsedUrl.protocol !== 'https:' || !parsedUrl.hostname.endsWith('ozow.com')) {
        throw new Error('Payment URL failed security validation. Please contact support.')
      }

      sessionStorage.setItem(OZOW_TRANSACTION_ID_KEY, transaction_id)

      // Redirect to Ozow payment page
      redirectTo(parsedUrl.href)
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
        {isVerifying && (
          <Alert className="mb-4">
            <AlertDescription>Verifying your payment...</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (ZAR)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="100.00"
              min="10"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            {amountNum > 0 && amountNum < 10 && (
              <p className="text-sm text-destructive">Minimum amount is R10</p>
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
            disabled={!selectedBank || amountNum < 10 || isProcessing}
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
