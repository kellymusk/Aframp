"use client"

import { createContext, useContext, ReactNode } from "react"
import { useBalances } from "@/hooks/use-balances"
import { TokenBalance } from "@/types/balance"

interface BalanceContextType {
  balances: TokenBalance[]
  totalUsdValue: number
  loading: boolean
  lastUpdated: Date | null
  refetch: () => Promise<void>
}

const BalanceContext = createContext<BalanceContextType | undefined>(undefined)

interface BalanceProviderProps {
  children: ReactNode
  walletAddress?: string
}

export function BalanceProvider({ children, walletAddress }: BalanceProviderProps) {
  const balanceData = useBalances(walletAddress)

  return (
    <BalanceContext.Provider value={balanceData}>
      {children}
    </BalanceContext.Provider>
  )
}

export function useBalanceContext() {
  const context = useContext(BalanceContext)
  if (context === undefined) {
    // Return default values instead of throwing error
    return {
      balances: [],
      totalUsdValue: 0,
      loading: true,
      lastUpdated: null,
      refetch: async () => { },
    }
  }
  return context
}


