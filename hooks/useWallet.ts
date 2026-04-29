'use client'

import { useEffect, useCallback } from 'react'
import { useWalletStore, startBalanceRefresh, stopBalanceRefresh } from '@/lib/wallet/walletStore'
import { formatStellarAddress, signTransactionWithFreighter } from '@/lib/wallet/freighter'

export function useWallet() {
  const {
    state,
    publicKey,
    network,
    isFreighterInstalled,
    error,
    balances,
    balancesLoading,
    lastBalanceUpdate,
    checkInstalled,
    connect,
    disconnect,
    refreshBalances,
    autoReconnect,
    clearError,
  } = useWalletStore()

  // Auto-reconnect on mount
  useEffect(() => {
    void checkInstalled()
    void autoReconnect()
  }, [checkInstalled, autoReconnect])

  // Start/stop balance refresh based on connection state
  useEffect(() => {
    if (state === 'connected') {
      startBalanceRefresh()
    } else {
      stopBalanceRefresh()
    }

    return () => {
      stopBalanceRefresh()
    }
  }, [state])

  // Formatted address for display
  const formattedAddress = publicKey ? formatStellarAddress(publicKey) : null

  // Sign transaction helper
  const signTransaction = useCallback(
    (xdr: string, networkPassphrase?: string) => {
      if (!publicKey || state !== 'connected') {
        return { signedTxXdr: '', error: 'Wallet not connected' }
      }
      return signTransactionWithFreighter(xdr, network || 'PUBLIC', networkPassphrase)
    },
    [publicKey, network, state]
  )

  // Get specific asset balance
  const getBalance = useCallback(
    (asset: string) => {
      const found = balances.find((b) => b.asset === asset)
      return found?.balance || '0'
    },
    [balances]
  )

  // Check if on mainnet
  const isMainnet = network === 'PUBLIC'
  const isTestnet = network === 'TESTNET'

  return {
    // State
    state,
    isConnected: state === 'connected',
    isConnecting: state === 'connecting',
    isDisconnected: state === 'disconnected',
    hasError: state === 'error',
    error,

    // Wallet info
    publicKey,
    formattedAddress,
    network,
    isFreighterInstalled,
    isMainnet,
    isTestnet,

    // Balances
    balances,
    balancesLoading,
    lastBalanceUpdate,
    getBalance,

    // Actions
    connect,
    disconnect,
    refreshBalances,
    signTransaction,
    clearError,
  }
}

// Export types
export type { FreighterNetwork, AssetBalance } from '@/lib/wallet/freighter'
