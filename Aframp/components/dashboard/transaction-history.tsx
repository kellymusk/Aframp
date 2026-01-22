"use client"

import { motion } from "framer-motion"
import { ArrowUp, ArrowDown, ArrowLeftRight, Clock, CheckCircle2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface Transaction {
  id: string
  type: "send" | "receive" | "swap"
  amount: string
  currency: string
  to?: string
  from?: string
  status: "pending" | "completed" | "failed"
  timestamp: string
}

const mockTransactions: Transaction[] = [
  {
    id: "1",
    type: "send",
    amount: "15,000",
    currency: "cNGN",
    to: "0x742d...35Cc",
    status: "completed",
    timestamp: "2 hours ago",
  },
  {
    id: "2",
    type: "receive",
    amount: "0.0025",
    currency: "BTC",
    from: "0x8a3f...9D2e",
    status: "completed",
    timestamp: "5 hours ago",
  },
  {
    id: "3",
    type: "swap",
    amount: "50,000",
    currency: "cNGN → ETH",
    status: "pending",
    timestamp: "1 day ago",
  },
  {
    id: "4",
    type: "send",
    amount: "5,000",
    currency: "cNGN",
    to: "0x1a2b...3c4d",
    status: "failed",
    timestamp: "2 days ago",
  },
]

export function TransactionHistory() {
  const getIcon = (type: Transaction["type"]) => {
    switch (type) {
      case "send":
        return <ArrowUp className="w-4 h-4" />
      case "receive":
        return <ArrowDown className="w-4 h-4" />
      case "swap":
        return <ArrowLeftRight className="w-4 h-4" />
    }
  }

  const getStatusIcon = (status: Transaction["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl p-6 border border-border shadow-sm"
    >
      <h3 className="text-lg font-semibold text-foreground mb-4">Recent Transactions</h3>
      <div className="space-y-3">
        {mockTransactions.map((tx, index) => (
          <motion.div
            key={tx.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  tx.type === "send"
                    ? "bg-red-500/10 text-red-500"
                    : tx.type === "receive"
                    ? "bg-green-500/10 text-green-500"
                    : "bg-blue-500/10 text-blue-500"
                )}
              >
                {getIcon(tx.type)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">
                    {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                  </span>
                  {getStatusIcon(tx.status)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {tx.to && `To: ${tx.to}`}
                  {tx.from && `From: ${tx.from}`}
                  {!tx.to && !tx.from && tx.currency}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-foreground">
                {tx.amount} {tx.currency.split(" →")[0]}
              </div>
              <div className="text-xs text-muted-foreground">{tx.timestamp}</div>
            </div>
          </motion.div>
        ))}
      </div>
      <button className="w-full mt-4 py-2 text-sm text-primary hover:text-primary/80 font-medium">
        View All Transactions
      </button>
    </motion.div>
  )
}


