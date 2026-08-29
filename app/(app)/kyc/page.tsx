'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api, ApiError } from '@/lib/api'
import { useAuthenticatedSession } from '@/components/session-provider'
import type { FiatCurrency } from '@/types/onramp'
import type { KycDocumentType } from '@/types/kyc'

/** NGN residents verify with BVN or NIN; everywhere else uses passport. */
const REGIONS: { fiatCurrency: FiatCurrency; label: string }[] = [
  { fiatCurrency: 'NGN', label: 'Nigeria' },
  { fiatCurrency: 'KES', label: 'Kenya' },
  { fiatCurrency: 'GHS', label: 'Ghana' },
  { fiatCurrency: 'ZAR', label: 'South Africa' },
  { fiatCurrency: 'UGX', label: 'Uganda' },
]

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '')
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}

export default function KycPage() {
  const { token } = useAuthenticatedSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('returnTo') ?? '/home'

  const [fiatCurrency, setFiatCurrency] = useState<FiatCurrency>('NGN')
  const [documentType, setDocumentType] = useState<KycDocumentType>('bvn')
  const [documentNumber, setDocumentNumber] = useState('')
  const [idFront, setIdFront] = useState<File | null>(null)
  const [idBack, setIdBack] = useState<File | null>(null)
  const [selfie, setSelfie] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const isNigeria = fiatCurrency === 'NGN'
  const documentLabel =
    documentType === 'bvn' ? 'BVN' : documentType === 'nin' ? 'NIN' : 'Passport number'

  function onRegionChange(next: FiatCurrency) {
    setFiatCurrency(next)
    setDocumentType(next === 'NGN' ? 'bvn' : 'passport')
  }

  function validate(): string | null {
    if (!documentNumber.trim()) return `Enter your ${documentLabel}.`
    if (isNigeria && documentType === 'bvn' && documentNumber.trim().length !== 11) {
      return 'BVN must be 11 digits.'
    }
    if (isNigeria && documentType === 'nin' && documentNumber.trim().length !== 11) {
      return 'NIN must be 11 digits.'
    }
    if (!idFront || !idBack || !selfie) return 'Upload both sides of your ID and a selfie.'
    return null
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const problem = validate()
    if (problem) {
      setError(problem)
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const [idFrontB64, idBackB64, selfieB64] = await Promise.all([
        fileToBase64(idFront!),
        fileToBase64(idBack!),
        fileToBase64(selfie!),
      ])
      await api.initiateKyc(token, {
        idFront: idFrontB64,
        idBack: idBackB64,
        selfie: selfieB64,
        documentType,
        documentNumber: documentNumber.trim(),
      })
      setSubmitted(true)
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : cause instanceof Error
            ? cause.message
            : 'Could not submit your verification'
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
        <h2 className="text-xl font-bold">Verification submitted</h2>
        <p className="text-dim text-sm">
          We&apos;re reviewing your documents. This usually takes a few minutes.
        </p>
        <Button onClick={() => router.push(returnTo)}>Back</Button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">Verify your identity</h1>
        <p className="text-dim mt-1 text-sm">
          Required once before your first purchase. Approved verifications are remembered for
          future transactions.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form className="flex flex-col gap-4" onSubmit={submit}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="region">Region</Label>
          <Select value={fiatCurrency} onValueChange={(v) => onRegionChange(v as FiatCurrency)}>
            <SelectTrigger id="region" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REGIONS.map((region) => (
                <SelectItem key={region.fiatCurrency} value={region.fiatCurrency}>
                  {region.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isNigeria && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="documentType">Document type</Label>
            <Select
              value={documentType}
              onValueChange={(v) => setDocumentType(v as KycDocumentType)}
            >
              <SelectTrigger id="documentType" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bvn">BVN</SelectItem>
                <SelectItem value="nin">NIN</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="documentNumber">{documentLabel}</Label>
          <Input
            id="documentNumber"
            value={documentNumber}
            onChange={(event) => setDocumentNumber(event.target.value)}
            placeholder={documentLabel}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="idFront">ID front</Label>
          <Input
            id="idFront"
            type="file"
            accept="image/*"
            onChange={(event) => setIdFront(event.target.files?.[0] ?? null)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="idBack">ID back</Label>
          <Input
            id="idBack"
            type="file"
            accept="image/*"
            onChange={(event) => setIdBack(event.target.files?.[0] ?? null)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="selfie">Selfie</Label>
          <Input
            id="selfie"
            type="file"
            accept="image/*"
            onChange={(event) => setSelfie(event.target.files?.[0] ?? null)}
          />
        </div>

        <Button type="submit" size="lg" className="h-12" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit for verification'}
        </Button>
      </form>
    </div>
  )
}
