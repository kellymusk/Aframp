'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CryptoAsset, FiatCurrency, OnrampFormState, PaymentMethod } from '@/types/onramp'
import { calculateCryptoAmount, calculateFeeBreakdown } from '@/lib/onramp/calculations'
import { formatAmountInput, parseAmountInput } from '@/lib/onramp/formatters'
import { getLimits, validateAmount } from '@/lib/onramp/validation'

const STORAGE_KEY = 'onramp:form'
const EXPIRY_MS = 15 * 60 * 1000

const defaultState: OnrampFormState = {
  amountInput: '',
  fiatCurrency: 'NGN',
  cryptoAsset: 'cNGN',
  paymentMethod: 'bank_transfer',
}

const currencyAssetMap: Record<FiatCurrency, CryptoAsset> = {
  NGN: 'cNGN',
  KES: 'cKES',
  GHS: 'cGHS',
  ZAR: 'USDC',
  UGX: 'USDC',
}

export function useOnrampForm(rate: number, _walletConnected: boolean) {
  const [state, setState] = useState<OnrampFormState>(defaultState)
  const [hydrated, setHydrated] = useState(false)
  const [rawAmount, setRawAmount] = useState(0)

  /* -------------------------------
     Restore from localStorage
  -------------------------------- */
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)

    if (!stored) {
      const timer = setTimeout(() => setHydrated(true), 0)
      return () => clearTimeout(timer)
    }

    const parsed = JSON.parse(stored) as {
      data: OnrampFormState
      timestamp: number
    }

    if (Date.now() - parsed.timestamp > EXPIRY_MS) {
      localStorage.removeItem(STORAGE_KEY)
      const timer = setTimeout(() => setHydrated(true), 0)
      return () => clearTimeout(timer)
    }

    const timer = setTimeout(() => {
      setState(parsed.data)
      setHydrated(true)
    }, 0)

    return () => clearTimeout(timer)
  }, [])

  /* -------------------------------
     Persist to localStorage
  -------------------------------- */
  useEffect(() => {
    if (!hydrated) return

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        data: state,
        timestamp: Date.now(),
      })
    )
  }, [state, hydrated])

  /* -------------------------------
     Debounce amount input
  -------------------------------- */
  useEffect(() => {
    const timer = setTimeout(() => {
      const amount = parseAmountInput(state.amountInput)
      setRawAmount(amount)
    }, 300)

    return () => clearTimeout(timer)
  }, [state.amountInput])

  /* -------------------------------
     Derived values (NO setState)
  -------------------------------- */

  const amountValue = useMemo(() => parseAmountInput(state.amountInput), [state.amountInput])

  const isCalculating = amountValue !== rawAmount

  const error = useMemo(() => {
    if (!state.amountInput) return undefined

    return validateAmount(amountValue, state.fiatCurrency)
  }, [amountValue, state.amountInput, state.fiatCurrency])

  const errors = useMemo(() => {
    return {
      amount: error,
    }
  }, [error])

  const cryptoAmount = useMemo(() => calculateCryptoAmount(rawAmount, rate), [rawAmount, rate])

  const fees = useMemo(
    () => calculateFeeBreakdown(rawAmount, state.fiatCurrency, state.paymentMethod),
    [rawAmount, state.fiatCurrency, state.paymentMethod]
  )

  const limits = useMemo(() => getLimits(state.fiatCurrency), [state.fiatCurrency])

  const isValid = !errors.amount && amountValue > 0 && rate > 0

  /* -------------------------------
     Actions
  -------------------------------- */

  const setAmountInput = useCallback((value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, '')
    const parts = sanitized.split('.')

    let normalized = [parts[0], parts[1]?.slice(0, 6)].filter(Boolean).join('.')

    if (sanitized.startsWith('.') && parts[1]) {
      normalized = `0.${parts[1].slice(0, 6)}`
    }

    setState((prev) => ({
      ...prev,
      amountInput: formatAmountInput(normalized),
    }))
  }, [])

  const setFiatCurrency = useCallback((fiat: FiatCurrency) => {
    setState((prev) => {
      const nextAsset = prev.cryptoAsset.startsWith('c') ? currencyAssetMap[fiat] : prev.cryptoAsset

      return {
        ...prev,
        fiatCurrency: fiat,
        cryptoAsset: nextAsset,
      }
    })
  }, [])

  const setCryptoAsset = useCallback((asset: CryptoAsset) => {
    setState((prev) => ({ ...prev, cryptoAsset: asset }))
  }, [])

  const setPaymentMethod = useCallback((method: PaymentMethod) => {
    setState((prev) => ({ ...prev, paymentMethod: method }))
  }, [])

  return {
    state,
    errors,
    isValid,
    isCalculating,
    limits,
    amountValue,
    cryptoAmount,
    fees,
    setAmountInput,
    setFiatCurrency,
    setCryptoAsset,
    setPaymentMethod,
  }
}
