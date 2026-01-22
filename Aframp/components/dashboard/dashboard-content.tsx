"use client"

import { useState } from "react"
import { WalletInfo } from "@/components/dashboard/wallet-info"
import { BalanceCard } from "@/components/dashboard/balance-card"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { TransactionHistory } from "@/components/dashboard/transaction-history"
import { SwapModal } from "@/components/dashboard/swap-modal"
import { SendModal } from "@/components/dashboard/send-modal"
import { ReceiveModal } from "@/components/dashboard/receive-modal"
import { useBalanceContext } from "@/contexts/balance-context"

interface DashboardContentProps {
  walletName: string
  walletAddress: string
}

export function DashboardContent({ walletName, walletAddress }: DashboardContentProps) {
  const [activeModal, setActiveModal] = useState<"swap" | "send" | "receive" | null>(null)
  
  // Get all balances with prices from context
  const { balances, totalUsdValue, loading, lastUpdated } = useBalanceContext()

  return (
    <div className="space-y-6">
      {/* Wallet Info Header */}
      <WalletInfo walletName={walletName} walletAddress={walletAddress} />

      {/* Total Balance */}
      {totalUsdValue > 0 && (
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-6 border border-primary/20">
          <div className="text-sm text-muted-foreground mb-1">Total Balance</div>
          <div className="text-3xl font-bold text-foreground">
            ${totalUsdValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      )}

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {balances.map((balance) => (
          <BalanceCard key={balance.symbol} balance={balance} />
        ))}
      </div>
      
      {/* Price Update Status */}
      {lastUpdated && (
        <div className="text-xs text-muted-foreground text-center">
          Prices updated: {lastUpdated.toLocaleTimeString()} • Refreshes every minute
        </div>
      )}

      {/* Quick Actions */}
      <QuickActions
        onSwap={() => setActiveModal("swap")}
        onSend={() => setActiveModal("send")}
        onReceive={() => setActiveModal("receive")}
      />

      {/* Transaction History */}
      <TransactionHistory />

      {/* Modals */}
      <SwapModal open={activeModal === "swap"} onOpenChange={(open) => !open && setActiveModal(null)} />
      <SendModal open={activeModal === "send"} onOpenChange={(open) => !open && setActiveModal(null)} />
      <ReceiveModal open={activeModal === "receive"} onOpenChange={(open) => !open && setActiveModal(null)} />
    </div>
  )
}

