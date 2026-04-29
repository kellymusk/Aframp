'use client'

import { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Copy, ExternalLink, LogOut, RefreshCw, Wallet, CheckCircle2 } from 'lucide-react'
import { useWallet } from '@/hooks/useWallet'
import { useState } from 'react'

interface WalletDropdownProps {
  children: ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WalletDropdown({ children, open, onOpenChange }: WalletDropdownProps) {
  const {
    publicKey,
    formattedAddress,
    network,
    balances,
    balancesLoading,
    disconnect,
    refreshBalances,
    isMainnet,
  } = useWallet()

  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!publicKey) return

    try {
      await navigator.clipboard.writeText(publicKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handleViewExplorer = () => {
    if (!publicKey) return
    const baseUrl = isMainnet
      ? 'https://stellar.expert/explorer/public/account'
      : 'https://stellar.expert/explorer/testnet/account'
    window.open(`${baseUrl}/${publicKey}`, '_blank')
  }

  const handleDisconnect = () => {
    disconnect()
    onOpenChange(false)
  }

  const handleRefresh = async () => {
    await refreshBalances()
  }

  // Format balance for display
  const formatBalance = (balance: string): string => {
    const num = parseFloat(balance)
    if (num === 0) return '0'
    if (num < 0.0001) return '<0.0001'
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`
    return num.toFixed(4)
  }

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        {/* Header */}
        <DropdownMenuLabel className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-mono text-sm">{formattedAddress}</p>
                <p className="text-xs text-muted-foreground font-normal">
                  {network === 'PUBLIC' ? 'Mainnet' : network || 'Unknown'}
                </p>
              </div>
            </div>
            {!isMainnet && network && (
              <span className="px-2 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full">
                Testnet
              </span>
            )}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Balances */}
        <div className="px-2 py-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">Balances</span>
            <button
              onClick={handleRefresh}
              disabled={balancesLoading}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${balancesLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            <AnimatePresence mode="popLayout">
              {balances.length > 0 ? (
                balances.slice(0, 5).map((bal, index) => (
                  <motion.div
                    key={`${bal.asset}-${bal.issuer || 'native'}`}
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between py-1 px-2 rounded bg-muted/50"
                  >
                    <span className="text-sm font-medium">{bal.asset}</span>
                    <span className="text-sm text-muted-foreground font-mono">
                      {formatBalance(bal.balance)}
                    </span>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-2 text-sm text-muted-foreground">
                  {balancesLoading ? 'Loading...' : 'No balances found'}
                </div>
              )}
            </AnimatePresence>
            {balances.length > 5 && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                +{balances.length - 5} more assets
              </p>
            )}
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Actions */}
        <DropdownMenuItem onClick={handleCopy} className="cursor-pointer">
          {copied ? (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" />
              Copy Address
            </>
          )}
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleViewExplorer} className="cursor-pointer">
          <ExternalLink className="mr-2 h-4 w-4" />
          View on Explorer
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleDisconnect}
          className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
