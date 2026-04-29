import type { LucideIcon } from 'lucide-react'
import {
  BadgeDollarSign,
  Droplets,
  GraduationCap,
  Lightbulb,
  Radio,
  Shield,
  Smartphone,
  Tv,
  Wifi,
  Zap,
} from 'lucide-react'

const categoryIcons: Record<string, LucideIcon> = {
  electricity: Zap,
  internet: Wifi,
  mobile: Smartphone,
  water: Droplets,
  education: GraduationCap,
  insurance: Shield,
}

const billerIcons: Record<string, LucideIcon> = {
  dstv: Tv,
  gotv: Radio,
  spectranet: Wifi,
  aedc: Lightbulb,
  'ikeja-electric': Zap,
  'mtn-data': Smartphone,
  'safaricom-airtime': Smartphone,
}

export function CategoryIcon({ categoryId, className }: { categoryId: string; className?: string }) {
  const Icon = categoryIcons[categoryId] ?? BadgeDollarSign
  return <Icon className={className} strokeWidth={1.8} />
}

export function BillerIcon({ billerId, className }: { billerId: string; className?: string }) {
  const Icon = billerIcons[billerId] ?? BadgeDollarSign
  return <Icon className={className} strokeWidth={1.8} />
}
