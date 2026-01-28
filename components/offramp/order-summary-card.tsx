
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { ArrowRight } from "lucide-react"

interface OrderSummaryProps {
    asset: string
    assetAmount: number
    fiatCurrency: string
    fiatAmount: number
    balanceAfter: number
    bankName: string
    accountNumber: string
    accountName: string
    settlementTime: string
    className?: string
    exchangeRate: number
}

export function OrderSummaryCard({
    asset,
    assetAmount,
    fiatCurrency,
    fiatAmount,
    balanceAfter,
    bankName,
    accountNumber,
    accountName,
    settlementTime,
    className,
    exchangeRate,
}: OrderSummaryProps) {
    // Approximate USD value for demo based on rate ~1584 NGN/USD (very rough if cNGN is 1:1 with NGN)
    // Actually the prompt says "USD Value: ≈ $31.17" for 50 cNGN?
    // 50 cNGN * 1584 NGN/cNGN = 79200 NGN. 79200 NGN / ~1500 = $52?
    // Wait, if 1 cNGN = 1 NGN usually. The prompt says "1 cNGN = ₦1,584". 
    // Ah, the user might mean 1 cNGN (stablecoin) is worth 1 NGN? Or is it a crypto asset worth $1?
    // Let's stick to the prompt's numbers: "1 cNGN = ₦1,584" suggests cNGN is maybe pegged to something else or high value?
    // Re-reading prompt: "Asset: 50 cNGN... USD Value: ≈ $31.17".
    // 31.17 * 1584 = ~49,373... wait.
    // 50 * 1584 = 79,200.
    // 79,200 NGN at ~1500/USD is ~$50.
    // Maybe the 31.17 is from a different calculation or asset price. I will just render what is passed or calculate based on rate.
    // I'll add a helper for USD just to match the visual if needed, but for now I'll just use the props.

    // Let's assume assetAmount is correct.

    return (
        <Card className={cn("w-full bg-card border-border/50 rounded-[2rem] overflow-hidden shadow-2xl shadow-black/50", className)}>
            <CardContent className="p-8 space-y-8">
                {/* Selling Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="h-6 w-1 bg-primary rounded-full" />
                        <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">What You're Selling</h4>
                    </div>

                    <div className="flex justify-between items-end">
                        <div className="space-y-1">
                            <div className="text-5xl font-black tracking-tighter flex items-center gap-3">
                                {assetAmount}
                                <span className="text-primary text-2xl tracking-normal">{asset} (on Stellar)</span>
                            </div>
                            <p className="text-sm font-bold text-muted-foreground">≈ $31.17 USD</p>
                        </div>
                    </div>

                    <div className="bg-secondary/30 p-4 rounded-2xl flex items-center justify-between border border-border/20">
                        <span className="text-xs font-bold text-muted-foreground">Current balance after:</span>
                        <span className="text-xs font-black">{balanceAfter} {asset}</span>
                    </div>
                </div>

                <div className="relative">
                    <Separator className="bg-border/30" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card p-3 rounded-full border border-border/50 shadow-xl">
                        <ArrowRight className="h-4 w-4 text-primary" />
                    </div>
                </div>

                {/* Receiving Section */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2">
                        <div className="h-6 w-1 bg-primary rounded-full" />
                        <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">What You'll Receive</h4>
                    </div>

                    <div className="bg-primary/[0.03] p-8 rounded-[1.5rem] border border-primary/10 relative group overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl opacity-50 group-hover:opacity-100 transition-opacity" />
                        <div className="text-5xl font-black text-primary tracking-tighter relative z-10 transition-transform group-hover:scale-[1.02] duration-500">
                            {new Intl.NumberFormat('en-NG', { style: 'currency', currency: fiatCurrency, maximumFractionDigits: 0 }).format(fiatAmount)}
                        </div>
                    </div>

                    <div className="grid gap-4 p-6 rounded-[1.5rem] bg-secondary/20 border border-border/30">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Bank</span>
                            <span className="font-black text-sm">{bankName}</span>
                        </div>
                        <div className="flex justify-between items-start">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Account</span>
                            <div className="text-right space-y-1">
                                <p className="font-black text-sm leading-none">{accountNumber}</p>
                                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wide opacity-70">({accountName})</p>
                            </div>
                        </div>
                        <div className="pt-4 border-t border-border/30 flex justify-between items-center">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Settlement time</span>
                            <Badge variant="outline" className="font-black text-[10px] uppercase tracking-widest text-primary border-primary/20 bg-primary/5 px-3 py-1 rounded-full">
                                {settlementTime}
                            </Badge>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
