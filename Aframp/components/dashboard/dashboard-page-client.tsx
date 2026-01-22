"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { DashboardContent } from "@/components/dashboard/dashboard-content"

interface DashboardPageClientProps {
  initialWallet?: string
  initialAddress?: string
}

export function DashboardPageClient({ initialWallet, initialAddress }: DashboardPageClientProps) {
  const router = useRouter()
  const [walletAddress, setWalletAddress] = useState<string>("")
  const [walletName, setWalletName] = useState<string>("")
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    // Prefer URL params passed from the server, then fall back to localStorage
    const wallet = initialWallet || localStorage.getItem("walletName")
    const address = initialAddress || localStorage.getItem("walletAddress")

    if (wallet && address) {
      setWalletName(wallet)
      setWalletAddress(address)
      setConnected(true)

      // Ensure persistence
      localStorage.setItem("walletName", wallet)
      localStorage.setItem("walletAddress", address)
    } else {
      // Redirect to home if not connected
      router.push("/")
    }
  }, [initialWallet, initialAddress, router])

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout walletAddress={walletAddress}>
      <DashboardContent walletName={walletName} walletAddress={walletAddress} />
    </DashboardLayout>
  )
}


