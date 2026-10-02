'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowDownToLine,
  LayoutDashboard,
  ArrowLeft,
  LogOut,
  Receipt,
  Store,
  Users,
  Wallet as WalletIcon,
} from 'lucide-react'

import { NavShell, type NavLink } from '@/components/nav/nav-shell'
import { useSession } from '@/components/session-provider'

const LINKS: NavLink[] = [
  { label: 'Overview', icon: LayoutDashboard, href: '/admin', exact: true },
  { label: 'Merchants', icon: Store, href: '/admin/merchants' },
  { label: 'Users', icon: Users, href: '/admin/users' },
  { label: 'Wallets', icon: WalletIcon, href: '/admin/wallets' },
  { label: 'Transactions', icon: Receipt, href: '/admin/transactions' },
  { label: 'Withdrawals', icon: ArrowDownToLine, href: '/admin/withdrawals' },
  { label: 'Payment requests', icon: Receipt, href: '/admin/payment-requests' },
]

export function AdminSidebar() {
  const { signOut } = useSession()
  const router = useRouter()

  return (
    <NavShell
      subtitle="Admin dashboard"
      links={LINKS}
      footer={
        <>
          <Link
            href="/home"
            className="text-dim hover:bg-raised hover:text-bright flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors"
          >
            <ArrowLeft className="size-4 shrink-0" strokeWidth={1.75} />
            Back to merchant app
          </Link>
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
        </>
      }
    />
  )
}
