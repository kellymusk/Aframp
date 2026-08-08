'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { LayoutDashboard, ArrowDownUp, ShieldCheck, Users, ChevronRight, LogOut } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/orders', label: 'Orders', icon: ArrowDownUp, exact: false },
  { href: '/admin/kyc', label: 'KYC Review', icon: ShieldCheck, exact: false },
  { href: '/admin/users', label: 'Users', icon: Users, exact: false },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen bg-background">
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="hidden md:flex w-60 flex-col border-r border-border bg-card/50 backdrop-blur-md fixed inset-y-0 left-0 z-30"
      >
        <div className="flex h-16 items-center gap-3 px-6 border-b border-border shrink-0">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <span className="text-primary-foreground font-bold text-sm">A</span>
            </div>
            <span className="font-semibold text-foreground">Aframp</span>
          </Link>
          <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">Admin</span>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors group',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <item.icon className={cn('h-4 w-4 shrink-0 transition-colors', isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
                <span>{item.label}</span>
                {isActive && <ChevronRight className="ml-auto h-3.5 w-3.5 text-primary" />}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 shrink-0">
          <Separator className="mb-3" />
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Exit Admin
          </Link>
        </div>
      </motion.aside>

      <header className="md:hidden fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 backdrop-blur-md px-4">
        <Link href="/" className="flex items-center gap-1.5 shrink-0">
          <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xs">A</span>
          </div>
          <span className="font-semibold text-foreground text-sm">Admin</span>
        </Link>
        <div className="flex items-center gap-1 ml-auto overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap',
                  isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <item.icon className="h-3.5 w-3.5 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </header>

      <main className="flex-1 md:ml-60 pt-14 md:pt-0">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  )
}
