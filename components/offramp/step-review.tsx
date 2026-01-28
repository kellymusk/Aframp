
"use client"

import * as React from "react"
import { OrderSummaryCard } from "./order-summary-card"
import { FeeBreakdown } from "./fee-breakdown"
import { ImportantInfo } from "./important-info"
import { SettlementAddress } from "./settlement-address"
import { ConfirmationChecklist } from "./confirmation-checklist"
import { MOCK_ORDER, OfframpOrder } from "@/lib/offramp/mock-api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

export function StepReview() {
    const router = useRouter()
    // In a real app, we'd fetch the order ID from URL or context
    const [order, setOrder] = React.useState<OfframpOrder | null>(null)

    // Checklist state
    const [checkedItems, setCheckedItems] = React.useState({
        bankDetails: false,
        fees: false,
        address: false,
        memo: false
    })
    const [isValid, setIsValid] = React.useState(false)

    React.useEffect(() => {
        // Simulate fetching order data
        setOrder(MOCK_ORDER)
    }, [])

    if (!order) return <div className="p-8 text-center text-muted-foreground">Loading order details...</div>

    const handleConfirm = () => {
        // Proceed to next step (e.g. pending status page)
        console.log("Order confirmed:", order.id)
        // router.push(`/offramp/status/${order.id}`)
        alert("Order Confirmed! Redirecting to status page...")
    }

    const handleEdit = () => {
        // Go back to previous step
        console.log("Edit requested")
        router.back()
    }

    const handleRefresh = () => {
        console.log("Refreshing rate...")
        if (order) {
            setOrder({
                ...order,
                expiresAt: new Date(Date.now() + 15 * 60 * 1000)
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
                            exchangeRate={order.exchangeRate}
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

                        <ImportantInfo
                            expiresAt={order.expiresAt}
                            onRefresh={handleRefresh}
                        />
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
                            bankFee={order.fees.bankFee}
                            total={order.fiatAmount - order.fees.offrampFee - order.fees.networkFee - order.fees.bankFee}
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
                        />
                    </div>
                </div>

            </div>
        </div>
    )
}
