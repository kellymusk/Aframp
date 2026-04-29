'use client'

import { useEffect, useMemo, useState } from 'react'
import type { OfframpAssetOption, OfframpChain, OfframpAsset } from '@/types/offramp'

const STELLAR_USDC_ISSUER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'
const STELLAR_CNGN_ISSUER = process.env.NEXT_PUBLIC_CNGN_ISSUER || ''

const erc20Contracts: Record<
  OfframpChain,
  Partial<Record<OfframpAsset, { address: string; decimals: number }>>
> = {
  Ethereum: {
    USDC: { address: '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', decimals: 6 },
    USDT: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
  },
  Polygon: {
    USDC: { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', decimals: 6 },
    USDT: { address: '0xC2132D05D31c914a87C6611C10748AaCbA948e8F', decimals: 6 },
  },
  Base: {
    USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913', decimals: 6 },
  },
  Stellar: {},
}

const rpcUrls: Record<OfframpChain, string> = {
  Ethereum: 'https://cloudflare-eth.com',
  Polygon: 'https://polygon-rpc.com',
  Base: 'https://mainnet.base.org',
  Stellar: 'https://horizon.stellar.org',
}

const baseOptions: OfframpAssetOption[] = [
  { id: 'cngn-stellar', asset: 'cNGN', chain: 'Stellar', label: 'cNGN', balance: 0, icon: '💵' },
  { id: 'usdc-stellar', asset: 'USDC', chain: 'Stellar', label: 'USDC', balance: 0, icon: '🪙' },
  { id: 'usdc-ethereum', asset: 'USDC', chain: 'Ethereum', label: 'USDC', balance: 0, icon: '🪙' },
  { id: 'usdc-polygon', asset: 'USDC', chain: 'Polygon', label: 'USDC', balance: 0, icon: '🪙' },
  { id: 'usdc-base', asset: 'USDC', chain: 'Base', label: 'USDC', balance: 0, icon: '🪙' },
  { id: 'usdt-ethereum', asset: 'USDT', chain: 'Ethereum', label: 'USDT', balance: 0, icon: '🪙' },
  { id: 'usdt-polygon', asset: 'USDT', chain: 'Polygon', label: 'USDT', balance: 0, icon: '🪙' },
  { id: 'xlm-stellar', asset: 'XLM', chain: 'Stellar', label: 'XLM', balance: 0, icon: '✨' },
]

function isEvmAddress(address?: string) {
  return Boolean(address && address.startsWith('0x') && address.length === 42)
}

function isStellarAddress(address?: string) {
  return Boolean(address && address.startsWith('G') && address.length === 56)
}

async function fetchErc20Balance(
  rpcUrl: string,
  contract: string,
  address: string,
  decimals: number
): Promise<number> {
  try {
    const data = `0x70a08231${address.replace('0x', '').padStart(64, '0')}`
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{ to: contract, data }, 'latest'],
      }),
    })

    if (!response.ok) {
      console.warn('Failed to fetch ERC20 balance', {
        rpcUrl,
        contract,
        status: response.status,
      })
      return 0
    }

    const payload = await response.json()
    if (!payload.result) return 0

    const raw = BigInt(payload.result)
    return Number(raw) / 10 ** decimals
  } catch (error) {
    console.warn('Error while fetching ERC20 balance', {
      rpcUrl,
      contract,
      error,
    })
    return 0
  }
}

async function fetchStellarBalances(address: string) {
  const response = await fetch(`${rpcUrls.Stellar}/accounts/${address}`)
  if (!response.ok) throw new Error('Horizon request failed')
  const data = await response.json()
  return data.balances as Array<{
    asset_type: string
    asset_code?: string
    asset_issuer?: string
    balance: string
  }>
}

export function useOfframpBalances(address?: string) {
  const [options, setOptions] = useState<OfframpAssetOption[]>(baseOptions)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadBalances = async () => {
      if (!address) {
        setOptions(baseOptions)
        return
      }

      setLoading(true)
      let nextOptions = [...baseOptions]

      try {
        if (isStellarAddress(address)) {
          const balances = await fetchStellarBalances(address)
          const getStellarAssetBalance = (code: string, issuer?: string) => {
            const match = balances.find(
              (item) => item.asset_code === code && item.asset_issuer === issuer
            )
            return match ? Number(match.balance) : 0
          }

          const native = balances.find((item) => item.asset_type === 'native')
          const xlmBalance = native ? Number(native.balance) : 0

          nextOptions = nextOptions.map((option) => {
            if (option.chain !== 'Stellar') return option
            if (option.asset === 'XLM') return { ...option, balance: xlmBalance }
            if (option.asset === 'USDC')
              return { ...option, balance: getStellarAssetBalance('USDC', STELLAR_USDC_ISSUER) }
            if (option.asset === 'cNGN')
              return {
                ...option,
                balance: STELLAR_CNGN_ISSUER
                  ? getStellarAssetBalance('cNGN', STELLAR_CNGN_ISSUER)
                  : 0,
              }
            return option
          })
        }

        if (isEvmAddress(address)) {
          const evmChains: OfframpChain[] = ['Ethereum', 'Polygon', 'Base']
          const balancePromises = evmChains.flatMap((chain) => {
            const entries = erc20Contracts[chain]
            return Object.entries(entries).map(async ([asset, config]) => {
              if (!config) return null
              try {
                const balance = await fetchErc20Balance(
                  rpcUrls[chain],
                  config.address,
                  address,
                  config.decimals
                )
                return { chain, asset: asset as OfframpAsset, balance }
              } catch (error) {
                console.error(`Failed to fetch ${asset} on ${chain}`, error)
                return { chain, asset: asset as OfframpAsset, balance: 0 }
              }
            })
          })

          const results = (await Promise.all(balancePromises)).filter(Boolean) as Array<{
            chain: OfframpChain
            asset: OfframpAsset
            balance: number
          }>

          nextOptions = nextOptions.map((option) => {
            const match = results.find(
              (result) => result.chain === option.chain && result.asset === option.asset
            )
            return match ? { ...option, balance: match.balance } : option
          })
        }
      } catch (error) {
        console.warn('Failed to load offramp balances', error)
      }

      if (!cancelled) {
        setOptions(nextOptions)
        setLoading(false)
      }
    }

    loadBalances()

    return () => {
      cancelled = true
    }
  }, [address])

  const hasAnyBalance = useMemo(() => options.some((option) => option.balance > 0), [options])

  return { options, loading, hasAnyBalance }
}
