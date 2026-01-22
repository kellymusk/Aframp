"use client"

import { createContext, useContext, ReactNode } from "react"
import { useEthPrice } from "@/hooks/use-eth-price"

interface EthPriceContextType {
  price: number | null
  loading: boolean
  error: string | null
  lastUpdated: Date | null
  refetch: () => Promise<void>
}

const EthPriceContext = createContext<EthPriceContextType | undefined>(undefined)

export function EthPriceProvider({ children }: { children: ReactNode }) {
  const ethPriceData = useEthPrice()

  return (
    <EthPriceContext.Provider value={ethPriceData}>
      {children}
    </EthPriceContext.Provider>
  )
}

export function useEthPriceContext() {
  const context = useContext(EthPriceContext)
  if (context === undefined) {
    // Return default values instead of throwing error
    // This allows the hook to be used outside the provider without breaking
    return {
      price: null,
      loading: true,
      error: null,
      lastUpdated: null,
      refetch: async () => {},
    }
  }
  return context
}

