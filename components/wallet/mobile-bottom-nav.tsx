'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowDownToLine, Home, Receipt, Wallet as WalletIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

const LINKS = [
  { label: 'Home', icon: Home, href: '/home' },
  { label: 'Payments', icon: Receipt, href: '/transactions' },
  { label: 'Wallet', icon: WalletIcon, href: '/wallet' },
  { label: 'Cash out', icon: ArrowDownToLine, href: '/withdraw' },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Primary"
      className="bg-rail border-hairline fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t md:hidden"
    >
      {LINKS.map(({ label, icon: Icon, href }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] transition-colors',
              active ? 'text-white' : 'text-dim hover:text-bright'
            )}
          >
            <Icon className="size-5" strokeWidth={1.75} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
