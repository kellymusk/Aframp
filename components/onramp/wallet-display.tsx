'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, Copy, ExternalLink, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { isValidStellarAddress } from '@/lib/onramp/validation'
import { truncateAddress } from '@/lib/onramp/formatters'

interface WalletDisplayProps {
  address: string
  addressOptions: string[]
  onCopy: () => void
  onChangeWallet: (address: string) => void
  onDisconnect: () => void
}

export function WalletDisplay({
  address,
  addressOptions,
  onCopy,
  onChangeWallet,
  onDisconnect,
}: WalletDisplayProps) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [switchOpen, setSwitchOpen] = useState(false)
  const [newAddress, setNewAddress] = useState('')
  const [showCopied, setShowCopied] = useState(false)
  const truncated = truncateAddress(address, 5)

  const options = useMemo(() => {
    const unique = new Set(addressOptions.filter(isValidStellarAddress))
    if (address) unique.add(address)
    return Array.from(unique)
  }, [address, addressOptions])

  const handleCopy = () => {
    onCopy()
    setShowCopied(true)
    setTimeout(() => setShowCopied(false), 1500)
  }

  const handleAdd = () => {
    if (isValidStellarAddress(newAddress)) {
      onChangeWallet(newAddress)
      setNewAddress('')
      setSwitchOpen(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-success/5 px-4 py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Wallet className="h-4 w-4 text-success" />
            Receiving Wallet (Stellar)
          </div>
          <button
            type="button"
            onClick={() => setDetailsOpen(true)}
            className="mt-2 inline-flex items-center gap-2 rounded-full bg-background px-3 py-1 text-xs font-medium text-foreground shadow-sm"
            title={address}
          >
            {truncated}
            <span className="inline-flex items-center gap-1 text-success">
              <CheckCircle2 className="h-3.5 w-3.5" /> Connected
            </span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy} aria-label="Copy wallet address">
            <Copy className="h-4 w-4" />
            {showCopied ? 'Copied' : 'Copy'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSwitchOpen(true)}>
            Change Wallet
          </Button>
        </div>
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connected Wallet</DialogTitle>
            <DialogDescription>Review or manage your Stellar wallet.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground break-all">
              {address}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="h-4 w-4" /> Copy address
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <a
                  href={`https://stellar.expert/explorer/public/account/${address}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="h-4 w-4" /> View on Stellar Explorer
                </a>
              </Button>
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <Button variant="ghost" size="sm" onClick={onDisconnect} className="text-destructive">
              Disconnect
            </Button>
            <Button onClick={() => setDetailsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={switchOpen} onOpenChange={setSwitchOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Wallet</DialogTitle>
            <DialogDescription>Select another connected account or add one.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              {options.length === 0 ? (
                <p className="text-sm text-muted-foreground">No saved wallets found.</p>
              ) : (
                options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      onChangeWallet(option)
                      setSwitchOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs',
                      option === address
                        ? 'border-primary/60 bg-primary/10 text-foreground'
                        : 'border-border text-muted-foreground hover:border-primary/40'
                    )}
                  >
                    <span className="truncate">{truncateAddress(option, 6)}</span>
                    {option === address ? <CheckCircle2 className="h-4 w-4 text-success" /> : null}
                  </button>
                ))
              )}
            </div>
            <div className="rounded-xl border border-dashed border-border px-3 py-3">
              <p className="text-xs font-medium text-foreground">Add another wallet</p>
              <div className="mt-2 flex gap-2">
                <input
                  value={newAddress}
                  onChange={(event) => setNewAddress(event.target.value)}
                  placeholder="Paste Stellar address"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                />
                <Button size="sm" onClick={handleAdd} disabled={!isValidStellarAddress(newAddress)}>
                  Add
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
