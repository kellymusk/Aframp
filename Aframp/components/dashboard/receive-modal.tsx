"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ArrowDown, Copy, Check, QrCode } from "lucide-react"
import { motion } from "framer-motion"

interface ReceiveModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReceiveModal({ open, onOpenChange }: ReceiveModalProps) {
  const [copied, setCopied] = useState(false)
  const walletAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"

  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDown className="w-5 h-5" />
            Receive Tokens
          </DialogTitle>
          <DialogDescription>
            Share your wallet address to receive tokens
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* QR Code Placeholder */}
          <div className="flex justify-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-64 h-64 bg-muted rounded-xl flex items-center justify-center border-2 border-dashed border-border"
            >
              <QrCode className="w-32 h-32 text-muted-foreground opacity-50" />
            </motion.div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Your Wallet Address</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={walletAddress}
                readOnly
                className="flex-1 px-4 py-3 rounded-lg border border-border bg-muted text-foreground font-mono text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="px-3"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-primary" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Network Info */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Network</span>
              <span className="text-foreground font-medium">Multi-chain</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Supported Chains</span>
              <span className="text-foreground font-medium">Ethereum, Bitcoin, Stellar, Lightning</span>
            </div>
          </div>

          <div className="text-xs text-muted-foreground text-center">
            Make sure you're sending tokens on the correct network
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


