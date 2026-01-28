
import { Info } from "lucide-react"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface FeeBreakdownProps {
    itemRate: number
    asset: string
    fiatCurrency: string
    subtotal: number
    offrampFee: number
    networkFee: number
    bankFee: number
    total: number
}

export function FeeBreakdown({
    itemRate,
    asset,
    fiatCurrency,
    subtotal,
    offrampFee,
    networkFee,
    bankFee,
    total,
}: FeeBreakdownProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: fiatCurrency }).format(amount);
    }

    return (
        <div className="bg-card rounded-[2rem] border border-border/50 p-8 space-y-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/[0.02] rounded-full -mr-32 -mt-32 blur-[100px] transition-all group-hover:bg-primary/[0.05]" />

            <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                    Exchange rate
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <Info className="h-3.5 w-3.5 text-primary/40 hover:text-primary transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="bg-primary text-primary-foreground border-none font-black text-[10px] uppercase tracking-widest p-3 rounded-xl">
                                <p>Guaranteed for 15 minutes</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </span>
                <span className="font-black text-xs text-primary bg-primary/5 px-4 py-1.5 rounded-full border border-primary/20 tracking-tight">
                    1 {asset} = {formatCurrency(itemRate)}
                </span>
            </div>

            <div className="space-y-4 border-t pt-8 border-dashed border-border/50">
                <div className="flex justify-between items-center px-1">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Subtotal</span>
                    <span className="font-black text-sm">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center px-1">
                    <span className="text-xs font-bold text-muted-foreground/70 uppercase tracking-widest">Offramp fee (1%)</span>
                    <span className="text-destructive/80 font-black text-sm">- {formatCurrency(offrampFee)}</span>
                </div>
                <div className="flex justify-between items-center px-1">
                    <span className="text-xs font-bold text-muted-foreground/70 uppercase tracking-widest">Network fee</span>
                    <span className="text-destructive/80 font-black text-sm">- {formatCurrency(networkFee)}</span>
                </div>
                <div className="flex justify-between items-center px-1">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Bank transfer: FREE</span>
                    <span className="text-primary font-black text-[9px] uppercase tracking-[0.2em] bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20 shadow-lg shadow-primary/5">Zero Fee</span>
                </div>
            </div>

            <div className="border-t pt-8 flex flex-col gap-2 group/total">
                <div className="flex items-center justify-between px-1">
                    <span className="font-black text-muted-foreground uppercase tracking-[0.2em] text-[10px]">You receive</span>
                </div>
                <div className="text-5xl font-black text-primary tracking-tighter transition-all group-hover/total:scale-[1.02] origin-left duration-500">
                    {formatCurrency(subtotal)}
                </div>
            </div>
        </div>
    )
}
