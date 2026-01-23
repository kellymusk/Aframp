"use client"

import { useCallback, useEffect, useState } from "react"
import { isValidStellarAddress } from "@/lib/onramp/validation"

const STORAGE_ADDRESS = "walletAddress"
const STORAGE_WALLET_LIST = "walletAddresses"

export function useWalletConnection() {
  const [address, setAddress] = useState<string>("")
  const [addresses, setAddresses] = useState<string[]>([])
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedAddress = localStorage.getItem(STORAGE_ADDRESS) || ""
    const storedList = localStorage.getItem(STORAGE_WALLET_LIST)
    const parsedList = storedList ? (JSON.parse(storedList) as string[]) : []
    const normalizedList = parsedList.filter(Boolean)

    if (storedAddress && !normalizedList.includes(storedAddress)) {
      normalizedList.unshift(storedAddress)
    }

    setAddresses(normalizedList)
    setAddress(storedAddress)
    setConnected(isValidStellarAddress(storedAddress))
    setLoading(false)
  }, [])

  const updateAddress = useCallback((nextAddress: string) => {
    if (!isValidStellarAddress(nextAddress)) return false

    setAddress(nextAddress)
    setConnected(true)
    localStorage.setItem(STORAGE_ADDRESS, nextAddress)

    setAddresses((prev) => {
      const next = [nextAddress, ...prev.filter((item) => item !== nextAddress)]
      localStorage.setItem(STORAGE_WALLET_LIST, JSON.stringify(next))
      return next
    })

    return true
  }, [])

  const disconnect = useCallback(() => {
    localStorage.removeItem(STORAGE_ADDRESS)
    localStorage.removeItem("walletName")
    setAddress("")
    setConnected(false)
  }, [])

  return {
    address,
    addresses,
    connected,
    loading,
    updateAddress,
    disconnect,
  }
}
