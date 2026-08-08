'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Menu, ArrowRight, LayoutDashboard, ArrowDownUp, Wallet, Receipt } from 'lucide-react'
import Link from 'next/link'
import { Drawer } from 'vaul'
import { ThemeToggle } from '@/components/theme-toggle'
import { ConnectButton } from '@/components/Wallet'
import { NotificationDropdown } from '@/components/notifications/notification-dropdown'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Dashboard', href: '/dashboard' },
  // /dashboard/transactions and /dashboard/wallets do not exist; route to the
  // dashboard with a tab query param so navigation resolves correctly (#273).
  { label: 'Transactions', href: '/dashboard?tab=transactions' },
  { label: 'Wallets', href: '/dashboard?tab=wallets' },
  // /dashboard/settings does not exist; the real settings page is at /settings.
  { label: 'Settings', href: '/settings' },
]

const bottomNavItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Onramp', href: '/onramp', icon: ArrowDownUp },
  { label: 'Bills', href: '/bills', icon: Receipt },
  // Bottom nav Wallet tab also pointed to non-existent /dashboard/wallets (#273).
  { label: 'Wallet', href: '/dashboard?tab=wallets', icon: Wallet },
]

export function Navbar() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const pathname = usePathname()

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href))

  return (
    <>
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-4xl"
      >
        <nav className="relative flex items-center justify-between px-4 py-3 rounded-full bg-card/80 backdrop-blur-md border border-border shadow-sm">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-base">A</span>
            </div>
            <span className="font-semibold text-foreground hidden sm:block text-lg">Aframp</span>
          </Link>

          {/* Desktop Nav Items */}
          <div className="hidden md:flex items-center gap-1 relative">
            {navItems.map((item, index) => (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  'relative px-4 py-2 text-sm rounded-full transition-colors font-medium',
                  isActive(item.href)
                    ? 'bg-primary text-white'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {hoveredIndex === index && !isActive(item.href) && (
                  <motion.div
                    layoutId="navbar-hover"
                    className="absolute inset-0 bg-muted rounded-full"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{item.label}</span>
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <NotificationDropdown />
            <ConnectButton />

            {/* Hamburger — mobile only */}
            <Drawer.Root open={drawerOpen} onOpenChange={setDrawerOpen} direction="left">
              <Drawer.Trigger asChild>
                <button
                  className="p-2 md:hidden text-muted-foreground hover:text-foreground"
                  aria-label="Open menu"
                >
                  <Menu size={20} />
                </button>
              </Drawer.Trigger>

              <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
                <Drawer.Content className="fixed left-0 top-0 bottom-0 z-50 flex w-72 flex-col bg-card border-r border-border outline-none">
                  {/* Drag handle */}
                  <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-muted" />

                  <div className="flex flex-col gap-1 p-6 flex-1 overflow-y-auto">
                    <Link href="/" className="flex items-center gap-2 mb-6" onClick={() => setDrawerOpen(false)}>
                      <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                        <span className="text-primary-foreground font-bold text-base">A</span>
                      </div>
                      <span className="font-semibold text-foreground text-lg">Aframp</span>
                    </Link>

                    {navItems.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        className={cn(
                          'px-4 py-3 text-sm rounded-lg transition-colors font-medium',
                          isActive(item.href)
                            ? 'bg-primary text-white'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        )}
                        onClick={() => setDrawerOpen(false)}
                      >
                        {item.label}
                      </Link>
                    ))}

                    <hr className="border-border my-3" />

                    <Link
                      href="/onramp"
                      className="px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors flex items-center justify-between"
                      onClick={() => setDrawerOpen(false)}
                    >
                      Buy Crypto (Onramp) <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                      href="/offramp"
                      className="px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors flex items-center justify-between"
                      onClick={() => setDrawerOpen(false)}
                    >
                      Sell Crypto (Offramp) <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>

                  <div className="p-6 border-t border-border" onClick={() => setDrawerOpen(false)}>
                    <ConnectButton className="w-full" />
                  </div>
                </Drawer.Content>
              </Drawer.Portal>
            </Drawer.Root>
          </div>
        </nav>
      </motion.header>

      {/* Bottom Nav — mobile only */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-border bg-card/95 backdrop-blur-md">
        <div className="flex items-center justify-around px-2 py-2">
          {bottomNavItems.map(({ label, href, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link
                key={label}
                href={href}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
