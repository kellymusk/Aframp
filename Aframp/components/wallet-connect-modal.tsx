"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Wallet,
  Zap,
  Coins,
  ExternalLink,
  CheckCircle2,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useWalletConnect } from "@/hooks/use-wallet-connect"

// Wallet provider type definitions
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      isMetaMask?: boolean
      isTrust?: boolean
      on?: (event: string, callback: (...args: unknown[]) => void) => void
      removeListener?: (event: string, callback: (...args: unknown[]) => void) => void
    }
    coinbaseWalletProvider?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
    }
  }
}

interface WalletOption {
  id: string
  name: string
  icon: React.ReactNode
  chain: "Ethereum" | "Bitcoin" | "Stellar" | "Lightning"
  description: string
  popular?: boolean
}

const walletOptions: WalletOption[] = [
  // Ethereum Wallets
  {
    id: "metamask",
    name: "MetaMask",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          fill="#E2761B"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#E4761B"
        />
        <path
          d="M5.84 14.09c-.17-.5-.27-1.03-.27-1.59 0-.56.1-1.09.27-1.59V8.07H2.18C1.43 9.55 1 11.22 1 13s.43 3.45 1.18 4.93l2.69-2.84.97-.97z"
          fill="#E4761B"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 6.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#E2761B"
        />
        <path
          d="M12 21.75c-1.48 0-2.73-.4-3.71-1.06l-3.57 2.77C6.54 24.02 9.03 25 12 25c4.3 0 8.01-2.47 9.82-5.07l-3.66-2.84c-.87 2.6-3.3 4.53-6.16 4.53z"
          fill="#D7C1B3"
        />
        <path
          d="M15.92 12.75H12V8.5h7.36c.13.72.2 1.47.2 2.25 0 3.35-1.2 6.17-3.28 8.09l-3.57-2.77c1.17-.78 1.95-1.94 2.21-3.31z"
          fill="#233447"
        />
      </svg>
    ),
    chain: "Ethereum",
    description: "Connect using MetaMask",
    popular: true,
  },
  {
    id: "trust-wallet",
    name: "Trust Wallet",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2L2 7l10 5 10-5-10-5z"
          fill="#3375BB"
        />
        <path
          d="M2 17l10 5 10-5M2 12l10 5 10-5"
          stroke="#3375BB"
          strokeWidth="2"
          fill="none"
        />
      </svg>
    ),
    chain: "Ethereum",
    description: "Connect using Trust Wallet",
    popular: true,
  },
  {
    id: "walletconnect",
    name: "WalletConnect",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#3B99FC" />
        <path
          d="M8 12l2 2 4-4"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    chain: "Ethereum",
    description: "Scan QR code to connect",
  },
  {
    id: "coinbase-wallet",
    name: "Coinbase Wallet",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="4" fill="#0052FF" />
        <path
          d="M12 6v12M6 12h12"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
    chain: "Ethereum",
    description: "Connect using Coinbase Wallet",
  },
  // Bitcoin Wallets
  {
    id: "electrum",
    name: "Electrum",
    icon: <Coins className="w-6 h-6 text-orange-500" />,
    chain: "Bitcoin",
    description: "Connect using Electrum",
  },
  {
    id: "blue-wallet",
    name: "Blue Wallet",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="4" fill="#4A90E2" />
        <path
          d="M12 8v8M8 12h8"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
    chain: "Bitcoin",
    description: "Connect using Blue Wallet",
  },
  {
    id: "lightning-wallet",
    name: "Lightning Wallet",
    icon: <Zap className="w-6 h-6 text-yellow-400" />,
    chain: "Lightning",
    description: "Connect using Lightning Network",
  },
  {
    id: "phoenix",
    name: "Phoenix",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2L2 7l10 5 10-5-10-5z"
          fill="#FF6B35"
        />
        <path
          d="M2 17l10 5 10-5M2 12l10 5 10-5"
          stroke="#FF6B35"
          strokeWidth="2"
          fill="none"
        />
      </svg>
    ),
    chain: "Lightning",
    description: "Connect using Phoenix Wallet",
  },
  // Stellar Wallets
  {
    id: "lobstr",
    name: "Lobstr",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#7D00FF" />
        <path
          d="M12 6v12M6 12h12"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
    chain: "Stellar",
    description: "Connect using Lobstr",
  },
  {
    id: "stellar-xlm",
    name: "Stellar XLM",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#7D00FF" />
        <path
          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          fill="white"
        />
      </svg>
    ),
    chain: "Stellar",
    description: "Connect using Stellar",
  },
]

interface WalletConnectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WalletConnectModal({ open, onOpenChange }: WalletConnectModalProps) {
  const router = useRouter()
  const { connectWallet, storeAndNavigate } = useWalletConnect()
  const [selectedChain, setSelectedChain] = useState<"All" | "Ethereum" | "Bitcoin" | "Stellar" | "Lightning">("All")
  const [connecting, setConnecting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const chains = ["All", "Ethereum", "Bitcoin", "Stellar", "Lightning"] as const

  const filteredWallets =
    selectedChain === "All"
      ? walletOptions
      : walletOptions.filter((wallet) => wallet.chain === selectedChain)

  const handleConnect = async (walletId: string) => {
    setConnecting(walletId)
    setError(null)

    try {
      const wallet = walletOptions.find((w) => w.id === walletId)
      if (!wallet) {
        throw new Error("Wallet not found")
      }

      const { address, walletName } = await connectWallet({ id: walletId, name: wallet.name })
      storeAndNavigate(address, walletName)
      onOpenChange(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to connect wallet"
      setError(errorMessage)
      console.error("Wallet connection error:", err)
    } finally {
      setConnecting(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="w-6 h-6" />
            Connect Wallet
          </DialogTitle>
          <DialogDescription>
            Choose a wallet to connect to your account
          </DialogDescription>
        </DialogHeader>

        {/* Chain Filter */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {chains.map((chain) => (
              <button
                key={chain}
                onClick={() => setSelectedChain(chain)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                  selectedChain === chain
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {chain}
              </button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-6 py-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg mx-6 mb-3">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Wallet List */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="space-y-2">
            {filteredWallets.map((wallet) => (
              <motion.button
                key={wallet.id}
                onClick={() => handleConnect(wallet.id)}
                disabled={connecting === wallet.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-all text-left",
                  connecting === wallet.id && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="flex-shrink-0">{wallet.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{wallet.name}</h3>
                    {wallet.popular && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                        Popular
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {wallet.description}
                  </p>
                  <div className="mt-1">
                    <span className="text-xs text-muted-foreground">
                      {wallet.chain}
                    </span>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {connecting === wallet.id ? (
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  ) : (
                    <ExternalLink className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </motion.button>
            ))}
          </div>

          {filteredWallets.length === 0 && (
            <div className="text-center py-12">
              <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No wallets found for this chain</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            New to crypto wallets?{" "}
            <a
              href="#"
              className="text-primary hover:underline"
              onClick={(e) => {
                e.preventDefault()
                // Handle learn more action
              }}
            >
              Learn more about wallets
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

