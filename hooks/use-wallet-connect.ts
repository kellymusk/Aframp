'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { Keypair } from '@stellar/stellar-sdk'
import { walletSession } from '@/lib/wallet/session'

declare global {
  interface Window {
    freighterApi?: {
      getPublicKey: () => Promise<string>
    }
  }
}

interface WalletProvider {
  id: string
  name: string
}

const STELLAR_WALLET_IDS = ['freighter', 'lobstr', 'stellar-xlm']

export const useWalletConnect = () => {
  const router = useRouter()

  const generateMockAddress = useCallback((walletId: string) => {
    // EVM-like address for Ethereum wallets
    if (['trust-wallet', 'walletconnect', 'coinbase-wallet'].includes(walletId)) {
      return `0x${Math.random().toString(16).slice(2).padEnd(40, '0').slice(0, 40)}`
    }
    if (['electrum', 'blue-wallet'].includes(walletId)) {
      return `bc1q${Math.random().toString(36).slice(2).padEnd(30, '0').slice(0, 30)}`
    }
    if (['lightning-wallet', 'phoenix'].includes(walletId)) {
      return `lnbc${Math.random().toString(36).slice(2).padEnd(20, '0').slice(0, 20)}`
    }
    // Stellar-like public key placeholder
    if (['freighter', 'lobstr', 'stellar-xlm'].includes(walletId)) {
      return `G${Math.random().toString(36).toUpperCase().slice(2).padEnd(55, 'A').slice(0, 55)}`
    }
    return `0x${Math.random().toString(16).slice(2).padEnd(40, '0').slice(0, 40)}`
  }, [])

  const connectWallet = useCallback(
    async (wallet: WalletProvider): Promise<{ address: string; walletName: string; network?: string }> => {
      const { id: walletId, name: walletName } = wallet

      // Freighter connection
      if (walletId === 'freighter') {
        if (!window.freighterApi?.getPublicKey) {
          throw new Error('Freighter wallet not detected. Please install the Freighter browser extension.')
        }
        try {
          const publicKey = await window.freighterApi.getPublicKey()
          return { address: publicKey, walletName }
        } catch (error) {
          if (error instanceof Error) {
            if (error.message.toLowerCase().includes('user rejected')) {
              throw new Error('Freighter connection cancelled')
            }
            throw new Error(`Freighter connection failed: ${error.message}`)
          }
          throw new Error('Freighter connection failed: unknown error')
        }
      }

      // Coinbase Wallet
      if (walletId === 'coinbase-wallet') {
        if (window.coinbaseWalletProvider) {
          try {
            const accounts = await window.coinbaseWalletProvider.request({ method: 'eth_requestAccounts' })
            if (Array.isArray(accounts) && accounts.length > 0) {
              return { address: accounts[0] as string, walletName }
            }
          } catch {
            // fall through to mock
          }
        }
        return { address: generateMockAddress(walletId), walletName }
      }

      // Trust Wallet
      if (walletId === 'trust-wallet') {
        if (window.ethereum) {
          try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
            if (Array.isArray(accounts) && accounts.length > 0) {
              return { address: accounts[0] as string, walletName }
            }
          } catch {
            // fall through to mock
          }
        }
        return { address: generateMockAddress(walletId), walletName }
      }

      // All other wallets: demo connect
      return { address: generateMockAddress(walletId), walletName }
    },
    [generateMockAddress]
  )

  const storeAndNavigate = useCallback(
    (address: string, walletName: string) => {
      walletSession.setName(walletName)
      walletSession.setAddress(address)
      router.push(`/dashboard?wallet=${encodeURIComponent(walletName)}&address=${address}`)
    },
    [router]
  )

  return { connectWallet, storeAndNavigate }
}
