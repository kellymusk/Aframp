import Link from 'next/link'
import { ArrowDownToLine, Banknote, Receipt, Wallet } from 'lucide-react'

const actions = [
  { label: 'Charge', icon: Banknote, tint: '#166534', href: '/charge' },
  { label: 'Payments', icon: Receipt, tint: '#1e40af', href: '/transactions' },
  { label: 'Cash out', icon: ArrowDownToLine, tint: '#10b981', href: '/withdraw' },
  { label: 'Wallet', icon: Wallet, tint: '#b1cd00', href: '/wallet' },
]

export function QuickActions() {
  return (
    <div className="grid grid-cols-4 gap-2 sm:flex sm:flex-wrap sm:gap-5">
      {actions.map(({ label, icon: Icon, tint, href }) => (
        <Link
          key={label}
          href={href}
          className="group flex flex-col items-center gap-1.5 rounded-lg focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
        >
          <span
            style={{ backgroundColor: tint }}
            className="flex size-11 items-center justify-center rounded-full text-white transition-transform group-hover:scale-105"
          >
            <Icon className="size-5" strokeWidth={2.25} aria-hidden />
          </span>
          <span className="text-dim group-hover:text-bright text-xs">{label}</span>
        </Link>
      ))}
    </div>
  )
}
