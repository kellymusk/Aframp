'use client'

import { ArrowRight } from 'lucide-react'

interface OrderSummaryProps {
  fiatAmount: string
  fiatCurrency: string
  cryptoAmount: string
  cryptoCurrency: string
  exchangeRate: string
  fee: string
  paymentMethod: string
  walletAddress: string
}

export function OrderSummary({
  fiatAmount,
  fiatCurrency,
  cryptoAmount,
  cryptoCurrency,
  exchangeRate,
  fee,
  paymentMethod,
  walletAddress,
}: OrderSummaryProps) {
  const summaryItems = [
    { label: 'Exchange Rate', value: exchangeRate },
    { label: 'Fee', value: fee },
    { label: 'Payment Method', value: paymentMethod },
    { label: 'Destination Wallet', value: truncateAddress(walletAddress) },
  ]

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground">{fiatAmount}</p>
          <p className="text-sm text-muted-foreground">{fiatCurrency}</p>
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground" />
        <div className="text-center">
          <p className="text-2xl font-bold text-primary">{cryptoAmount}</p>
          <p className="text-sm text-muted-foreground">{cryptoCurrency}</p>
        </div>
      </div>

      <div className="space-y-2 border-t pt-4">
        {summaryItems.map((item) => (
          <div key={item.label} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-medium text-foreground">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function truncateAddress(address: string): string {
  if (address.length <= 16) return address
  return `${address.slice(0, 8)}...${address.slice(-8)}`
}
