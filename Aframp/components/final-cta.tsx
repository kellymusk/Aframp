"use client"

import { useState } from "react"
import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import { ArrowRight, Wallet, Coins } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WalletConnectModal } from "@/components/wallet-connect-modal"

export function FinalCTA() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })
  const [walletModalOpen, setWalletModalOpen] = useState(false)

  return (
    <section className="py-24 px-4 bg-muted/30">
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 40 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-4xl mx-auto text-center"
      >
        <h2
          className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 tracking-tight text-balance"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Ready to join Africa's financial revolution?
        </h2>
        <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto text-balance">
          Over 50,000 Africans are already using Aframp to buy crypto, pay bills, and grow their businesses. Start your
          journey today.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            size="lg"
            onClick={() => setWalletModalOpen(true)}
            className="shimmer-btn bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-8 h-14 text-base font-medium shadow-lg shadow-primary/20"
          >
            <Wallet className="mr-2 w-5 h-5" />
            Connect Wallet
          </Button>
          <WalletConnectModal open={walletModalOpen} onOpenChange={setWalletModalOpen} />
          <Button
            variant="outline"
            size="lg"
            className="rounded-full px-8 h-14 text-base font-medium border-border text-foreground hover:bg-muted bg-transparent"
          >
            <Coins className="mr-2 w-5 h-5" />
            Mint NFT
          </Button>
        </div>

        <p className="mt-8 text-sm text-muted-foreground">Free forever for personal use. No credit card required.</p>
      </motion.div>
    </section>
  )
}
