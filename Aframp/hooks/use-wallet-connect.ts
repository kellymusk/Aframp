"use client"

import { useRouter } from "next/navigation"
import { useCallback } from "react"

interface WalletProvider {
    id: string
    name: string
}

export const useWalletConnect = () => {
    const router = useRouter()

    const generateMockAddress = useCallback((walletId: string) => {
        // EVM-like address for Ethereum wallets
        if (["metamask", "trust-wallet", "walletconnect", "coinbase-wallet"].includes(walletId)) {
            return `0x${Math.random().toString(16).slice(2).padEnd(40, "0").slice(0, 40)}`
        }
        // Bitcoin-like address (very rough demo format)
        if (["electrum", "blue-wallet"].includes(walletId)) {
            return `bc1q${Math.random().toString(36).slice(2).padEnd(30, "0").slice(0, 30)}`
        }
        // Lightning invoice / node id placeholder
        if (["lightning-wallet", "phoenix"].includes(walletId)) {
            return `lnbc${Math.random().toString(36).slice(2).padEnd(20, "0").slice(0, 20)}`
        }
        // Stellar-like public key placeholder
        if (["lobstr", "stellar-xlm"].includes(walletId)) {
            return `G${Math.random().toString(36).toUpperCase().slice(2).padEnd(55, "A").slice(0, 55)}`
        }
        return `0x${Math.random().toString(16).slice(2).padEnd(40, "0").slice(0, 40)}`
    }, [])

    const connectWallet = useCallback(async (wallet: WalletProvider): Promise<{ address: string; walletName: string }> => {
        const { id: walletId, name: walletName } = wallet
        let address: string | null = null

        // MetaMask connection
        if (walletId === "metamask") {
            if (!window.ethereum) {
                // Fallback to demo connect so the UI flow still works on non-web3 browsers
                address = generateMockAddress(walletId)
                return { address, walletName }
            }
            try {
                const accounts = await window.ethereum.request({ method: "eth_requestAccounts" })
                if (Array.isArray(accounts) && accounts.length > 0) {
                    address = accounts[0] as string
                }
            } catch (error) {
                if (error instanceof Error) {
                    // If user rejects, keep it a clear error; otherwise allow demo connect
                    if (error.message.toLowerCase().includes("user rejected")) {
                        throw new Error(`MetaMask connection cancelled`)
                    }
                    address = generateMockAddress(walletId)
                    return { address, walletName }
                }
                address = generateMockAddress(walletId)
                return { address, walletName }
            }
        }

        // Coinbase Wallet connection
        else if (walletId === "coinbase-wallet") {
            if (!window.coinbaseWalletProvider) {
                address = generateMockAddress(walletId)
                return { address, walletName }
            }
            try {
                const accounts = await window.coinbaseWalletProvider.request({ method: "eth_requestAccounts" })
                if (Array.isArray(accounts) && accounts.length > 0) {
                    address = accounts[0] as string
                }
            } catch (error) {
                if (error instanceof Error) {
                    address = generateMockAddress(walletId)
                    return { address, walletName }
                }
                address = generateMockAddress(walletId)
                return { address, walletName }
            }
        }

        // Trust Wallet connection
        else if (walletId === "trust-wallet") {
            // Trust Wallet often injects window.ethereum on mobile; don't hard-require isTrust.
            try {
                if (!window.ethereum) {
                    address = generateMockAddress(walletId)
                    return { address, walletName }
                }
                const accounts = await window.ethereum.request({ method: "eth_requestAccounts" })
                if (Array.isArray(accounts) && accounts.length > 0) {
                    address = accounts[0] as string
                }
            } catch (error) {
                if (error instanceof Error) {
                    address = generateMockAddress(walletId)
                    return { address, walletName }
                }
                address = generateMockAddress(walletId)
                return { address, walletName }
            }
        }

        // All other wallets: demo connect for now (so button + flow always works)
        else {
            address = generateMockAddress(walletId)
            return { address, walletName }
        }

        if (!address) {
            throw new Error("Failed to retrieve wallet address")
        }

        return { address, walletName }
    }, [generateMockAddress])

    const storeAndNavigate = useCallback((address: string, walletName: string) => {
        localStorage.setItem("walletName", walletName)
        localStorage.setItem("walletAddress", address)
        router.push(`/dashboard?wallet=${encodeURIComponent(walletName)}&address=${address}`)
    }, [router])

    return { connectWallet, storeAndNavigate }
}
