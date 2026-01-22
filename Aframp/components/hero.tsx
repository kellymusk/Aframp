"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ArrowRight, Wallet, CreditCard, TrendingUp, Zap, Coins } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WalletConnectModal } from "@/components/wallet-connect-modal"

const textRevealVariants = {
  hidden: { y: "100%" },
  visible: (i: number) => ({
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
      delay: i * 0.1,
    },
  }),
}

export function Hero() {
  const [walletModalOpen, setWalletModalOpen] = useState(false)

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-24 pb-16 overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(245,158,11,0.06),transparent_50%)]" />

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8"
            >
              <span className="w-2 h-2 rounded-full bg-primary pulse-glow" />
              <span className="text-sm text-primary font-medium">Powered by cNGN on Stellar (XLM)</span>
            </motion.div>

            {/* Headline */}
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6"
              style={{ fontFamily: "var(--font-display), sans-serif" }}
            >
              <span className="block overflow-hidden">
                <motion.span
                  className="block"
                  variants={textRevealVariants}
                  initial="hidden"
                  animate="visible"
                  custom={0}
                >
                  Pay, Send & Buy
                </motion.span>
              </span>
              <span className="block overflow-hidden">
                <motion.span
                  className="block text-primary"
                  variants={textRevealVariants}
                  initial="hidden"
                  animate="visible"
                  custom={1}
                >
                  Crypto in Africa
                </motion.span>
              </span>
            </h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed"
            >
              Buy crypto from as low as <span className="text-foreground font-semibold">2,000 cNGN</span>. Pay bills,
              send money, and grow your business with Africa's first stablecoin payment platform.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4 mb-10"
            >
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
                <Zap className="mr-2 w-5 h-5" />
                Swap Tokens
              </Button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="flex items-center justify-center lg:justify-start gap-8"
            >
              <div className="text-center lg:text-left">
                <div className="text-2xl font-bold text-foreground">50K+</div>
                <div className="text-sm text-muted-foreground">Active Users</div>
              </div>
              <div className="w-px h-10 bg-border" />
              <div className="text-center lg:text-left">
                <div className="text-2xl font-bold text-foreground">$2M+</div>
                <div className="text-sm text-muted-foreground">Processed Daily</div>
              </div>
              <div className="w-px h-10 bg-border" />
              <div className="text-center lg:text-left">
                <div className="text-2xl font-bold text-foreground">12</div>
                <div className="text-sm text-muted-foreground">Countries</div>
              </div>
            </motion.div>
          </div>

          {/* Right content - Card mockups */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative hidden lg:block"
          >
            {/* Main card */}
            <div className="relative">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                className="bg-card rounded-3xl p-6 shadow-2xl shadow-primary/10 border border-border"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">cNGN Balance</p>
                      <p className="text-2xl font-bold text-foreground">₦2,450,000</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-primary text-sm font-medium">
                    <TrendingUp className="w-4 h-4" />
                    +12.5%
                  </div>
                </div>

                {/* Quick actions */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: Wallet, label: "Buy Crypto" },
                    { icon: CreditCard, label: "Pay Bills" },
                    { icon: ArrowRight, label: "Send" },
                  ].map((action, i) => (
                    <motion.button
                      key={action.label}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <action.icon className="w-5 h-5 text-primary" />
                      <span className="text-xs text-foreground font-medium">{action.label}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Floating transaction card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="absolute -bottom-4 -left-8 bg-card rounded-2xl p-4 shadow-xl border border-border"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">DSTV Subscription</p>
                    <p className="text-xs text-muted-foreground">Paid successfully</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">₦15,000</p>
                    <p className="text-xs text-primary">cNGN</p>
                  </div>
                </div>
              </motion.div>

              {/* Floating crypto card */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1 }}
                className="absolute -top-4 -right-4 bg-primary rounded-2xl p-4 shadow-xl text-primary-foreground"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium opacity-80">BTC Purchase</span>
                </div>
                <p className="text-lg font-bold">0.0025 BTC</p>
                <p className="text-xs opacity-80">≈ 2,000 cNGN</p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
