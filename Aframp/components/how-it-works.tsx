"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import { Download, Wallet, ArrowLeftRight, Rocket } from "lucide-react"

const steps = [
  {
    icon: Download,
    title: "Download & Sign Up",
    description: "Get the Aframp app and create your account in under 2 minutes with just your phone number.",
  },
  {
    icon: Wallet,
    title: "Fund Your Wallet",
    description: "Add cNGN to your wallet via bank transfer, card, or mobile money. Zero funding fees.",
  },
  {
    icon: ArrowLeftRight,
    title: "Start Transacting",
    description: "Buy crypto, pay bills, or send money to anyone across Africa instantly.",
  },
  {
    icon: Rocket,
    title: "Grow Your Wealth",
    description: "Earn rewards, access exclusive features, and watch your portfolio grow.",
  },
]

export function HowItWorks() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section id="how-it-works" className="py-24 px-4 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2
            className="text-3xl sm:text-4xl font-bold text-foreground mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Get started in minutes
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            No complex KYC. No hidden fees. Just simple, secure transactions.
          </p>
        </motion.div>

        <motion.div
          ref={ref}
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
              className="relative"
            >
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-px bg-border" />
              )}

              <div className="flex flex-col items-center text-center">
                {/* Step number */}
                <div className="relative mb-4">
                  <div className="w-20 h-20 rounded-3xl bg-card border border-border flex items-center justify-center shadow-sm">
                    <step.icon className="w-8 h-8 text-primary" strokeWidth={1.5} />
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
