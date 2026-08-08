'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ArrowLeftRight, ArrowDown, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { useSwap } from '@/hooks/use-swap'
import { SWAP_ASSETS, type SwapAsset } from '@/lib/swap/stellar-swap'
import type { FreighterNetwork } from '@/lib/wallet'

interface SwapModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DEFAULT_SLIPPAGE = 0.5

export function SwapModal({ open, onOpenChange }: SwapModalProps) {
  const [fromAsset, setFromAsset] = useState<SwapAsset>('cNGN')
  const [toAsset, setToAsset] = useState<SwapAsset>('USDC')
  const [fromAmount, setFromAmount] = useState('')
  const [slippage, setSlippage] = useState(DEFAULT_SLIPPAGE)

  const { step, simulation, txHash, error, isSimulating, simulate, confirmSwap, reset } = useSwap()

  // Read wallet from localStorage (same pattern as rest of app)
  const walletAddress = typeof window !== 'undefined' ? localStorage.getItem('walletAddress') ?? '' : ''
  const network: FreighterNetwork =
    (typeof window !== 'undefined' ? (localStorage.getItem('walletNetwork') as FreighterNetwork) : null) ?? 'PUBLIC'

  const flipAssets = () => {
    setFromAsset(toAsset)
    setToAsset(fromAsset)
    setFromAmount('')
  }

  const handleGetQuote = () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) return
    simulate(fromAsset, toAsset, fromAmount, slippage, network)
  }

  const handleConfirm = () => {
    confirmSwap(walletAddress, network)
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      reset()
      setFromAmount('')
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5" />
            Swap Tokens
          </DialogTitle>
          <DialogDescription>
            {step === 'preview' ? 'Review your transaction before signing' : 'Exchange tokens via Stellar DEX'}
          </DialogDescription>
        </DialogHeader>

        {/* ── INPUT STEP ── */}
        {(step === 'input' || isSimulating) && (
          <div className="space-y-4 py-4">
            {/* From */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">From</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="0.00"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <select
                  value={fromAsset}
                  onChange={(e) => setFromAsset(e.target.value as SwapAsset)}
                  className="px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {SWAP_ASSETS.filter((a) => a !== toAsset).map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Flip */}
            <button
              onClick={flipAssets}
              className="w-full flex items-center justify-center p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
            >
              <ArrowDown className="w-5 h-5 text-muted-foreground" />
            </button>

            {/* To */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">To</label>
              <select
                value={toAsset}
                onChange={(e) => setToAsset(e.target.value as SwapAsset)}
                className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {SWAP_ASSETS.filter((a) => a !== fromAsset).map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            {/* Slippage */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Slippage Tolerance: <span className="text-primary">{slippage}%</span>
              </label>
              <div className="flex gap-2">
                {[0.1, 0.5, 1.0].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSlippage(s)}
                    className={`flex-1 py-1.5 rounded-md text-sm border transition-colors ${
                      slippage === s
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:border-primary'
                    }`}
                  >
                    {s}%
                  </button>
                ))}
                <input
                  type="number"
                  min="0.01"
                  max="50"
                  step="0.1"
                  value={slippage}
                  onChange={(e) => setSlippage(parseFloat(e.target.value) || DEFAULT_SLIPPAGE)}
                  className="w-20 px-2 py-1.5 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <Button
              onClick={handleGetQuote}
              disabled={!fromAmount || parseFloat(fromAmount) <= 0 || isSimulating}
              className="w-full h-12 text-base font-medium"
              size="lg"
            >
              {isSimulating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Finding best route…</>
              ) : (
                'Get Quote'
              )}
            </Button>
          </div>
        )}

        {/* ── PREVIEW STEP ── */}
        {step === 'preview' && simulation && (
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">You send</span>
                <span className="font-semibold">{simulation.fromAmount} {simulation.fromAsset}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">You receive</span>
                <span className="font-semibold text-primary">{parseFloat(simulation.toAmount).toFixed(6)} {simulation.toAsset}</span>
              </div>
              <div className="border-t border-border pt-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rate</span>
                  <span>1 {simulation.fromAsset} = {parseFloat(simulation.rate).toFixed(6)} {simulation.toAsset}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Slippage</span>
                  <span>{simulation.slippagePct}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Min. received</span>
                  <span>{parseFloat(simulation.minReceived).toFixed(6)} {simulation.toAsset}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Network fee</span>
                  <span>{parseInt(simulation.fee) / 1e7} XLM</span>
                </div>
                {simulation.path.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Route</span>
                    <span className="text-right">
                      {simulation.fromAsset} → {simulation.path.map((p) => (p.isNative() ? 'XLM' : p.getCode())).join(' → ')}{simulation.path.length > 0 ? ' → ' : ''}{simulation.toAsset}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Transaction will be signed via Freighter. Review carefully before confirming.
            </p>

            <div className="flex gap-3">
              <Button variant="outline" onClick={reset} className="flex-1">
                Back
              </Button>
              <Button onClick={handleConfirm} className="flex-1 h-11 font-medium">
                Confirm & Sign
              </Button>
            </div>
          </div>
        )}

        {/* ── SIGNING STEP ── */}
        {step === 'signing' && (
          <div className="py-10 flex flex-col items-center gap-4 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="font-medium">Waiting for Freighter signature…</p>
            <p className="text-sm text-muted-foreground">Approve the transaction in your wallet extension</p>
          </div>
        )}

        {/* ── SUCCESS STEP ── */}
        {step === 'success' && (
          <div className="py-8 flex flex-col items-center gap-4 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <p className="text-lg font-semibold">Swap Successful!</p>
            {txHash && (
              <a
                href={`https://stellar.expert/explorer/public/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary underline break-all"
              >
                View on Stellar Expert ↗
              </a>
            )}
            <Button onClick={() => handleClose(false)} className="w-full mt-2">
              Done
            </Button>
          </div>
        )}

        {/* ── ERROR STEP ── */}
        {step === 'error' && (
          <div className="py-6 flex flex-col items-center gap-4 text-center">
            <AlertTriangle className="w-10 h-10 text-destructive" />
            <p className="font-medium text-destructive">Swap Failed</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <div className="flex gap-3 w-full">
              <Button variant="outline" onClick={reset} className="flex-1">Try Again</Button>
              <Button variant="outline" onClick={() => handleClose(false)} className="flex-1">Close</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
