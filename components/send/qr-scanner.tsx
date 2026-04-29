'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Flashlight, FlashlightOff, ImageIcon, Keyboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface QRScannerProps {
  onScan: (address: string) => void
  onClose: () => void
}

type Mode = 'camera' | 'manual'
type CameraState = 'requesting' | 'active' | 'denied' | 'unavailable'

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [mode, setMode] = useState<Mode>('camera')
  const [cameraState, setCameraState] = useState<CameraState>('requesting')
  const [torchOn, setTorchOn] = useState(false)
  const [manualInput, setManualInput] = useState('')
  const [scanned, setScanned] = useState(false)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  // Switch to camera and reset state in one event-handler call (avoids setState in effect)
  const switchToCamera = () => {
    setCameraState('requesting')
    setMode('camera')
  }

  useEffect(() => {
    if (mode !== 'camera') {
      stopCamera()
      return () => {
        stopCamera()
      }
    }

    let cancelled = false

    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          return videoRef.current.play()
        }
      })
      .then(() => {
        if (!cancelled) setCameraState('active')
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const e = err as DOMException
          setCameraState(
            e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError'
              ? 'denied'
              : 'unavailable'
          )
        }
      })

    return () => {
      cancelled = true
      stopCamera()
    }
  }, [mode, stopCamera])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as MediaTrackConstraintSet] })
      setTorchOn((t) => !t)
    } catch {
      // Torch not supported
    }
  }

  const handleManualSubmit = () => {
    const val = manualInput.trim()
    if (val.length < 6) return
    setScanned(true)
    setTimeout(() => onScan(val), 400)
  }

  // Simulate a scan for demo (in production, integrate jsQR or a decode library)
  const handleSimulateScan = () => {
    const demo = 'GBSN2ZJBRFWTQHWRJQE4GKDJJDSGPVTLQNQCQX7QR5W5VKHNHQH'
    setScanned(true)
    setTimeout(() => onScan(demo), 600)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-10 pb-4 z-10">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        <h2 className="text-white font-semibold text-base">Scan QR Code</h2>

        <button
          onClick={handleTorch}
          disabled={cameraState !== 'active'}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors disabled:opacity-30"
        >
          {torchOn ? (
            <FlashlightOff className="w-5 h-5 text-white" />
          ) : (
            <Flashlight className="w-5 h-5 text-white" />
          )}
        </button>
      </div>

      {/* Camera area */}
      {mode === 'camera' && (
        <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
          {/* Video feed */}
          <video
            ref={videoRef}
            className={cn(
              'absolute inset-0 w-full h-full object-cover',
              cameraState !== 'active' && 'opacity-0'
            )}
            playsInline
            muted
          />

          {/* Dark overlay with cutout */}
          {cameraState === 'active' && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-black/55" />
              {/* Cutout via box-shadow trick */}
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-2xl"
                style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)' }}
              />
            </div>
          )}

          {/* Scanner frame */}
          {cameraState === 'active' && (
            <div className="relative w-64 h-64">
              {/* Corner brackets */}
              {[
                'top-0 left-0 border-t-2 border-l-2 rounded-tl-xl',
                'top-0 right-0 border-t-2 border-r-2 rounded-tr-xl',
                'bottom-0 left-0 border-b-2 border-l-2 rounded-bl-xl',
                'bottom-0 right-0 border-b-2 border-r-2 rounded-br-xl',
              ].map((cls, i) => (
                <div key={i} className={cn('absolute w-8 h-8 border-emerald-400', cls)} />
              ))}

              {/* Scanning line */}
              {!scanned && (
                <div
                  className="absolute left-2 right-2 h-0.5 bg-emerald-400 rounded-full"
                  style={{
                    top: '50%',
                    animation: 'scanLine 2s ease-in-out infinite',
                  }}
                />
              )}

              {/* Success state */}
              {scanned && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center animate-scale-in">
                    <svg
                      className="w-8 h-8 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}

              {/* Demo tap-to-scan for dev */}
              {!scanned && (
                <button
                  onClick={handleSimulateScan}
                  className="absolute inset-0 opacity-0"
                  aria-label="Tap to simulate scan"
                />
              )}
            </div>
          )}

          {/* Camera not available states */}
          {cameraState === 'requesting' && (
            <div className="flex flex-col items-center gap-3 text-white">
              <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-emerald-400 animate-spin" />
              <p className="text-sm text-white/70">Requesting camera…</p>
            </div>
          )}

          {cameraState === 'denied' && (
            <div className="flex flex-col items-center gap-4 px-8 text-center">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-white/50"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
                  />
                </svg>
              </div>
              <p className="text-white font-medium">Camera access denied</p>
              <p className="text-white/50 text-sm">
                Allow camera access in your browser settings, or enter the address manually below.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMode('manual')}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Enter manually
              </Button>
            </div>
          )}

          {cameraState === 'unavailable' && (
            <div className="flex flex-col items-center gap-3 text-white px-8 text-center">
              <p className="text-white/50 text-sm">Camera unavailable on this device</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMode('manual')}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Enter manually
              </Button>
            </div>
          )}

          {/* Hint text */}
          {cameraState === 'active' && (
            <p className="absolute bottom-28 left-0 right-0 text-center text-white/60 text-sm px-8">
              Point camera at a wallet QR code
            </p>
          )}
        </div>
      )}

      {/* Manual input mode */}
      {mode === 'manual' && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-5">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
            <Keyboard className="w-8 h-8 text-white/60" />
          </div>
          <div className="space-y-2 w-full">
            <p className="text-white/60 text-xs text-center">Paste or type the wallet address</p>
            <Input
              autoFocus
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="G... wallet address"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/30 font-mono h-12 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500/60"
            />
          </div>
          <Button
            onClick={handleManualSubmit}
            disabled={manualInput.trim().length < 6}
            className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold disabled:opacity-40"
          >
            Use this address
          </Button>
        </div>
      )}

      {/* Bottom tab bar */}
      <div className="flex items-center gap-2 px-5 pb-10 pt-4">
        <button
          onClick={switchToCamera}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all',
            mode === 'camera' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70'
          )}
        >
          <ImageIcon className="w-4 h-4" />
          Camera
        </button>
        <button
          onClick={() => setMode('manual')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all',
            mode === 'manual' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70'
          )}
        >
          <Keyboard className="w-4 h-4" />
          Manual
        </button>
      </div>

      <style jsx>{`
        @keyframes scanLine {
          0% {
            transform: translateY(-80px);
            opacity: 1;
          }
          50% {
            transform: translateY(80px);
            opacity: 1;
          }
          100% {
            transform: translateY(-80px);
            opacity: 1;
          }
        }
        @keyframes scale-in {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scale-in {
          animation: scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  )
}
