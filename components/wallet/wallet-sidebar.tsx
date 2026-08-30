'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  ArrowDownToLine,
  Banknote,
  Home,
  LogOut,
  Receipt,
  TrendingDown,
  Wallet as WalletIcon,
} from 'lucide-react'

import { AframpMark } from '@/components/brand/aframp-mark'
import { useSession } from '@/components/session-provider'
import { cn } from '@/lib/utils'

const LINKS = [
  { label: 'Home', icon: Home, href: '/home' },
  { label: 'Charge', icon: Banknote, href: '/charge' },
  { label: 'Payments', icon: Receipt, href: '/transactions' },
  { label: 'Cash out', icon: ArrowDownToLine, href: '/withdraw' },
  { label: 'Sell', icon: TrendingDown, href: '/offramp' },
  { label: 'Wallet', icon: WalletIcon, href: '/wallet' },
]

export function WalletSidebar() {
  const pathname = usePathname()
  const { signOut } = useSession()
  const router = useRouter()

  return (
    <aside className="bg-rail border-hairline sticky top-0 flex h-dvh w-[260px] shrink-0 flex-col border-r p-4 pb-6">
      <div className="flex items-center gap-2.5 px-1 pt-1">
        <AframpMark className="size-8" />
        <span className="text-xl font-bold tracking-tight text-white">Aframp</span>
      </div>
      <p className="text-dim mt-1.5 px-1 text-xs">Merchant dashboard</p>

      <nav className="mt-8 space-y-1">
        {LINKS.map(({ label, icon: Icon, href }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                active
                  ? 'bg-nav-active font-bold text-white'
                  : 'text-dim hover:bg-raised hover:text-bright'
              )}
            >
              <Icon className="size-4 shrink-0" strokeWidth={1.75} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto space-y-3">
        <button
          type="button"
          onClick={() => {
            signOut()
            router.replace('/login')
          }}
          className="text-dim hover:bg-raised hover:text-bright flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors"
        >
          <LogOut className="size-4 shrink-0" strokeWidth={1.75} />
          Sign out
        </button>
        <p className="text-dim px-1 text-xs">Secure. Non-custodial. Always on.</p>
      </div>
    </aside>
  )
}
