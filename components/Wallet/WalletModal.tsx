'use client'

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Drawer } from 'vaul'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Wallet,
  ExternalLink,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Smartphone,
  Monitor,
  X,
} from 'lucide-react'
import { useWallet } from '@/hooks/useWallet'
import { useIsMobile } from '@/hooks/use-is-mobile'

interface WalletModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ModalView = 'connect' | 'installing' | 'connecting' | 'network-warning'
type ModalVariant = 'dialog' | 'sheet'

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

  const isMobile = useIsMobile()
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

  const viewsProps = {
    view,
    onCheckAgain: () => setManualView('connect'),
    onConnect: handleConnect,
    hasError,
    error,
    onRetry: handleRetry,
    isFreighterInstalled,
    onShowInstall: () => setManualView('installing'),
    network,
    onContinue: () => onOpenChange(false),
    onRefresh: handleRetry,
  }

  if (isMobile) {
    return (
      <Drawer.Root open={open} onOpenChange={handleOpenChange}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/80" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-2xl bg-background max-h-[90vh] outline-none">
            <Drawer.Handle className="mx-auto mt-3 mb-1 h-1.5 w-10 rounded-full bg-muted-foreground/30 shrink-0" />
            <Drawer.Close asChild>
              <button className="absolute right-4 top-4 min-h-11 min-w-11 flex items-center justify-center rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
            </Drawer.Close>
            <div className="overflow-y-auto pb-[env(safe-area-inset-bottom)]">
              <WalletModalViews {...viewsProps} variant="sheet" />
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <WalletModalViews {...viewsProps} variant="dialog" />
      </DialogContent>
    </Dialog>
  )
}

interface WalletModalViewsProps {
  view: ModalView
  variant: ModalVariant
  onCheckAgain: () => void
  onConnect: () => void
  hasError: boolean
  error: string | null
  onRetry: () => void
  isFreighterInstalled: boolean
  onShowInstall: () => void
  network: string | null
  onContinue: () => void
  onRefresh: () => void
}

function WalletModalViews({
  view,
  variant,
  onCheckAgain,
  onConnect,
  hasError,
  error,
  onRetry,
  isFreighterInstalled,
  onShowInstall,
  network,
  onContinue,
  onRefresh,
}: WalletModalViewsProps) {
  return (
    <AnimatePresence mode="wait">
      {view === 'installing' && (
        <InstallView key="install" variant={variant} onCheckAgain={onCheckAgain} />
      )}
      {view === 'connect' && (
        <ConnectView
          key="connect"
          variant={variant}
          onConnect={onConnect}
          hasError={hasError}
          error={error}
          onRetry={onRetry}
          isFreighterInstalled={isFreighterInstalled}
          onShowInstall={onShowInstall}
        />
      )}
      {view === 'connecting' && <ConnectingView key="connecting" variant={variant} />}
      {view === 'network-warning' && (
        <NetworkWarningView
          key="network"
          variant={variant}
          network={network}
          onContinue={onContinue}
          onRefresh={onRefresh}
        />
      )}
    </AnimatePresence>
  )
}

function WalletModalHeader({
  icon,
  title,
  description,
  titleClassName,
  variant,
}: {
  icon: ReactNode
  title: string
  description: ReactNode
  titleClassName?: string
  variant: ModalVariant
}) {
  if (variant === 'dialog') {
    return (
      <DialogHeader className="pb-4">
        <DialogTitle
          className={cn('text-xl sm:text-2xl font-bold flex items-center gap-2', titleClassName)}
        >
          {icon}
          {title}
        </DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
    )
  }
  return (
    <div className="pb-4">
      <h2 className={cn('text-xl font-bold flex items-center gap-2', titleClassName)}>
        {icon}
        {title}
      </h2>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
  )
}

function InstallView({
  onCheckAgain,
  variant,
}: {
  onCheckAgain: () => void
  variant: ModalVariant
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-4 sm:p-6"
    >
      <WalletModalHeader
        variant={variant}
        icon={<Wallet className="w-6 h-6" />}
        title="Install Freighter"
        description="Freighter is required to connect to AFRAMP"
      />

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
            className="flex items-center gap-3 p-4 min-h-[56px] rounded-lg border border-border bg-card hover:bg-muted/50 active:bg-muted/70 transition-colors"
          >
            <Monitor className="w-8 h-8 text-primary shrink-0" />
            <div className="flex-1">
              <h5 className="font-medium">Chrome Extension</h5>
              <p className="text-sm text-muted-foreground">For Chrome, Brave, Edge browsers</p>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
          </a>

          <a
            href="https://www.freighter.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 min-h-[56px] rounded-lg border border-border bg-card hover:bg-muted/50 active:bg-muted/70 transition-colors"
          >
            <Smartphone className="w-8 h-8 text-primary shrink-0" />
            <div className="flex-1">
              <h5 className="font-medium">Mobile App</h5>
              <p className="text-sm text-muted-foreground">iOS & Android available</p>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
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
            onClick={() => window.location.reload()}
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
  variant,
}: {
  onConnect: () => void
  hasError: boolean
  error: string | null
  onRetry: () => void
  isFreighterInstalled: boolean
  onShowInstall: () => void
  variant: ModalVariant
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-4 sm:p-6"
    >
      <WalletModalHeader
        variant={variant}
        icon={<Wallet className="w-6 h-6" />}
        title="Connect Freighter"
        description="Connect your Stellar wallet to use AFRAMP"
      />

      <div className="space-y-4">
        {hasError && error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-red-50 dark:bg-red-950/30 rounded-lg p-4 border border-red-200 dark:border-red-800"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
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

        <div className="text-center py-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-2xl bg-linear-to-br from-purple-500 to-blue-600 flex items-center justify-center">
            <svg
              viewBox="0 0 40 40"
              className="w-10 h-10 sm:w-12 sm:h-12 text-white"
              fill="currentColor"
            >
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

function ConnectingView({ variant }: { variant: ModalVariant }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-4 sm:p-6"
    >
      <WalletModalHeader
        variant={variant}
        icon={<Wallet className="w-6 h-6" />}
        title="Connecting..."
        description="Waiting for Freighter approval"
      />

      <div className="text-center py-8">
        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-6 rounded-2xl bg-linear-to-br from-purple-500 to-blue-600 flex items-center justify-center animate-pulse">
          <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-white animate-spin" />
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
  variant,
}: {
  network: string | null
  onContinue: () => void
  onRefresh: () => void
  variant: ModalVariant
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-4 sm:p-6"
    >
      <WalletModalHeader
        variant={variant}
        icon={<AlertTriangle className="w-6 h-6" />}
        title="Wrong Network"
        description={`You're connected to ${network || 'unknown network'}`}
        titleClassName="text-yellow-600 dark:text-yellow-400"
      />

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

        <div className="flex flex-col sm:flex-row gap-3">
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
