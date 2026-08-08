'use client'

import { useRef, useState } from 'react'
import { Upload, X, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface IdUploadProps {
  side: 'front' | 'back'
  image: string | null
  onUpload: (file: File) => void
  disabled?: boolean
}

export function IdUpload({ side, image, onUpload, disabled }: IdUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(image || null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFileSelect = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setPreview(result)
    }
    reader.readAsDataURL(file)
    onUpload(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0]
    if (file) handleFileSelect(file)
  }

  const handleClear = () => {
    setPreview(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        ID {side === 'front' ? 'Front' : 'Back'}
      </label>

      {preview ? (
        <div className="relative rounded-lg border-2 border-green-200 bg-green-50 p-4">
          <img
            src={preview}
            alt={`ID ${side}`}
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
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            'rounded-lg border-2 border-dashed p-8 text-center transition-colors',
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:border-gray-400'
          )}
        >
          <Upload className="mx-auto h-8 w-8 text-gray-400" />
          <p className="mt-2 text-sm font-medium text-gray-700">
            Drag and drop your ID {side} here
          </p>
          <p className="text-xs text-gray-500">or</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="mt-2"
          >
            Select File
          </Button>
          <p className="mt-2 text-xs text-gray-500">
            JPEG, PNG or WebP • Max 5MB
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleChange}
        className="hidden"
        disabled={disabled}
      />
    </div>
  )
}
