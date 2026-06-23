'use client'

import { useRef, useState, useEffect } from 'react'
import { Camera, X, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SelfieUploadProps {
  image: string | null
  onUpload: (file: File) => void
  disabled?: boolean
}

export function SelfieUpload({ image, onUpload, disabled }: SelfieUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [preview, setPreview] = useState<string | null>(image || null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const handleFileSelect = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setPreview(result)
    }
    reader.readAsDataURL(file)
    onUpload(file)
  }

  const startCamera = async () => {
    try {
      setCameraError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setCameraActive(true)
      }
    } catch (error) {
      setCameraError(
        error instanceof Error ? error.message : 'Failed to access camera'
      )
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach((track) => track.stop())
    }
    setCameraActive(false)
  }

  const captureSelfie = () => {
    if (!videoRef.current || !canvasRef.current) return

    const context = canvasRef.current.getContext('2d')
    if (!context) return

    canvasRef.current.width = videoRef.current.videoWidth
    canvasRef.current.height = videoRef.current.videoHeight
    context.drawImage(videoRef.current, 0, 0)

    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' })
        handleFileSelect(file)
        stopCamera()
      }
    }, 'image/jpeg')
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0]
    if (file) handleFileSelect(file)
  }

  const handleClear = () => {
    setPreview(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  if (preview) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Selfie</label>
        <div className="relative rounded-lg border-2 border-green-200 bg-green-50 p-4">
          <img
            src={preview}
            alt="Selfie"
            className="h-48 w-full rounded object-cover"
          />
          <div className="absolute right-2 top-2 flex gap-2">
            <div className="rounded-full bg-green-500 p-1">
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
            <button
              onClick={handleClear}
              className="rounded-full bg-red-500 p-1 hover:bg-red-600"
              disabled={disabled}
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (cameraActive) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Selfie</label>
        <div className="rounded-lg border-2 border-gray-300 bg-black p-4">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="h-64 w-full rounded object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
          <div className="mt-4 flex gap-2">
            <Button
              type="button"
              onClick={captureSelfie}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Camera className="mr-2 h-4 w-4" />
              Capture
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={stopCamera}
              disabled={disabled}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Selfie</label>

      {cameraError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{cameraError}</span>
        </div>
      )}

      <div className="space-y-3">
        <Button
          type="button"
          onClick={startCamera}
          disabled={disabled || cameraActive}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          <Camera className="mr-2 h-4 w-4" />
          Take Selfie
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">or</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="w-full"
        >
          Upload Photo
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileUpload}
        className="hidden"
        disabled={disabled}
      />
    </div>
  )
}
