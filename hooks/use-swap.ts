'use client'

import { useCallback, useState } from 'react'
import { simulateSwap, buildSwapXdr, type SwapAsset, type SwapSimulation } from '@/lib/swap/stellar-swap'
import { signTransactionWithFreighter } from '@/lib/wallet/freighter'
import type { FreighterNetwork } from '@/lib/wallet'

export type SwapStep = 'input' | 'preview' | 'signing' | 'success' | 'error'

export interface UseSwapReturn {
  step: SwapStep
  simulation: SwapSimulation | null
  txHash: string | null
  error: string | null
  isSimulating: boolean
  simulate: (from: SwapAsset, to: SwapAsset, amount: string, slippage: number, network: FreighterNetwork | null) => Promise<void>
  confirmSwap: (publicKey: string, network: FreighterNetwork | null) => Promise<void>
  reset: () => void
}

export function useSwap(): UseSwapReturn {
  const [step, setStep] = useState<SwapStep>('input')
  const [simulation, setSimulation] = useState<SwapSimulation | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)

  const simulate = useCallback(
    async (from: SwapAsset, to: SwapAsset, amount: string, slippage: number, network: FreighterNetwork | null) => {
      setIsSimulating(true)
      setError(null)
      try {
        const sim = await simulateSwap(from, to, amount, slippage, network)
        setSimulation(sim)
        setStep('preview')
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setIsSimulating(false)
      }
    },
    []
  )

  const confirmSwap = useCallback(
    async (publicKey: string, network: FreighterNetwork | null) => {
      if (!simulation) return
      setStep('signing')
      setError(null)
      try {
        const xdr = await buildSwapXdr(publicKey, simulation, network)
        const result = await signTransactionWithFreighter(xdr, network ?? 'PUBLIC')
        if (result.error) throw new Error(result.error)
        // Submit signed XDR to Horizon
        const horizonUrl =
          network === 'TESTNET'
            ? 'https://horizon-testnet.stellar.org'
            : 'https://horizon.stellar.org'
        const submitRes = await fetch(`${horizonUrl}/transactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `tx=${encodeURIComponent(result.signedTxXdr)}`,
        })
        const submitData = await submitRes.json()
        if (!submitRes.ok) {
          throw new Error(submitData?.extras?.result_codes?.transaction ?? 'Transaction failed')
        }
        setTxHash(submitData.hash)
        setStep('success')
      } catch (e) {
        setError((e as Error).message)
        setStep('error')
      }
    },
    [simulation]
  )

  const reset = useCallback(() => {
    setStep('input')
    setSimulation(null)
    setTxHash(null)
    setError(null)
  }, [])

  return { step, simulation, txHash, error, isSimulating, simulate, confirmSwap, reset }
}
