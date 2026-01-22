"use client"

import { motion, useInView } from "framer-motion"
import { useRef, useEffect, useState } from "react"
import { Wallet, CreditCard, Building2, Zap, Shield, Globe, TrendingUp, TrendingDown } from "lucide-react"

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

function LiveRate() {
  const [rate, setRate] = useState<number | null>(null)
  const [prevRate, setPrevRate] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  useEffect(() => {
    const fetchRate = async () => {
      try {
        const baseRate = 1.0
        const marketVariance = (Math.random() - 0.5) * 0.002
        const newRate = baseRate + marketVariance

        setRate((currentRate) => {
          setPrevRate(currentRate)
          return newRate
        })
        setLastUpdate(new Date())
        setLoading(false)
      } catch {
        setRate(1.0)
        setLoading(false)
      }
    }

    fetchRate()
    const interval = setInterval(fetchRate, 5000)
    return () => clearInterval(interval)
  }, []) // Empty dependency array - runs once on mount

  const trend = prevRate !== null && rate !== null ? rate - prevRate : 0
  const trendColor = trend >= 0 ? "text-green-500" : "text-red-500"

  if (loading) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted animate-pulse">
        <div className="h-6 w-32 bg-muted-foreground/20 rounded" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-foreground">1 cNGN</span>
          <span className="text-muted-foreground">=</span>
          <span className="text-lg font-bold text-primary">₦{rate?.toFixed(4)}</span>
          {trend !== 0 && (
            <span className={`flex items-center ${trendColor}`}>
              {trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </span>
          )}
        </div>
        <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded-full flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          Live
        </span>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>Stablecoin pegged 1:1 to NGN</span>
        <span>Updated {lastUpdate.toLocaleTimeString()}</span>
      </div>
    </div>
  )
}

function TransactionFeed() {
  const transactions = [
    { type: "BTC Buy", amount: "₦50,000", status: "success" },
    { type: "Bill Pay", amount: "₦15,000", status: "success" },
    { type: "ETH Sell", amount: "₦120,000", status: "success" },
  ]

  return (
    <div className="space-y-2">
      {transactions.map((tx, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.2 }}
          className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-sm text-foreground">{tx.type}</span>
          </div>
          <span className="text-sm font-medium text-foreground">{tx.amount}</span>
        </motion.div>
      ))}
    </div>
  )
}

export function BentoGrid() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section id="features" className="py-24 px-4">
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
            Everything you need to transact
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            From buying your first crypto to running a business on cNGN. Built for Africa, by Africans.
          </p>
        </motion.div>

        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {/* Large card - Buy Crypto */}
          <motion.div
            variants={itemVariants}
            className="md:col-span-2 group relative p-6 rounded-3xl bg-card border border-border hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 overflow-hidden"
          >
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="flex-1">
                <div className="p-3 rounded-2xl bg-primary/10 w-fit mb-4">
                  <Wallet className="w-6 h-6 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Buy Crypto from ₦2,000</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Start your crypto journey with as little as 2,000 cNGN. Buy Bitcoin, Ethereum, and more with instant
                  settlement.
                </p>
                <LiveRate />
              </div>
              <div className="flex-1">
                <TransactionFeed />
              </div>
            </div>
          </motion.div>

          {/* Pay Bills */}
          <motion.div
            variants={itemVariants}
            className="group relative p-6 rounded-3xl bg-card border border-border hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
          >
            <div className="p-3 rounded-2xl bg-accent/20 w-fit mb-4">
              <CreditCard className="w-6 h-6 text-accent-foreground" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Pay Bills Instantly</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Airtime, data, electricity, cable TV. Pay all your bills directly with cNGN.
            </p>
            <div className="flex flex-wrap gap-2">
              {["MTN", "Airtel", "DSTV", "IKEDC"].map((bill) => (
                <span key={bill} className="px-3 py-1 text-xs bg-muted rounded-full text-muted-foreground">
                  {bill}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Business Solutions */}
          <motion.div
            variants={itemVariants}
            className="group relative p-6 rounded-3xl bg-card border border-border hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
          >
            <div className="p-3 rounded-2xl bg-primary/10 w-fit mb-4">
              <Building2 className="w-6 h-6 text-primary" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Business Payments</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Accept cNGN payments. Perfect for SMEs looking to expand across Africa.
            </p>
            <div className="flex items-center gap-2 text-primary text-sm font-medium">
              <span>0.5% fees</span>
              <span className="text-xs text-muted-foreground">lowest in market</span>
            </div>
          </motion.div>

          {/* Instant Settlement */}
          <motion.div
            variants={itemVariants}
            className="group relative p-6 rounded-3xl bg-card border border-border hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
          >
            <div className="p-3 rounded-2xl bg-primary/10 w-fit mb-4">
              <Zap className="w-6 h-6 text-primary" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Instant Settlement</h3>
            <p className="text-muted-foreground text-sm mb-4">
              No more waiting. Receive your funds in seconds, not days.
            </p>
            <div className="flex items-center gap-2">
              <span className="font-mono text-2xl font-bold text-primary">{"<"}30s</span>
              <span className="text-xs text-muted-foreground">avg. settlement</span>
            </div>
          </motion.div>

          {/* Security */}
          <motion.div
            variants={itemVariants}
            className="group relative p-6 rounded-3xl bg-card border border-border hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
          >
            <div className="p-3 rounded-2xl bg-primary/10 w-fit mb-4">
              <Shield className="w-6 h-6 text-primary" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Bank-Grade Security</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Your funds are protected with enterprise-level security and insurance.
            </p>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 text-xs bg-muted rounded text-muted-foreground">CBN Licensed</span>
              <span className="px-2 py-1 text-xs bg-muted rounded text-muted-foreground">Insured</span>
            </div>
          </motion.div>

          {/* Pan-African */}
          <motion.div
            variants={itemVariants}
            className="group relative p-6 rounded-3xl bg-card border border-border hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
          >
            <div className="p-3 rounded-2xl bg-primary/10 w-fit mb-4">
              <Globe className="w-6 h-6 text-primary" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Pan-African Reach</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Send money across 12 African countries with zero forex headaches.
            </p>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded">NG</span>
              <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded">GH</span>
              <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded">KE</span>
              <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded">+9</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
