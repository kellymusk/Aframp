'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Wallet,
  Link2,
  Unlink,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Plus,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface ConnectedWallet {
  id: string
  name: string
  type: 'custodial' | 'external' | 'hybrid'
  address: string
  network: string
  balance: string
  connected: boolean
  primary: boolean
  lastActivity: string
}

export function WalletsTab() {
  const [wallets, setWallets] = useState<ConnectedWallet[]>([])
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState<string | null>(null)

  useEffect(() => {
    // Load wallet from localStorage
    const storedAddress = typeof window !== 'undefined' ? localStorage.getItem('walletAddress') : null
    const storedName = typeof window !== 'undefined' ? localStorage.getItem('walletName') : null

    const defaultWallets: ConnectedWallet[] = [
      {
        id: '1',
        name: storedName || 'Aframp Custodial',
        type: 'custodial',
        address: storedAddress || 'GABCD...WXYZ',
        network: 'Stellar',
        balance: '0.00 XLM',
        connected: true,
        primary: true,
        lastActivity: 'Just now',
      },
      {
        id: '2',
        name: 'Freighter',
        type: 'external',
        address: 'GDEF1...5678',
        network: 'Stellar',
        balance: '—',
        connected: false,
        primary: false,
        lastActivity: 'Not connected',
      },
    ]

    setWallets(defaultWallets)
  }, [])

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
    setCopiedAddress(address)
    setTimeout(() => setCopiedAddress(null), 2000)
  }

  const handleRefreshBalance = async (walletId: string) => {
    setRefreshing(walletId)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setRefreshing(null)
  }

  const handleToggleConnection = (walletId: string) => {
    setWallets((prev) =>
      prev.map((w) =>
        w.id === walletId
          ? {
              ...w,
              connected: !w.connected,
              lastActivity: !w.connected ? 'Just now' : 'Disconnected',
            }
          : w
      )
    )
  }

  const truncateAddress = (address: string) => {
    if (address.length <= 12) return address
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const getTypeColor = (type: ConnectedWallet['type']) => {
    switch (type) {
      case 'custodial':
        return 'bg-primary/10 text-primary border-primary/20'
      case 'external':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'hybrid':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Overview */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" />
                Connected Wallets
              </CardTitle>
              <CardDescription>
                Manage your connected wallets and view balances
              </CardDescription>
            </div>
            <Button id="add-wallet-btn" size="sm" variant="outline">
              <Plus className="w-4 h-4" />
              Add Wallet
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {wallets.map((wallet, index) => (
            <motion.div
              key={wallet.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="p-4 rounded-xl border border-border/50 bg-background/30 space-y-3">
                {/* Wallet Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        wallet.connected
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          {wallet.name}
                        </p>
                        {wallet.primary && (
                          <Badge
                            variant="default"
                            className="text-[10px] h-5 bg-primary/10 text-primary border-primary/20"
                          >
                            Primary
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] h-5 ${getTypeColor(wallet.type)}`}
                        >
                          {wallet.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {wallet.network}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        wallet.connected ? 'bg-green-500 pulse-glow' : 'bg-muted-foreground'
                      }`}
                    />
                    <span
                      className={`text-xs ${
                        wallet.connected ? 'text-green-500' : 'text-muted-foreground'
                      }`}
                    >
                      {wallet.connected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                </div>

                <Separator />

                {/* Wallet Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                      Address
                    </p>
                    <div className="flex items-center gap-1.5">
                      <code className="text-xs font-mono text-foreground">
                        {truncateAddress(wallet.address)}
                      </code>
                      <button
                        onClick={() => handleCopyAddress(wallet.address)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Copy wallet address"
                      >
                        {copiedAddress === wallet.address ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                      Balance
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-foreground">
                        {wallet.balance}
                      </span>
                      {wallet.connected && (
                        <button
                          onClick={() => handleRefreshBalance(wallet.id)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="Refresh balance"
                        >
                          <RefreshCw
                            className={`w-3 h-3 ${
                              refreshing === wallet.id ? 'animate-spin' : ''
                            }`}
                          />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Wallet Actions */}
                <div className="flex items-center justify-between pt-1">
                  <p className="text-[10px] text-muted-foreground">
                    {wallet.lastActivity}
                  </p>
                  <div className="flex items-center gap-2">
                    {wallet.connected && wallet.type === 'external' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        id={`view-explorer-${wallet.id}`}
                      >
                        <ExternalLink className="w-3 h-3" />
                        Explorer
                      </Button>
                    )}
                    <Button
                      variant={wallet.connected ? 'ghost' : 'outline'}
                      size="sm"
                      className={`h-7 text-xs ${
                        wallet.connected
                          ? 'text-destructive hover:text-destructive'
                          : 'text-primary'
                      }`}
                      onClick={() => handleToggleConnection(wallet.id)}
                      id={`toggle-wallet-${wallet.id}`}
                    >
                      {wallet.connected ? (
                        <>
                          <Unlink className="w-3 h-3" />
                          Disconnect
                        </>
                      ) : (
                        <>
                          <Link2 className="w-3 h-3" />
                          Connect
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>

      {/* Security Note */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Wallet Security</p>
              <p className="text-xs text-muted-foreground mt-1">
                Your custodial wallet keys are encrypted with AES-256-GCM. External wallets
                connect via secure browser extensions. Never share your private keys or
                recovery phrases.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Help */}
      <div className="flex items-start gap-2 px-1">
        <AlertCircle className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          Having trouble connecting a wallet? Check our{' '}
          <a href="#" className="text-primary hover:underline">
            wallet setup guide
          </a>{' '}
          or{' '}
          <a href="#" className="text-primary hover:underline">
            contact support
          </a>
          .
        </p>
      </div>
    </motion.div>
  )
}
