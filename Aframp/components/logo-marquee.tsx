"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"

const logos = [
  { name: "Binance", initial: "B" },
  { name: "Flutterwave", initial: "F" },
  { name: "Paystack", initial: "P" },
  { name: "MTN MoMo", initial: "M" },
  { name: "Chipper", initial: "C" },
  { name: "Luno", initial: "L" },
  { name: "Kuda Bank", initial: "K" },
  { name: "OPay", initial: "O" },
]

export function LogoMarquee() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section ref={ref} className="py-16 overflow-hidden border-y border-border bg-muted/30">
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.6 }}
        className="text-center mb-10"
      >
        <p className="text-sm text-muted-foreground uppercase tracking-wider font-medium">
          Integrated with Africa's leading platforms
        </p>
      </motion.div>

      <div className="relative">
        {/* Fade masks */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

        {/* Marquee container */}
        <div className="flex animate-marquee">
          {[...logos, ...logos].map((logo, index) => (
            <div
              key={index}
              className="flex items-center justify-center min-w-[180px] h-16 mx-8 opacity-60 hover:opacity-100 transition-all duration-300"
            >
              <div className="flex items-center gap-3 text-muted-foreground hover:text-foreground">
                <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center shadow-sm">
                  <span className="text-sm font-bold text-primary">{logo.initial}</span>
                </div>
                <span className="font-medium text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                  {logo.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
