'use client'

import { useRouter } from 'next/navigation'
import {
  ArrowDownToLine,
  ArrowUpToLine,
  Banknote,
  Home,
  LogOut,
  Receipt,
  Settings,
  ShieldCheck,
  Users,
  Wallet as WalletIcon,
} from 'lucide-react'

import { useEffect } from 'react'
import { NavShell, type NavLink } from '@/components/nav/nav-shell'
import { useSession } from '@/components/session-provider'
import { useStellarStatus } from '@/hooks/use-stellar-status'
import { cn } from '@/lib/utils'

const LINKS: NavLink[] = [
  { label: 'Home', icon: Home, href: '/home' },
  { label: 'Charge', icon: Banknote, href: '/charge' },
  { label: 'Send money', icon: ArrowUpToLine, href: '/send' },
  { label: 'Contacts', icon: Users, href: '/contacts' },
  { label: 'Payments', icon: Receipt, href: '/transactions' },
  { label: 'Cash out', icon: ArrowDownToLine, href: '/withdraw' },
  { label: 'Wallet', icon: WalletIcon, href: '/wallet' },
  { label: 'Settings', icon: Settings, href: '/settings' },
]

export function WalletSidebar() {
  const { session, me, refreshMe, signOut } = useSession()
  const router = useRouter()
  const { status: stellarStatus, description: stellarDescription } = useStellarStatus()

  // The Admin link depends on the profile; load it once if nothing has yet.
  useEffect(() => {
    if (session && !me && refreshMe) refreshMe().catch(() => {})
  }, [session, me, refreshMe])

  const statusColor =
    stellarStatus === 'operational'
      ? 'bg-green-500'
      : stellarStatus === 'degraded'
        ? 'bg-amber-500'
        : stellarStatus === 'outage'
          ? 'bg-red-500'
          : 'bg-gray-500'

  const links = me?.is_admin
    ? [...LINKS, { label: 'Admin', icon: ShieldCheck, href: '/admin' }]
    : LINKS

  return (
    <NavShell
      subtitle="Merchant dashboard"
      links={links}
      badge={
        <div
          className={cn('size-2.5 rounded-full', statusColor)}
          title={`Stellar Network: ${stellarDescription}`}
          aria-label={`Stellar Network status: ${stellarDescription}`}
        />
      }
      footer={
        <>
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
        </>
      }
    />
  )
}
