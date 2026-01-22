"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"

const networks = [
  {
    name: "Stellar",
    description: "Fast, low-cost cross-border payments",
    token: "XLM",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" className="text-primary" />
        <path d="M5 8.5L19 15.5M5 15.5L19 8.5" stroke="currentColor" strokeWidth="1.5" className="text-primary" />
      </svg>
    ),
  },
  {
    name: "Starknet",
    description: "Ethereum L2 with zero-knowledge proofs",
    token: "STRK",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12 2L3 7V17L12 22L21 17V7L12 2Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
          className="text-primary"
        />
        <path
          d="M12 8L7 11V17L12 20L17 17V11L12 8Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
          className="text-primary"
        />
      </svg>
    ),
  },
  {
    name: "Lightning Network",
    description: "Instant Bitcoin micropayments",
    token: "BTC",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M13 2L4.09 12.63C3.74 13.04 3.56 13.24 3.56 13.41C3.56 13.56 3.63 13.69 3.75 13.78C3.89 13.88 4.15 13.88 4.66 13.88H11L10 22L18.91 11.37C19.26 10.96 19.44 10.76 19.44 10.59C19.44 10.44 19.37 10.31 19.25 10.22C19.11 10.12 18.85 10.12 18.34 10.12H12L13 2Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary"
        />
      </svg>
    ),
  },
]

export function BlockchainNetworks() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section ref={ref} className="py-20 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Multi-Chain Support
          </span>
          <h2
            className="text-3xl md:text-4xl font-bold text-foreground mb-4"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Built on the Best Networks
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Aframp leverages multiple blockchain networks to provide you with the fastest, cheapest, and most secure
            transactions across Africa.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {networks.map((network, index) => (
            <motion.div
              key={network.name}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
            >
              <div className="flex flex-col items-center text-center">
                <div className="p-4 rounded-2xl bg-primary/10 mb-4 group-hover:bg-primary/15 transition-colors">
                  {network.icon}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                    {network.name}
                  </h3>
                  <span className="px-2 py-0.5 rounded-md bg-primary/10 text-xs font-semibold text-primary">
                    {network.token}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{network.description}</p>
              </div>

              {/* Decorative gradient */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-10 text-center"
        >
          <p className="text-sm text-muted-foreground">More networks coming soon — Base, Solana, and Polygon</p>
        </motion.div>
      </div>
    </section>
  )
}
