'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface WalletQrCodeProps {
  address: string
  size?: number
}

/**
 * Renders a QR code for a Stellar address entirely client-side (no
 * third-party image service, so the address is never sent anywhere to
 * generate the code) and offers a PNG download of it.
 */
export function WalletQrCode({ address, size = 200 }: WalletQrCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !address) return

    QRCode.toCanvas(canvas, address, {
      width: size,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    }).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'Could not generate the QR code')
    })
  }, [address, size])

  function downloadPng() {
    const canvas = canvasRef.current
    if (!canvas) return

    const link = document.createElement('a')
    link.download = 'aframp-wallet-address.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {error ? (
        <p className="text-dim text-xs">{error}</p>
      ) : (
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`QR code encoding wallet address ${address}`}
          className="rounded-xl bg-white p-2"
        />
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={downloadPng}
        disabled={!!error}
        className="w-full"
      >
        <Download className="size-4" aria-hidden />
        Download QR as PNG
      </Button>
    </div>
  )
}
