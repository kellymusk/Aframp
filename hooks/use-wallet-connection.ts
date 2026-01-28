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

    let finalAddresses = normalizedList
    if (storedAddress && !normalizedList.includes(storedAddress)) {
      finalAddresses = [storedAddress, ...normalizedList]
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAddresses(finalAddresses)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAddress(storedAddress)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConnected(isValidStellarAddress(storedAddress))
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
