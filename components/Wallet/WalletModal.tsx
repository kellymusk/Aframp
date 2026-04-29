'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Wallet,
  ExternalLink,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Smartphone,
  Monitor,
} from 'lucide-react'
import { useWallet } from '@/hooks/useWallet'

interface WalletModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ModalView = 'connect' | 'installing' | 'connecting' | 'network-warning'

export function WalletModal({ open, onOpenChange }: WalletModalProps) {
  const {
    isFreighterInstalled,
    connect,
    isConnecting,
    isConnected,
    hasError,
    error,
    network,
    clearError,
  } = useWallet()

  const [manualView, setManualView] = useState<ModalView | null>(null)

  const derivedView = useMemo<ModalView>(() => {
    if (isConnecting) return 'connecting'
    if (open && isConnected && network && network !== 'PUBLIC') return 'network-warning'
    if (open && !isFreighterInstalled) return 'installing'
    return 'connect'
  }, [isConnecting, isConnected, network, open, isFreighterInstalled])

  const view = manualView ?? derivedView

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      clearError()
      setManualView(null)
    } else {
      setManualView(null)
    }
    onOpenChange(nextOpen)
  }

  const handleConnect = async () => {
    setManualView('connecting')
    const success = await connect()
    if (!success && !isConnecting) {
      setManualView('connect')
    }
    if (success && (!network || network === 'PUBLIC')) {
      handleOpenChange(false)
    }
  }

  const handleRetry = () => {
    clearError()
    setManualView('connect')
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {view === 'installing' && (
            <InstallView key="install" onCheckAgain={() => setManualView('connect')} />
          )}
          {view === 'connect' && (
            <ConnectView
              key="connect"
              onConnect={handleConnect}
              hasError={hasError}
              error={error}
              onRetry={handleRetry}
              isFreighterInstalled={isFreighterInstalled}
              onShowInstall={() => setManualView('installing')}
            />
          )}
          {view === 'connecting' && <ConnectingView key="connecting" />}
          {view === 'network-warning' && (
            <NetworkWarningView
              key="network"
              network={network}
              onContinue={() => onOpenChange(false)}
              onRefresh={handleRetry}
            />
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}

function InstallView({ onCheckAgain }: { onCheckAgain: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-6"
    >
      <DialogHeader className="pb-4">
        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
          <Wallet className="w-6 h-6" />
          Install Freighter
        </DialogTitle>
        <DialogDescription>Freighter is required to connect to AFRAMP</DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="bg-muted/50 rounded-lg p-4 border border-border">
          <h4 className="font-semibold mb-3">What is Freighter?</h4>
          <p className="text-sm text-muted-foreground">
            Freighter is the most popular Stellar wallet. It lets you securely manage your XLM,
            USDC, cNGN, and other Stellar assets.
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold">Install Options</h4>

          <a
            href="https://chrome.google.com/webstore/detail/freighter/bcacfldlkkdogcmkkibnjlakofdplcbk"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
          >
            <Monitor className="w-8 h-8 text-primary" />
            <div className="flex-1">
              <h5 className="font-medium">Chrome Extension</h5>
              <p className="text-sm text-muted-foreground">For Chrome, Brave, Edge browsers</p>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </a>

          <a
            href="https://www.freighter.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
          >
            <Smartphone className="w-8 h-8 text-primary" />
            <div className="flex-1">
              <h5 className="font-medium">Mobile App</h5>
              <p className="text-sm text-muted-foreground">iOS & Android available</p>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </a>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
            Already installed?
          </h4>
          <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
            If you just installed Freighter, refresh this page or click below.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              window.location.reload()
            }}
            className="w-full"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Page
          </Button>
        </div>

        <Button variant="ghost" className="w-full" onClick={onCheckAgain}>
          I&apos;ve installed it, let me connect
        </Button>
      </div>
    </motion.div>
  )
}

function ConnectView({
  onConnect,
  hasError,
  error,
  onRetry,
  isFreighterInstalled,
  onShowInstall,
}: {
  onConnect: () => void
  hasError: boolean
  error: string | null
  onRetry: () => void
  isFreighterInstalled: boolean
  onShowInstall: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-6"
    >
      <DialogHeader className="pb-4">
        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
          <Wallet className="w-6 h-6" />
          Connect Freighter
        </DialogTitle>
        <DialogDescription>Connect your Stellar wallet to use AFRAMP</DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {hasError && error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-red-50 dark:bg-red-950/30 rounded-lg p-4 border border-red-200 dark:border-red-800"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  Connection Failed
                </p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={onRetry} className="w-full mt-3">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </motion.div>
        )}

        {/* Freighter logo and connect button */}
        <div className="text-center py-4">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
            <svg viewBox="0 0 40 40" className="w-12 h-12 text-white" fill="currentColor">
              <path d="M20 5L5 15v10l15 10 15-10V15L20 5zm0 3.5L31 16l-11 7.5L9 16l11-7.5zM8 18.5l10 6.5v8L8 26.5v-8zm24 0v8l-10 6.5v-8l10-6.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Freighter Wallet</h3>
          <p className="text-sm text-muted-foreground">The most trusted Stellar wallet</p>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 border border-border space-y-2">
          <h4 className="font-semibold text-sm">AFRAMP will be able to:</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              View your wallet address
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              View your asset balances
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Request transaction signatures
            </li>
          </ul>
          <p className="text-xs text-muted-foreground pt-2 border-t border-border mt-2">
            AFRAMP cannot move funds without your explicit approval.
          </p>
        </div>

        {isFreighterInstalled ? (
          <Button className="w-full h-12 text-base" onClick={onConnect}>
            <Wallet className="w-5 h-5 mr-2" />
            Connect Freighter
          </Button>
        ) : (
          <Button className="w-full h-12 text-base" onClick={onShowInstall}>
            <ExternalLink className="w-5 h-5 mr-2" />
            Install Freighter
          </Button>
        )}
      </div>
    </motion.div>
  )
}

function ConnectingView() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-6"
    >
      <DialogHeader className="pb-4">
        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
          <Wallet className="w-6 h-6" />
          Connecting...
        </DialogTitle>
        <DialogDescription>Waiting for Freighter approval</DialogDescription>
      </DialogHeader>

      <div className="text-center py-8">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center animate-pulse">
          <Loader2 className="w-10 h-10 text-white animate-spin" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Check Freighter</h3>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          A popup should appear from Freighter. Click &quot;Connect&quot; to allow AFRAMP to access
          your wallet.
        </p>
      </div>

      <div className="bg-muted/50 rounded-lg p-4 border border-border">
        <p className="text-sm text-muted-foreground text-center">
          Don&apos;t see the popup? Check if Freighter is unlocked and try again.
        </p>
      </div>
    </motion.div>
  )
}

function NetworkWarningView({
  network,
  onContinue,
  onRefresh,
}: {
  network: string | null
  onContinue: () => void
  onRefresh: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-6"
    >
      <DialogHeader className="pb-4">
        <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
          <AlertTriangle className="w-6 h-6" />
          Wrong Network
        </DialogTitle>
        <DialogDescription>
          You&apos;re connected to {network || 'unknown network'}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
          <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
            AFRAMP uses Stellar Mainnet
          </h4>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            For real transactions, please switch to the Public (Mainnet) network in Freighter
            settings.
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 border border-border">
          <h4 className="font-semibold mb-3">How to switch networks:</h4>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="font-bold">1.</span>
              Open Freighter extension
            </li>
            <li className="flex gap-2">
              <span className="font-bold">2.</span>
              Click the network name at the top
            </li>
            <li className="flex gap-2">
              <span className="font-bold">3.</span>
              Select &quot;Mainnet&quot; or &quot;Public&quot;
            </li>
            <li className="flex gap-2">
              <span className="font-bold">4.</span>
              Click refresh below
            </li>
          </ol>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button className="flex-1" onClick={onContinue}>
            Continue Anyway
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
