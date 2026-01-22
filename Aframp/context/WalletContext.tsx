"use client"

import React, { createContext, useEffect, useState } from "react"
import { isConnected, requestAccess, getPublicKey } from "@stellar/freighter-api"

type WalletStatus = "disconnected" | "connecting" | "connected" | "error"

interface WalletState {
  status: WalletStatus
  address?: string
  chain?: "stellar"
  error?: string
}

interface WalletContextValue {
  wallet: WalletState
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
}

export const WalletContext = createContext<WalletContextValue | null>(null)

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>({
    status: "disconnected",
  })

  const connectWallet = async () => {
    try {
      setWallet({ status: "connecting" })

      const installed = await isConnected()
      if (!installed) {
        throw new Error("Install Freighter wallet")
      }

      await requestAccess()
      const address = await getPublicKey()

      const connectedState: WalletState = {
        status: "connected",
        address,
        chain: "stellar",
      }

      setWallet(connectedState)
      localStorage.setItem("wallet", JSON.stringify(connectedState))
    } catch (err: any) {
      setWallet({
        status: "error",
        error: err.message || "Wallet connection failed",
      })
    }
  }

  const disconnectWallet = () => {
    setWallet({ status: "disconnected" })
    localStorage.removeItem("wallet")
  }

  useEffect(() => {
    const saved = localStorage.getItem("wallet")
    if (saved) {
      setWallet(JSON.parse(saved))
    }
  }, [])

  return (
    <WalletContext.Provider
      value={{ wallet, connectWallet, disconnectWallet }}
    >
      {children}
    </WalletContext.Provider>
  )
}
