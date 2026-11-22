import Link from 'next/link'
import { ArrowDownToLine, Banknote, Receipt, Wallet } from 'lucide-react'

const actions = [
  // Tints are full class strings (not interpolated) so Tailwind can detect them.
  // Each is a 15% fill with a -400 icon, which keeps >7:1 contrast on the dark panel.
  { label: 'Charge', icon: Banknote, tint: 'bg-green-500/15 text-green-400', href: '/charge' },
  { label: 'Payments', icon: Receipt, tint: 'bg-blue-500/15 text-blue-400', href: '/transactions' },
  {
    label: 'Cash out',
    icon: ArrowDownToLine,
    tint: 'bg-teal-500/15 text-teal-400',
    href: '/withdraw',
  },
  { label: 'Wallet', icon: Wallet, tint: 'bg-lime-500/15 text-lime-400', href: '/wallet' },
]

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-3">
      {actions.map(({ label, icon: Icon, tint, href }) => (
        <Link
          key={label}
          href={href}
          title={label}
          aria-label={label}
          className={`flex size-11 items-center justify-center rounded-full transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none ${tint}`}
        >
          <Icon className="size-5" strokeWidth={2.25} />
        </Link>
      ))}
    </div>
  )
}
