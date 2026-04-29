'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  getFreighterStatus,
  requestFreighterAccess,
  fetchStellarBalances,
  getFreighterNetwork,
  getFreighterPublicKey,
  type FreighterNetwork,
  type AssetBalance,
} from './freighter'

export type WalletState = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface WalletStore {
  // Connection state
  state: WalletState
  publicKey: string | null
  network: FreighterNetwork | null
  isFreighterInstalled: boolean
  error: string | null

  // Balances
  balances: AssetBalance[]
  balancesLoading: boolean
  lastBalanceUpdate: number | null

  // Actions
  checkInstalled: () => Promise<boolean>
  connect: () => Promise<boolean>
  disconnect: () => void
  refreshBalances: () => Promise<void>
  autoReconnect: () => Promise<void>
  setError: (error: string | null) => void
  clearError: () => void
}

const BALANCE_REFRESH_INTERVAL = 30000 // 30 seconds

export const useWalletStore = create<WalletStore>()(
  persist(
    (set, get) => ({
      // Initial state
      state: 'disconnected',
      publicKey: null,
      network: null,
      isFreighterInstalled: false,
      error: null,
      balances: [],
      balancesLoading: false,
      lastBalanceUpdate: null,

      checkInstalled: async () => {
        try {
          const status = await getFreighterStatus()
          set({ isFreighterInstalled: status.isInstalled })
          return status.isInstalled
        } catch {
          set({ isFreighterInstalled: false })
          return false
        }
      },

      connect: async () => {
        set({ state: 'connecting', error: null })

        try {
          const status = await getFreighterStatus()

          if (!status.isInstalled) {
            set({
              state: 'error',
              error: 'Freighter wallet is not installed',
              isFreighterInstalled: false,
            })
            return false
          }

          set({ isFreighterInstalled: true })

          // Request access
          const publicKey = await requestFreighterAccess()

          if (!publicKey) {
            set({
              state: 'error',
              error: 'Connection rejected or failed',
            })
            return false
          }

          const network = await getFreighterNetwork()

          set({
            state: 'connected',
            publicKey,
            network,
            error: null,
          })

          // Fetch balances
          void get().refreshBalances()

          return true
        } catch (error) {
          set({
            state: 'error',
            error: error instanceof Error ? error.message : 'Connection failed',
          })
          return false
        }
      },

      disconnect: () => {
        set({
          state: 'disconnected',
          publicKey: null,
          network: null,
          balances: [],
          lastBalanceUpdate: null,
          error: null,
        })
      },

      refreshBalances: async () => {
        const { publicKey, network, state } = get()

        if (state !== 'connected' || !publicKey) {
          return
        }

        set({ balancesLoading: true })

        try {
          const balances = await fetchStellarBalances(publicKey, network || 'PUBLIC')
          set({
            balances,
            balancesLoading: false,
            lastBalanceUpdate: Date.now(),
          })
        } catch (error) {
          console.error('Failed to refresh balances:', error)
          set({ balancesLoading: false })
        }
      },

      autoReconnect: async () => {
        const { publicKey: storedKey, state } = get()

        // Only auto-reconnect if we have a stored key and are disconnected
        if (!storedKey || state === 'connected' || state === 'connecting') {
          return
        }

        try {
          const status = await getFreighterStatus()

          if (!status.isInstalled) {
            set({ isFreighterInstalled: false })
            return
          }

          set({ isFreighterInstalled: true })

          // Check if Freighter is still connected with same key
          if (status.isConnected && status.publicKey === storedKey) {
            set({
              state: 'connected',
              publicKey: status.publicKey,
              network: status.network,
            })
            void get().refreshBalances()
          } else if (status.isAllowed) {
            // Try to get public key silently
            const currentKey = await getFreighterPublicKey()
            if (currentKey === storedKey) {
              const network = await getFreighterNetwork()
              set({
                state: 'connected',
                publicKey: currentKey,
                network,
              })
              void get().refreshBalances()
            } else {
              // Key changed, disconnect
              get().disconnect()
            }
          } else {
            // Not allowed, disconnect
            get().disconnect()
          }
        } catch {
          // Silent fail on auto-reconnect
        }
      },

      setError: (error) => set({ error, state: error ? 'error' : get().state }),

      clearError: () => set({ error: null }),
    }),
    {
      name: 'aframp-wallet',
      partialize: (state: WalletStore) => ({
        publicKey: state.publicKey,
        network: state.network,
      }),
    }
  )
)

// Balance refresh interval manager
let balanceInterval: ReturnType<typeof setInterval> | null = null

export function startBalanceRefresh() {
  if (balanceInterval) return

  balanceInterval = setInterval(() => {
    const { state, refreshBalances } = useWalletStore.getState()
    if (state === 'connected') {
      void refreshBalances()
    }
  }, BALANCE_REFRESH_INTERVAL)
}

export function stopBalanceRefresh() {
  if (balanceInterval) {
    clearInterval(balanceInterval)
    balanceInterval = null
  }
}
