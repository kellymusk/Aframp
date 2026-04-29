'use client'

import * as React from 'react'
import { OrderSummaryCard } from './order-summary-card'
import { FeeBreakdown } from './fee-breakdown'
import { ImportantInfo } from './important-info'
import { SettlementAddress } from './settlement-address'
import { ConfirmationChecklist } from './confirmation-checklist'
import { MOCK_ORDER, OfframpOrder } from '@/lib/offramp/mock-api'
import { useRouter } from 'next/navigation'
import { useWallet } from '@/hooks/useWallet'
import { buildOfframpPaymentXdr } from '@/lib/offramp/stellar-offramp'
import { toast } from 'sonner'

export function StepReview() {
  const router = useRouter()
  const { publicKey, isConnected, network, signTransaction } = useWallet()

  // In a real app, we'd fetch the order ID from URL or context
  const [order, setOrder] = React.useState<OfframpOrder | null>(null)

  // Checklist state
  const [checkedItems, setCheckedItems] = React.useState({
    bankDetails: false,
    fees: false,
    address: false,
    memo: false,
  })
  const [isValid, setIsValid] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    // Simulate fetching order data
    setOrder(MOCK_ORDER)
  }, [])

  if (!order)
    return <div className="p-8 text-center text-muted-foreground">Loading order details...</div>

  const handleConfirm = async () => {
    if (!isValid) return

    if (!isConnected || !publicKey) {
      toast.error('Please connect your Stellar wallet before sending crypto.')
      return
    }

    setIsSubmitting(true)
    try {
      const xdr = await buildOfframpPaymentXdr({
        sourcePublicKey: publicKey,
        destination: order.settlementAddress,
        amount: order.sourceAmount,
        assetCode: order.sourceAsset,
        network: network,
        memo: order.memo,
      })

      const result = await signTransaction(xdr)

      if (!result || !result.signedTxXdr) {
        toast.error(result?.error || 'Signing was cancelled or failed.')
        return
      }

      // Persist for demo / status page
      if (typeof window !== 'undefined') {
        localStorage.setItem(`offramp:signedTx:${order.id}`, result.signedTxXdr)
      }

      toast.success('Transaction signed. Redirecting to processing...')
      router.push(`/offramp/processing/${encodeURIComponent(order.id)}`)
    } catch (error) {
      console.error('Failed to prepare or sign transaction', error)
      toast.error('Failed to prepare transaction. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = () => {
    // Go back to previous step
    router.back()
  }

  const handleRefresh = () => {
    if (order) {
      setOrder({
        ...order,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      })
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground animate-in fade-in duration-700">
      <div className="max-w-7xl mx-auto space-y-12 p-6 md:p-12">
        <div className="space-y-4">
          <h1 className="text-4xl font-black tracking-tighter">Confirm Withdrawal</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Column 1: Order Summary */}
          <div className="space-y-8">
            <OrderSummaryCard
              asset={order.sourceAsset}
              assetAmount={order.sourceAmount}
              fiatCurrency={order.fiatCurrency}
              fiatAmount={order.fiatAmount}
              balanceAfter={150}
              bankName={order.bankDetails.bankName}
              accountNumber={order.bankDetails.accountNumber}
              accountName={order.bankDetails.accountName}
              settlementTime="2-6 hours"
            />
          </div>

          {/* Column 2: Settlement Details & Info */}
          <div className="space-y-8">
            <SettlementAddress
              address={order.settlementAddress}
              memo={order.memo}
              asset={order.sourceAsset}
              amount={order.sourceAmount}
            />

            <ImportantInfo expiresAt={order.expiresAt} onRefresh={handleRefresh} />
          </div>

          {/* Column 3: Fees & Checklist */}
          <div className="space-y-8">
            <FeeBreakdown
              itemRate={order.exchangeRate}
              asset={order.sourceAsset}
              fiatCurrency={order.fiatCurrency}
              subtotal={order.fiatAmount}
              offrampFee={order.fees.offrampFee}
              networkFee={order.fees.networkFee}
            />

            <ConfirmationChecklist
              onConfirm={handleConfirm}
              onEdit={handleEdit}
              bankName={order.bankDetails.bankName}
              accountNumber={order.bankDetails.accountNumber}
              isValid={isValid}
              setIsValid={setIsValid}
              checkedItems={checkedItems}
              setCheckedItems={setCheckedItems}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
