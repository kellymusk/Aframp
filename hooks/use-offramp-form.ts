'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FiatCurrency } from '@/types/onramp'
import type { OfframpAssetOption, OfframpFormState } from '@/types/offramp'
import { calculateFiatAmount, calculateFees, getMinMax } from '@/lib/offramp/calculations'
import { formatAmountInput, parseAmountInput } from '@/lib/onramp/formatters'

const STORAGE_KEY = 'offramp:form'
const EXPIRY_MS = 15 * 60 * 1000

const defaultState: OfframpFormState = {
  assetId: 'cngn-stellar',
  amountInput: '',
  fiatCurrency: 'NGN',
}

export function useOfframpForm(options: OfframpAssetOption[], rate: number) {
  const [state, setState] = useState<OfframpFormState>(defaultState)
  const [hydrated, setHydrated] = useState(false)
  const [errors, setErrors] = useState<{ amount?: string; liquidity?: string; limit?: string }>({})
  const [debouncedAmount, setDebouncedAmount] = useState(0)
  const [isCalculating, setIsCalculating] = useState(false)

  useEffect(() => {
    Promise.resolve().then(() => {
      const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
      if (!stored) {
        setHydrated(true)
        return
      }
      const parsed = JSON.parse(stored) as { data: OfframpFormState; timestamp: number }
      if (Date.now() - parsed.timestamp > EXPIRY_MS) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY)
        }
        setHydrated(true)
        return
      }
      setState(parsed.data)
      setHydrated(true)
    })
  }, [])

  useEffect(() => {
    if (!hydrated) return
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ data: state, timestamp: Date.now() }))
    }
  }, [state, hydrated])

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsCalculating(true)
      setDebouncedAmount(parseAmountInput(state.amountInput))
      setIsCalculating(false)
    }, 250)
    return () => clearTimeout(timer)
  }, [state.amountInput])

  const selectedAsset = useMemo(
    () => options.find((option) => option.id === state.assetId) || options[0],
    [options, state.assetId]
  )

  const fiatAmount = useMemo(
    () => calculateFiatAmount(debouncedAmount, rate),
    [debouncedAmount, rate]
  )
  const fees = useMemo(
    () => calculateFees(fiatAmount, selectedAsset?.chain ?? 'Stellar'),
    [fiatAmount, selectedAsset]
  )

  const limits = useMemo(() => getMinMax(state.fiatCurrency), [state.fiatCurrency])

  useEffect(() => {
    const nextErrors: { amount?: string; liquidity?: string; limit?: string } = {}
    if (!state.amountInput || debouncedAmount <= 0) {
      nextErrors.amount = 'Enter an amount to continue.'
    }

    if (fiatAmount && fiatAmount < limits.min) {
      nextErrors.amount = `Minimum withdrawal is ${limits.min.toLocaleString('en-US')}.`
    }

    if (fiatAmount && fiatAmount > limits.max) {
      nextErrors.amount = `Maximum withdrawal is ${limits.max.toLocaleString('en-US')}.`
    }

    const liquidityLimit = 1500000
    if (fiatAmount > liquidityLimit) {
      nextErrors.liquidity = 'Limited liquidity available right now. Try a smaller amount.'
    }

    const dailyLimit = 5000000
    const dailyUsed = 1250000
    if (fiatAmount + dailyUsed > dailyLimit) {
      nextErrors.limit = 'Daily withdrawal limit reached.'
    }

    Promise.resolve().then(() => setErrors(nextErrors))
  }, [debouncedAmount, fiatAmount, limits.max, limits.min, state.amountInput])

  const setAmountInput = useCallback((value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, '')
    const parts = sanitized.split('.')
    let normalized = [parts[0], parts[1]?.slice(0, 6)].filter(Boolean).join('.')
    if (sanitized.startsWith('.') && parts[1]) {
      normalized = `0.${parts[1].slice(0, 6)}`
    }
    setState((prev) => ({ ...prev, amountInput: formatAmountInput(normalized) }))
  }, [])

  const setFiatCurrency = useCallback((currency: FiatCurrency) => {
    setState((prev) => ({ ...prev, fiatCurrency: currency }))
  }, [])

  const setAssetId = useCallback((assetId: string) => {
    setState((prev) => ({ ...prev, assetId }))
  }, [])

  const setMaxAmount = useCallback(() => {
    if (!selectedAsset) return
    setState((prev) => ({
      ...prev,
      amountInput: formatAmountInput(selectedAsset.balance.toString()),
    }))
  }, [selectedAsset])

  const isValid = !errors.amount && !errors.liquidity && !errors.limit && fiatAmount > 0

  return {
    state,
    selectedAsset,
    amountValue: debouncedAmount,
    fiatAmount,
    fees,
    limits,
    errors,
    isCalculating,
    isValid,
    setAmountInput,
    setFiatCurrency,
    setAssetId,
    setMaxAmount,
  }
}
