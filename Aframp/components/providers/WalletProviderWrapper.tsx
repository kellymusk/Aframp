"use client"

import { WalletProvider } from "@/context/WalletContext"

export default function WalletProviderWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  return <WalletProvider>{children}</WalletProvider>
}
