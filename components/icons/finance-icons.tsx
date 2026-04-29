import { Banknote, CreditCard, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CryptoAsset, PaymentMethod } from '@/types/onramp'

export function CountryFlag({ code, className }: { code: string; className?: string }) {
  const baseClass = cn('h-4 w-4 overflow-hidden rounded-[2px] border border-border/60', className)

  if (code === 'NG') {
    return (
      <svg viewBox="0 0 24 24" className={baseClass} aria-hidden="true">
        <rect width="8" height="24" x="0" y="0" fill="#128A49" />
        <rect width="8" height="24" x="8" y="0" fill="#FFFFFF" />
        <rect width="8" height="24" x="16" y="0" fill="#128A49" />
        <rect width="0.75" height="24" x="8" y="0" fill="#D1D5DB" />
        <rect width="0.75" height="24" x="15.25" y="0" fill="#D1D5DB" />
      </svg>
    )
  }

  if (code === 'KE') {
    return (
      <svg viewBox="0 0 24 24" className={baseClass} aria-hidden="true">
        <rect width="24" height="8" x="0" y="0" fill="#111827" />
        <rect width="24" height="1" x="0" y="8" fill="#FFFFFF" />
        <rect width="24" height="6" x="0" y="9" fill="#B91C1C" />
        <rect width="24" height="1" x="0" y="15" fill="#FFFFFF" />
        <rect width="24" height="8" x="0" y="16" fill="#15803D" />
      </svg>
    )
  }

  if (code === 'GH') {
    return (
      <svg viewBox="0 0 24 24" className={baseClass} aria-hidden="true">
        <rect width="24" height="8" x="0" y="0" fill="#DC2626" />
        <rect width="24" height="8" x="0" y="8" fill="#EAB308" />
        <rect width="24" height="8" x="0" y="16" fill="#15803D" />
        <polygon points="12,9 13.1,11.2 15.6,11.5 13.8,13.3 14.2,15.8 12,14.6 9.8,15.8 10.2,13.3 8.4,11.5 10.9,11.2" fill="#111827" />
      </svg>
    )
  }

  if (code === 'ZA') {
    return (
      <svg viewBox="0 0 24 24" className={baseClass} aria-hidden="true">
        <rect width="24" height="8" x="0" y="0" fill="#DC2626" />
        <rect width="24" height="8" x="0" y="8" fill="#FFFFFF" />
        <rect width="24" height="8" x="0" y="16" fill="#1D4ED8" />
        <polygon points="0,0 11,12 0,24" fill="#111827" />
        <polygon points="0,2 9,12 0,22 0,18 5,12 0,6" fill="#EAB308" />
        <polygon points="0,4 7,12 0,20 0,16 4,12 0,8" fill="#15803D" />
      </svg>
    )
  }

  if (code === 'UG') {
    return (
      <svg viewBox="0 0 24 24" className={baseClass} aria-hidden="true">
        <rect width="24" height="4" x="0" y="0" fill="#111827" />
        <rect width="24" height="4" x="0" y="4" fill="#EAB308" />
        <rect width="24" height="4" x="0" y="8" fill="#DC2626" />
        <rect width="24" height="4" x="0" y="12" fill="#111827" />
        <rect width="24" height="4" x="0" y="16" fill="#EAB308" />
        <rect width="24" height="4" x="0" y="20" fill="#DC2626" />
        <circle cx="12" cy="12" r="3.25" fill="#FFFFFF" />
        <circle cx="12" cy="12" r="1.25" fill="#111827" />
      </svg>
    )
  }

  return (
    <span className={cn('inline-flex items-center justify-center text-[10px] font-semibold', baseClass)}>
      {code}
    </span>
  )
}

export function CryptoAssetBadge({
  asset,
  className,
}: {
  asset: CryptoAsset | string
  className?: string
}) {
  const token = asset.toUpperCase()
  const label =
    token === 'CNGN' ? '₦' : token === 'CKES' ? 'K' : token === 'CGHS' ? '₵' : token.slice(0, 2)
  const tone =
    token === 'USDC'
      ? 'bg-blue-500/15 text-blue-500 border-blue-500/30'
      : token === 'XLM'
        ? 'bg-cyan-500/15 text-cyan-500 border-cyan-500/30'
        : 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'

  return (
    <span
      className={cn(
        'inline-flex h-6 w-6 items-center justify-center rounded-md border text-[10px] font-bold',
        tone,
        className
      )}
      aria-hidden="true"
    >
      {label}
    </span>
  )
}

export function PaymentMethodGlyph({
  method,
  className,
}: {
  method: PaymentMethod
  className?: string
}) {
  if (method === 'bank_transfer') return <Banknote className={className} />
  if (method === 'card') return <CreditCard className={className} />
  return <Smartphone className={className} />
}
