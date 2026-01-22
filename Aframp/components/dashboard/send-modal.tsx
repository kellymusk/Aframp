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
import { ArrowUp, ScanLine } from "lucide-react"

interface SendModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SendModal({ open, onOpenChange }: SendModalProps) {
  const [amount, setAmount] = useState("")
  const [address, setAddress] = useState("")
  const [currency, setCurrency] = useState("cNGN")
  const [sending, setSending] = useState(false)

  const currencies = ["cNGN", "BTC", "ETH", "XLM", "USDT"]

  const handleSend = async () => {
    setSending(true)
    // Simulate send
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setSending(false)
    onOpenChange(false)
    // Reset form
    setAmount("")
    setAddress("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUp className="w-5 h-5" />
            Send Tokens
          </DialogTitle>
          <DialogDescription>
            Send tokens to any wallet address
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Amount */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Amount</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {currencies.map((curr) => (
                  <option key={curr} value={curr}>
                    {curr}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-xs text-muted-foreground">
              Balance: 2,450,000 cNGN
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Recipient Address</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="flex-1 px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
              />
              <Button variant="outline" size="sm" className="px-3">
                <ScanLine className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Send Info */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Network Fee</span>
              <span className="text-foreground font-medium">~0.001 {currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="text-foreground font-semibold">
                {amount || "0.00"} {currency}
              </span>
            </div>
          </div>

          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={!amount || !address || sending}
            className="w-full h-12 text-base font-medium"
            size="lg"
          >
            {sending ? "Sending..." : "Send Tokens"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}


