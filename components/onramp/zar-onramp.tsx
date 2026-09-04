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
import { OZOW_BANKS } from '@/lib/payment-providers'
import { calculateFees, formatCurrency } from '@/lib/payment-providers'
import { api } from '@/lib/api'

interface ZarOnrampProps {
  token: string
  onSuccess?: (txHash: string) => void
}

export function ZarOnramp({ token, onSuccess }: ZarOnrampProps) {
  const [amount, setAmount] = useState('')
  const [selectedBank, setSelectedBank] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const amountNum = parseFloat(amount) || 0
  const fees = amountNum > 0 ? calculateFees(amountNum, 'ozow') : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBank || amountNum < 10) return

    setIsProcessing(true)
    setError(null)

    try {
      const returnUrl = `${window.location.origin}/charge?provider=ozow`
      const { payment_url } = await api.createOzowPayment(
        token,
        amountNum,
        selectedBank,
        returnUrl
      )

      // Redirect to Ozow payment page
      window.location.href = payment_url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate payment')
      setIsProcessing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Buy Crypto with ZAR</CardTitle>
        <CardDescription>
          Instant bank transfer via Ozow - Funds arrive in minutes
        </CardDescription>
      </CardHeader>
      <CardContent>
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
