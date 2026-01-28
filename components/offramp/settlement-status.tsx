"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    StatusTimeline,
    StepStatus,
    WaitingForCryptoDetails,
    CryptoReceivedDetails,
    ConversionDetails,
    BankTransferDetails,
    CompletionDetails
} from "./status-timeline"
import {
    AlertCircle,
    RefreshCw,
    ArrowLeft,
    MessageSquare,
    LifeBuoy,
    BellRing
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface SettlementStatusProps {
    orderId: string
}

export function SettlementStatus({ orderId }: SettlementStatusProps) {
    const [mounted, setMounted] = useState(false)
    const [currentStep, setCurrentStep] = useState(1)
    const [timeLeft, setTimeLeft] = useState(872) // 14:32 in seconds
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [isAutoUpdateEnabled, setIsAutoUpdateEnabled] = useState(true)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Simulation of state progression for demo purposes
    useEffect(() => {
        if (currentStep < 5) {
            const timer = setTimeout(() => {
                setCurrentStep(prev => prev + 1)
            }, 8000) // Progress every 8 seconds for demo
            return () => clearTimeout(timer)
        }
    }, [currentStep])

    // Countdown for Step 1
    useEffect(() => {
        if (currentStep === 1 && timeLeft > 0) {
            const timer = setInterval(() => {
                setTimeLeft(prev => prev - 1)
            }, 1000)
            return () => clearInterval(timer)
        }
    }, [currentStep, timeLeft])

    const steps = [
        {
            id: 1,
            title: "Step 1: Waiting for Crypto ⏳",
            description: "Waiting for you to send 50 cNGN...",
            status: (currentStep > 1 ? "complete" : currentStep === 1 ? "in-progress" : "waiting") as StepStatus,
            details: currentStep === 1 ? (
                <WaitingForCryptoDetails
                    amount="50 cNGN"
                    address="GAFRAMP...XYZ123"
                    memo="OFF-20260119-A1B2C3"
                    timeLeft={timeLeft}
                />
            ) : null
        },
        {
            id: 2,
            title: "Step 2: Crypto Received ✅",
            description: currentStep >= 2 ? "50 cNGN received! (Confirmed at 15:23 WAT)" : "System will detect incoming crypto",
            status: (currentStep > 2 ? "complete" : currentStep === 2 ? "in-progress" : "waiting") as StepStatus,
            details: currentStep === 2 ? (
                <CryptoReceivedDetails
                    amount="50 cNGN"
                    time="15:23 WAT"
                    txHash="8f3e2d...9a1b"
                    confirmations="12/12"
                />
            ) : null
        },
        {
            id: 3,
            title: "Step 3: Converting to Fiat 🔄",
            description: currentStep >= 3 ? "Converting 50 cNGN to ₦79,200..." : "Instant conversion at locked rate",
            status: (currentStep > 3 ? "complete" : currentStep === 3 ? "in-progress" : "waiting") as StepStatus,
            details: currentStep === 3 ? (
                <ConversionDetails
                    amount="50 cNGN"
                    targetAmount="₦79,200"
                    rate="₦1,584"
                />
            ) : null
        },
        {
            id: 4,
            title: "Step 4: Initiating Bank Transfer 🔄",
            description: currentStep >= 4 ? "Sending ₦79,200 to your Access Bank account..." : "Processing bank payout",
            status: (currentStep > 4 ? "complete" : currentStep === 4 ? "in-progress" : "waiting") as StepStatus,
            details: currentStep === 4 ? (
                <BankTransferDetails
                    amount="₦79,200"
                    account="0123456789"
                    name="CHUKWUEMEKA OKAFOR"
                    reference={`AFRAMP-OFF-${orderId.split('-').pop()}`}
                />
            ) : null
        },
        {
            id: 5,
            title: "Step 5: Transfer Complete ✅",
            description: currentStep === 5 ? "₦79,200 sent to your bank!" : "Arrival depends on bank clearing",
            status: (currentStep === 5 ? "complete" : "waiting") as StepStatus,
            details: currentStep === 5 ? (
                <CompletionDetails
                    amount="₦79,200"
                    duration="4 hours 12 minutes"
                    reference={`AFRAMP-OFF-${orderId.split('-').pop()}`}
                />
            ) : null
        }
    ]

    const handleManualRefresh = () => {
        setIsRefreshing(true)
        setTimeout(() => setIsRefreshing(false), 1500)
    }

    if (!mounted) {
        return <div className="max-w-xl mx-auto px-4 py-8 md:py-12 animate-pulse space-y-8">
            <div className="h-8 bg-muted rounded-lg w-1/3" />
            <div className="h-64 bg-muted rounded-[2rem]" />
        </div>
    }

    return (
        <div className="max-w-xl mx-auto px-4 py-8 md:py-12 space-y-8">
            {/* Header */}
            <div className="flex flex-col space-y-4">
                <Link
                    href="/dashboard"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Dashboard
                </Link>

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold font-cal-sans tracking-tight">Settlement Status</h1>
                        <p className="text-sm text-muted-foreground font-mono mt-1">Order ID: {orderId}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            size="icon"
                            variant="outline"
                            className="rounded-full h-10 w-10 border-border/50 bg-background/50"
                            onClick={handleManualRefresh}
                            disabled={isRefreshing}
                        >
                            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                        </Button>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-500 rounded-full border border-blue-500/20">
                            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Live Updates</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Status Card */}
            <div className="relative p-6 md:p-8 rounded-[2rem] bg-gradient-to-b from-card/80 to-card/40 border border-border/50 shadow-2xl backdrop-blur-sm overflow-hidden">
                {/* Background decorative elements */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none" />

                <StatusTimeline currentStep={currentStep} steps={steps} />

                {/* Progress Bar indicator */}
                <div className="mt-8 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        <span>Progress Tracking</span>
                        <span>{Math.round((currentStep / 5) * 100)}% Complete</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(currentStep / 5) * 100}%` }}
                            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-1000"
                        />
                    </div>
                </div>
            </div>

            {/* Troubleshooting Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                            <AlertCircle className="h-5 w-5 text-amber-500" />
                        </div>
                        <h3 className="font-semibold text-sm">Issue with payment?</h3>
                    </div>
                    <div className="flex flex-col gap-2">
                        <button className="text-left text-xs text-muted-foreground hover:text-foreground transition-colors group">
                            Taking longer than expected? <span className="text-blue-500 group-hover:underline font-medium ml-1">Check Status</span>
                        </button>
                        <button className="text-left text-xs text-muted-foreground hover:text-foreground transition-colors group">
                            Wrong amount sent? <span className="text-blue-500 group-hover:underline font-medium ml-1">Contact Support</span>
                        </button>
                        <button className="text-left text-xs text-muted-foreground hover:text-foreground transition-colors group">
                            Forgot memo? <span className="text-blue-500 group-hover:underline font-medium ml-1">Resolve Issue</span>
                        </button>
                    </div>
                </div>

                <div className="p-5 rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                            <LifeBuoy className="h-5 w-5 text-blue-500" />
                        </div>
                        <h3 className="font-semibold text-sm">Need help?</h3>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Button variant="secondary" className="w-full text-xs h-9 gap-2 rounded-xl">
                            <MessageSquare className="h-3 w-3" />
                            Live Chat
                        </Button>
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                            <BellRing className="h-4 w-4 text-emerald-500" />
                            <div className="flex-1">
                                <p className="text-[10px] font-medium text-emerald-500">Milestone Notifications</p>
                                <p className="text-[9px] text-muted-foreground">Emails sent at each completion step</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
