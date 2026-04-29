import { Copy, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import QRCode from 'react-qr-code'
interface SettlementAddressProps {
  address: string
  memo: string
  asset: string
  amount: number
}

export function SettlementAddress({ address, memo, asset, amount }: SettlementAddressProps) {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="h-6 w-1 bg-primary rounded-full" />
        <h3 className="text-lg font-black tracking-tight uppercase tracking-widest text-[12px]">
          Settlement Details
        </h3>
      </div>

      <div className="bg-card border border-border/50 rounded-[2rem] p-8 flex flex-col gap-10 items-center relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

        <div className="space-y-2 text-center">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
            Send your {amount} {asset} to:
          </p>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-2xl shadow-primary/10 border border-primary/20 shrink-0 group transition-all hover:scale-105 duration-500 hover:shadow-primary/20">
          <QRCode
            value={address}
            size={200}
            level="H"
            className="transition-opacity group-hover:opacity-95"
          />
        </div>

        <div className="flex-1 space-y-10 w-full">
          <div className="space-y-4">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
              Deposit Address
            </p>
            <div className="flex gap-3 items-center">
              <div className="bg-secondary/20 p-5 rounded-2xl font-mono text-sm break-all flex-1 border border-border/50 text-foreground leading-relaxed shadow-inner font-bold tracking-tight">
                {address}
              </div>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 h-12 w-12 rounded-xl border-border/50 hover:border-primary hover:bg-primary/5 hover:text-primary transition-all active:scale-[0.95]"
                onClick={() => copyToClipboard(address, 'Address')}
              >
                <Copy className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                Memo: {memo} (REQUIRED)
              </p>
            </div>
            <div className="flex gap-3 items-center">
              <div className="bg-secondary/40 p-5 rounded-2xl font-mono text-lg font-black break-all flex-1 border border-border flex items-center text-foreground shadow-inner">
                <span>{memo}</span>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 h-12 w-12 rounded-xl border-border/50 hover:border-primary hover:bg-primary/5 hover:text-primary transition-all active:scale-[0.95]"
                onClick={() => copyToClipboard(memo, 'Memo')}
              >
                <FileText className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex items-start gap-4 p-5 bg-destructive/[0.03] rounded-2xl border border-destructive/10">
              <div className="h-2 w-2 rounded-full bg-destructive mt-1.5 shrink-0 shadow-lg shadow-destructive/50" />
              <p className="text-xs text-destructive/90 font-bold leading-relaxed opacity-80">
                You MUST include this memo in your Stellar transaction or your funds will not be
                credited automatically.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
