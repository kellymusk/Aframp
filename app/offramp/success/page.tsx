"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Check, Download, Mail, Share2, ArrowRight, ExternalLink, History, LayoutDashboard, Star, Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/onramp/formatters"
import { generateReceiptPDF } from "@/lib/offramp/pdf-generator"
import { toast } from "sonner"

export default function OfframpSuccessPage() {
    const [rating, setRating] = useState(0)
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
    const [isSendingEmail, setIsSendingEmail] = useState(false)
    const receiptRef = useRef<HTMLDivElement>(null)

    // Mock data for the receipt
    const transaction = {
        amount: 79200,
        bank: "Access Bank",
        account: "0123456789",
        reference: "AFRAMP-OFF-A1B2C3",
        timestamp: "Jan 19, 2026 at 19:35 WAT",
        cryptoAsset: "50 cNGN (Stellar)",
        cryptoTx: "8f3e2d...9a1b",
        cryptoTimestamp: "Jan 19, 2026 at 15:23 WAT",
        exchangeRate: 1584,
        fees: 815,
        totalTime: "4 hours 12 minutes",
        email: "user@email.com"
    }

    const handleDownloadPdf = async () => {
        setIsGeneratingPdf(true)
        try {
            const success = await generateReceiptPDF("receipt-content", `Aframp-Receipt-${transaction.reference}.pdf`)
            if (success) {
                toast.success("Receipt downloaded successfully")
            } else {
                toast.error("Failed to generate PDF")
            }
        } catch (err) {
            toast.error("An error occurred")
        } finally {
            setIsGeneratingPdf(false)
        }
    }

    const handleEmailReceipt = async () => {
        setIsSendingEmail(true)
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500))
        setIsSendingEmail(false)
        toast.success(`Receipt emailed to ${transaction.email}`)
    }

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Aframp Transaction Receipt',
                    text: `I just withdrew ${formatCurrency(transaction.amount, "NGN")} via Aframp!`,
                    url: window.location.href,
                })
            } catch (err) {
                console.log("Share failed", err)
            }
        } else {
            toast.info("Sharing is not supported on this browser")
        }
    }

    return (
        <div className="min-h-screen bg-background py-12 px-4 md:px-6">
            <div className="max-w-2xl mx-auto space-y-8">

                {/* Success Header */}
                <div className="text-center space-y-4">
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
                        className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto"
                    >
                        <motion.div
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.4 }}
                        >
                            <Check className="w-12 h-12 text-primary stroke-[3]" />
                        </motion.div>
                    </motion.div>

                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Withdrawal Complete! 💸</h1>
                        <p className="text-xl text-muted-foreground mt-2">
                            {formatCurrency(transaction.amount, "NGN")} sent to your {transaction.bank} account
                        </p>
                    </motion.div>
                </div>

                {/* Receipt Card */}
                <motion.div
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="bg-card border border-border rounded-3xl overflow-hidden shadow-xl"
                >
                    <div id="receipt-content" ref={receiptRef} className="p-6 md:p-8 space-y-8 bg-card">

                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                                    <span className="text-primary-foreground font-bold text-xs">A</span>
                                </div>
                                <span className="font-bold text-sm">Aframp Receipt</span>
                            </div>
                            <span className="text-xs text-muted-foreground font-mono">{transaction.reference}</span>
                        </div>

                        {/* Crypto Section */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Crypto Sold</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Asset</p>
                                    <p className="font-medium">{transaction.cryptoAsset}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Transaction</p>
                                    <div className="flex items-center gap-1">
                                        <span className="font-medium font-mono">{transaction.cryptoTx}</span>
                                        <ExternalLink className="w-3 h-3 text-primary" />
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-sm text-muted-foreground">Confirmed</p>
                                    <p className="font-medium">{transaction.cryptoTimestamp}</p>
                                </div>
                            </div>
                        </div>

                        <hr className="border-border" />

                        {/* Fiat Section */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Fiat Received</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Amount</p>
                                    <p className="text-lg font-bold text-primary">{formatCurrency(transaction.amount, "NGN")}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Bank</p>
                                    <p className="font-medium">{transaction.bank}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Account</p>
                                    <p className="font-medium">{transaction.account}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Reference</p>
                                    <p className="font-medium font-mono">{transaction.reference}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-sm text-muted-foreground">Settled</p>
                                    <p className="font-medium">{transaction.timestamp}</p>
                                </div>
                            </div>
                        </div>

                        <hr className="border-border" />

                        {/* Details Section */}
                        <div className="bg-muted/50 rounded-2xl p-4 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Exchange rate</span>
                                <span className="font-medium">1 cNGN = {formatCurrency(transaction.exchangeRate, "NGN")}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Fees paid</span>
                                <span className="font-medium">{formatCurrency(transaction.fees, "NGN")} (1%)</span>
                            </div>
                            <div className="flex justify-between text-sm border-t border-border pt-3">
                                <span className="text-muted-foreground">Total settlement time</span>
                                <span className="font-medium italic">{transaction.totalTime}</span>
                            </div>
                        </div>
                    </div>

                    {/* Action Footer (Non-printable) */}
                    <div className="p-6 md:p-8 pt-0 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <Button
                                variant="outline"
                                className="w-full gap-2 rounded-xl"
                                onClick={handleDownloadPdf}
                                disabled={isGeneratingPdf}
                            >
                                {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                Download PDF
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full gap-2 rounded-xl"
                                onClick={handleEmailReceipt}
                                disabled={isSendingEmail}
                            >
                                {isSendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                                Email Receipt
                            </Button>
                            <Button variant="outline" className="w-full gap-2 rounded-xl" onClick={handleShare}>
                                <Share2 className="w-4 h-4" />
                                Share
                            </Button>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground italic">Receipt automatically sent to: {transaction.email}</p>
                        </div>
                    </div>
                </motion.div>

                {/* Bank Statement Match */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="bg-primary/5 border border-primary/20 rounded-2xl p-6 space-y-4"
                >
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <ArrowRight className="w-5 h-5 text-primary" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-semibold text-foreground">Check your bank app for:</h3>
                            <div className="text-sm space-y-1">
                                <p><span className="text-muted-foreground">Credit Alert:</span> <span className="font-bold text-foreground">{formatCurrency(transaction.amount, "NGN")}</span></p>
                                <p><span className="text-muted-foreground">From:</span> AFRAMP TECHNOLOGIES LTD</p>
                                <p><span className="text-muted-foreground">Reference:</span> <span className="font-mono text-foreground">{transaction.reference}</span></p>
                            </div>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground border-t border-primary/10 pt-4">
                        If you don't see this, wait 24 hours or <Link href="/support" className="text-primary hover:underline font-medium">Contact Support</Link>
                    </p>
                </motion.div>

                {/* What's Next */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Link href="/offramp" className="contents">
                        <Button className="h-auto py-6 flex-col gap-2 rounded-2xl group w-full">
                            <Plus className="w-6 h-6 transition-transform group-hover:rotate-90" />
                            <span className="text-xs uppercase font-bold tracking-widest">Withdraw More</span>
                        </Button>
                    </Link>
                    <Link href="/dashboard/history" className="contents">
                        <Button variant="secondary" className="h-auto py-6 flex-col gap-2 rounded-2xl w-full">
                            <History className="w-6 h-6" />
                            <span className="text-xs uppercase font-bold tracking-widest">History</span>
                        </Button>
                    </Link>
                    <Link href="/dashboard" className="contents">
                        <Button variant="secondary" className="h-auto py-6 flex-col gap-2 rounded-2xl w-full">
                            <LayoutDashboard className="w-6 h-6" />
                            <span className="text-xs uppercase font-bold tracking-widest">Dashboard</span>
                        </Button>
                    </Link>
                </div>

                {/* Feedback Section */}
                <div className="text-center space-y-4 py-8">
                    <p className="text-muted-foreground font-medium">How was your experience?</p>
                    <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((s) => (
                            <button
                                key={s}
                                onClick={() => setRating(s)}
                                className={`p-2 transition-transform hover:scale-125 ${rating >= s ? 'text-yellow-500' : 'text-muted-foreground/30'}`}
                            >
                                <Star className={`w-8 h-8 ${rating >= s ? 'fill-current' : ''}`} />
                            </button>
                        ))}
                    </div>
                    <AnimatePresence>
                        {rating > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                            >
                                <Button variant="ghost" size="sm" className="text-xs text-primary font-bold uppercase tracking-widest hover:bg-primary/5">
                                    Add quick rating (optional)
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

            </div>
        </div>
    )
}
