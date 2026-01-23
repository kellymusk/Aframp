"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { CryptoAsset, FiatCurrency, OnrampFormState, PaymentMethod } from "@/types/onramp"
import { calculateCryptoAmount, calculateFeeBreakdown } from "@/lib/onramp/calculations"
import { formatAmountInput, parseAmountInput } from "@/lib/onramp/formatters"
import { getLimits, validateAmount } from "@/lib/onramp/validation"

const STORAGE_KEY = "onramp:form"
const EXPIRY_MS = 15 * 60 * 1000

const defaultState: OnrampFormState = {
  amountInput: "",
  fiatCurrency: "NGN",
  cryptoAsset: "cNGN",
  paymentMethod: "bank_transfer",
}

const currencyAssetMap: Record<FiatCurrency, CryptoAsset> = {
  NGN: "cNGN",
  KES: "cKES",
  GHS: "cGHS",
  ZAR: "USDC",
  UGX: "USDC",
}

export function useOnrampForm(rate: number, walletConnected: boolean) {
  const [state, setState] = useState<OnrampFormState>(defaultState)
  const [errors, setErrors] = useState<{ amount?: string }>({})
  const [isCalculating, setIsCalculating] = useState(false)
  const [debouncedAmount, setDebouncedAmount] = useState(0)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      setHydrated(true)
      return
    }

    const parsed = JSON.parse(stored) as { data: OnrampFormState; timestamp: number }
    if (Date.now() - parsed.timestamp > EXPIRY_MS) {
      localStorage.removeItem(STORAGE_KEY)
      setHydrated(true)
      return
    }

    setState(parsed.data)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ data: state, timestamp: Date.now() }))
  }, [state, hydrated])

  useEffect(() => {
    setIsCalculating(true)
    const timer = setTimeout(() => {
      const amount = parseAmountInput(state.amountInput)
      setDebouncedAmount(amount)
      setIsCalculating(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [state.amountInput, rate])

  useEffect(() => {
    if (!state.amountInput) {
      setErrors({})
      return
    }
    const amount = parseAmountInput(state.amountInput)
    const error = validateAmount(amount, state.fiatCurrency)
    setErrors((prev) => ({ ...prev, amount: error }))
  }, [state.amountInput, state.fiatCurrency])

  const setAmountInput = useCallback((value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, "")
    const parts = sanitized.split(".")
    let normalized = [parts[0], parts[1]?.slice(0, 6)].filter(Boolean).join(".")
    if (sanitized.startsWith(".") && parts[1]) {
      normalized = `0.${parts[1].slice(0, 6)}`
    }
    setState((prev) => ({ ...prev, amountInput: formatAmountInput(normalized) }))
  }, [])

  const setFiatCurrency = useCallback((fiat: FiatCurrency) => {
    setState((prev) => {
      const nextAsset = prev.cryptoAsset.startsWith("c") ? currencyAssetMap[fiat] : prev.cryptoAsset
      return { ...prev, fiatCurrency: fiat, cryptoAsset: nextAsset }
    })
  }, [])

  const setCryptoAsset = useCallback((asset: CryptoAsset) => {
    setState((prev) => ({ ...prev, cryptoAsset: asset }))
  }, [])

  const setPaymentMethod = useCallback((method: PaymentMethod) => {
    setState((prev) => ({ ...prev, paymentMethod: method }))
  }, [])

  const amountValue = useMemo(() => parseAmountInput(state.amountInput), [state.amountInput])
  const cryptoAmount = useMemo(() => calculateCryptoAmount(debouncedAmount, rate), [debouncedAmount, rate])
  const fees = useMemo(
    () => calculateFeeBreakdown(debouncedAmount, state.fiatCurrency, state.paymentMethod),
    [debouncedAmount, state.fiatCurrency, state.paymentMethod]
  )
  const limits = useMemo(() => getLimits(state.fiatCurrency), [state.fiatCurrency])
  const isValid = walletConnected && !errors.amount && amountValue > 0 && rate > 0

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
