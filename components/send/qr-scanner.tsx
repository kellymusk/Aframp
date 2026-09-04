'use client'

interface QRScannerProps {
  onScan: (address: string) => void
  onClose: () => void
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Scan QR code</h2>
          <button type="button" onClick={onClose} className="text-sm text-muted-foreground">
            Close
          </button>
        </div>
        <div className="mb-4 grid place-items-center rounded-xl border border-dashed border-border bg-muted/30 p-6">
          <div className="h-28 w-28 rounded-xl border-2 border-emerald-500/60 bg-emerald-500/5" />
        </div>
        <button
          type="button"
          onClick={() => onScan('GABCDEF1234567890')}
          className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 font-semibold text-white"
        >
          Mock scan result
        </button>
      </div>
    </div>
  )
}
