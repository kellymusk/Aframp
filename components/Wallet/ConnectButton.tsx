'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Wallet, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWallet } from '@/hooks/useWallet'
import { WalletModal } from './WalletModal'
import { WalletDropdown } from './WalletDropdown'

interface ConnectButtonProps {
  variant?: 'default' | 'ghost' | 'outline'
  size?: 'default' | 'sm' | 'lg'
  className?: string
}

export function ConnectButton({
  variant = 'default',
  size = 'sm',
  className = '',
}: ConnectButtonProps) {
  const { isConnected, isConnecting, formattedAddress } = useWallet()
  const [modalOpen, setModalOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  if (isConnecting) {
    return (
      <Button variant={variant} size={size} disabled className={className}>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Connecting...
      </Button>
    )
  }

  if (isConnected && formattedAddress) {
    return (
      <WalletDropdown open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            variant="outline"
            size={size}
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={`font-mono ${className}`}
          >
            <div className="w-2 h-2 rounded-full bg-green-500 mr-2" />
            {formattedAddress}
          </Button>
        </motion.div>
      </WalletDropdown>
    )
  }

  return (
    <>
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Button
          variant={variant}
          size={size}
          onClick={() => setModalOpen(true)}
          className={`shimmer-btn bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-5 ${className}`}
        >
          <Wallet className="mr-1.5 w-4 h-4" />
          Connect
        </Button>
      </motion.div>
      <WalletModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  )
}
