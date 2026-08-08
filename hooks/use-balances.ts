'use client'

import { useState, useEffect, useCallback } from 'react'
import { TokenBalance } from '@/types/balance'


export function useBalances(walletAddress?: string) {
  const { publicKey: storePublicKey, network } = useWalletStore()

  // Prefer the explicitly provided walletAddress; fall back to the store key
  const effectiveAddress = walletAddress ?? storePublicKey ?? undefined

  // Fetch ETH balance from blockchain
  const fetchWalletEthBalance = useCallback(async (address: string) => {
    const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
    if (!alchemyApiKey) {
      console.warn(
        '[use-balances] NEXT_PUBLIC_ALCHEMY_API_KEY is not set — skipping on-chain balance fetch. ' +
          'Get a free key at https://www.alchemy.com and add it to your .env.local.'
      )
      return
    }

    try {
      const response = await fetch(
        `https://eth-mainnet.g.alchemy.com/v2/${alchemyApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getBalance',
            params: [address, 'latest'],
            id: 1,
          }),
        }
      )

  const fetchBalances = useCallback(async () => {
    if (!effectiveAddress) {
      setBalances([])
      setLoading(false)
      return
    }

  const fetchEthPrice = useCallback(async () => {
    try {
      // Use the project's own /api/rates route (backed by CoinGecko) instead of
      // a hardcoded personal server. The route returns { ethereum: { usd: number } }.
      const response = await fetch('/api/rates', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      })

    try {
      // Fetch real Stellar balances from Horizon
      const stellarBalances = await fetchStellarBalances(
        effectiveAddress,
        network ?? 'PUBLIC'
      )

      const data = await response.json() as { ethereum?: { usd?: number } }

      const ethPrice: number | null =
        typeof data?.ethereum?.usd === 'number' ? data.ethereum.usd : null

      if (ethPrice !== null && !isNaN(ethPrice)) {
        setBalances((prev) =>
          prev.map((balance) =>
            balance.symbol === 'ETH'
              ? {
                  ...balance,
                  price: ethPrice,
                  priceLoading: false,
                  priceError: null,
                }
              : balance
          )
        )
        setLastUpdated(new Date())
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch wallet balances'
      setError(message)
      console.error('[useBalances] Error fetching Stellar balances:', err)
    } finally {
      setLoading(false)
    }
  }, [effectiveAddress, network])

  // Fetch on mount and whenever the address/network changes
  useEffect(() => {
    void fetchBalances()

    // Poll for fresh balances every 30 seconds while the address is available
    if (!effectiveAddress) return

    const interval = setInterval(() => {
      void fetchBalances()
    }, REFRESH_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [fetchBalances, effectiveAddress])

  // Calculate total USD value from balances that have a known price
  const totalUsdValue = balances.reduce((total, balance) => {
    if (balance.price != null && balance.amount) {
      return total + balance.amount * balance.price
    }
    return total
  }, 0)

  return {
    balances,
    totalUsdValue,
    loading,
    error,
    lastUpdated,
    refetch: fetchBalances,
  }
}
