'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { type FiatCurrency, type CryptoAsset, type PaymentMethod, type OnrampOrder, type FeeBreakdown } from '@/types/onramp'

const FIAT_CURRENCIES: FiatCurrency[] = ['NGN', 'KES', 'GHS', 'ZAR', 'UGX']
const CRYPTO_ASSETS: CryptoAsset[] = ['cNGN', 'cKES', 'cGHS', 'USDC', 'XLM']
const PAYMENT_METHODS: PaymentMethod[] = ['bank_transfer', 'card', 'mobile_money']

interface OnrampFormProps {
  onOrderCreated: (order: OnrampOrder) => void
  onError: (error: string) => void
}

const PROCESSING_FEE_RATE = 0.025 // 2.5%
const NETWORK_FEE = 100 // Fixed in fiat
const MOBILE_MONEY_FEE_RATE = 0.005 // 0.5%

export function OnrampForm({ onOrderCreated, onError }: OnrampFormProps) {
  const [amount, setAmount] = useState('')
  const [fiatCurrency, setFiatCurrency] = useState<FiatCurrency>('NGN')
  const [cryptoAsset, setCryptoAsset] = useState<CryptoAsset>('cNGN')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card')
  const [loading, setLoading] = useState(false)
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)
  const [rateLoading, setRateLoading] = useState(false)

  // Fetch exchange rate
  useEffect(() => {
    const fetchRate = async () => {
      setRateLoading(true)
      try {
        // Mock exchange rate fetch - replace with real API call
        const rate = getExchangeRate(fiatCurrency, cryptoAsset)
        setExchangeRate(rate)
      } catch {
        onError('Failed to fetch exchange rate')
      } finally {
        setRateLoading(false)
      }
    }
    fetchRate()
  }, [fiatCurrency, cryptoAsset, onError])

  const calculateFees = (): FeeBreakdown => {
    const amountNum = parseFloat(amount) || 0
    let processingFee = amountNum * PROCESSING_FEE_RATE
    let networkFee = NETWORK_FEE

    // Add mobile money fee
    if (paymentMethod === 'mobile_money') {
      processingFee += amountNum * MOBILE_MONEY_FEE_RATE
    }

    return {
      processingFee: Math.round(processingFee * 100) / 100,
      networkFee,
      totalFees: Math.round((processingFee + networkFee) * 100) / 100,
      totalCost: Math.round((amountNum + processingFee + networkFee) * 100) / 100,
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amountNum = parseFloat(amount)

    if (!amountNum || amountNum <= 0) {
      onError('Enter a valid amount')
      return
    }

    if (!exchangeRate) {
      onError('Exchange rate not available')
      return
    }

    setLoading(true)
    try {
      const fees = calculateFees()
      const order: OnrampOrder = {
        id: generateOrderId(),
        createdAt: Date.now(),
        expiresAt: Date.now() + 30 * 60 * 1000, // 30 min expiry
        fiatCurrency,
        cryptoAsset,
        paymentMethod,
        amount: amountNum,
        exchangeRate,
        cryptoAmount: (amountNum - fees.processingFee - fees.networkFee) / exchangeRate,
        fees,
        walletAddress: '', // Will be filled from user session
        status: 'created',
        referralCode: '',
      }
      onOrderCreated(order)
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : 'Failed to create order')
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = !loading && rateLoading === false && parseFloat(amount) > 0

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.01"
            min="0"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Select value={fiatCurrency} onValueChange={(val) => setFiatCurrency(val as FiatCurrency)}>
            <SelectTrigger id="currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FIAT_CURRENCIES.map((curr) => (
                <SelectItem key={curr} value={curr}>
                  {curr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="crypto">Receive As</Label>
          <Select value={cryptoAsset} onValueChange={(val) => setCryptoAsset(val as CryptoAsset)}>
            <SelectTrigger id="crypto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CRYPTO_ASSETS.map((asset) => (
                <SelectItem key={asset} value={asset}>
                  {asset}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="method">Payment Method</Label>
          <Select value={paymentMethod} onValueChange={(val) => setPaymentMethod(val as PaymentMethod)}>
            <SelectTrigger id="method">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((method) => (
                <SelectItem key={method} value={method}>
                  {formatPaymentMethod(method)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={!canSubmit}
      >
        {loading ? (
          <>
            <LoadingSpinner className="mr-2 h-4 w-4" />
            Creating order...
          </>
        ) : rateLoading ? (
          <>
            <LoadingSpinner className="mr-2 h-4 w-4" />
            Fetching rates...
          </>
        ) : (
          'Continue'
        )}
      </Button>
    </form>
  )
}

function getExchangeRate(fiat: FiatCurrency, crypto: CryptoAsset): number {
  // Mock rates - replace with real CoinGecko API call
  const rates: Record<string, Record<string, number>> = {
    NGN: { cNGN: 1, cKES: 0.02, cGHS: 0.03, USDC: 0.0018, XLM: 0.004 },
    KES: { cNGN: 50, cKES: 1, cGHS: 1.5, USDC: 0.09, XLM: 0.2 },
    GHS: { cNGN: 35, cKES: 0.7, cGHS: 1, USDC: 0.06, XLM: 0.13 },
    ZAR: { cNGN: 250, cKES: 5, cGHS: 7.5, USDC: 0.43, XLM: 1 },
    UGX: { cNGN: 0.25, cKES: 0.005, cGHS: 0.0075, USDC: 0.0004, XLM: 0.001 },
  }
  return rates[fiat]?.[crypto] || 1
}

function formatPaymentMethod(method: PaymentMethod): string {
  const names: Record<PaymentMethod, string> = {
    bank_transfer: 'Bank Transfer',
    card: 'Debit/Credit Card',
    mobile_money: 'Mobile Money (M-Pesa, MTN, Airtel)',
  }
  return names[method]
}

function generateOrderId(): string {
  return `order_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}
