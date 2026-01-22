"use client"

import { motion } from "framer-motion"
import { ArrowLeftRight, ArrowUp, ArrowDown, Zap, Coins, CreditCard } from "lucide-react"
import { cn } from "@/lib/utils"

interface QuickActionsProps {
  onSwap: () => void
  onSend: () => void
  onReceive: () => void
}

const actions = [
  { icon: ArrowLeftRight, label: "Swap", onClick: (onSwap: () => void) => onSwap(), color: "text-blue-500" },
  { icon: ArrowUp, label: "Send", onClick: (onSend: () => void) => onSend(), color: "text-green-500" },
  { icon: ArrowDown, label: "Receive", onClick: (onReceive: () => void) => onReceive(), color: "text-purple-500" },
  { icon: Zap, label: "Lightning", onClick: () => {}, color: "text-yellow-500" },
  { icon: Coins, label: "Buy Crypto", onClick: () => {}, color: "text-orange-500" },
  { icon: CreditCard, label: "Pay Bills", onClick: () => {}, color: "text-pink-500" },
]

export function QuickActions({ onSwap, onSend, onReceive }: QuickActionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl p-6 border border-border shadow-sm"
    >
      <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
        {actions.map((action, index) => (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (action.label === "Swap") action.onClick(onSwap)
              else if (action.label === "Send") action.onClick(onSend)
              else if (action.label === "Receive") action.onClick(onReceive)
              else action.onClick()
            }}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
          >
            <action.icon className={cn("w-6 h-6", action.color)} />
            <span className="text-xs font-medium text-foreground">{action.label}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}

