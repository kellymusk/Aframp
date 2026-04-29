'use client'

import { useState, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Menu, X, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { ConnectButton } from '@/components/Wallet'

const navItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Transactions', href: '/dashboard/transactions' },
  { label: 'Wallets', href: '/dashboard/wallets' },
  { label: 'Settings', href: '/dashboard/settings' },
]

export function Navbar() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-4xl"
    >
      <nav
        ref={navRef}
        className="relative flex items-center justify-between px-4 py-3 rounded-full bg-card/80 backdrop-blur-md border border-border shadow-sm"
      >
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-base">A</span>
          </div>
          <span className="font-semibold text-foreground hidden sm:block text-lg">Aframp</span>
        </Link>

        {/* Desktop Nav Items */}
        <div className="hidden md:flex items-center gap-1 relative">
          {navItems.map((item, index) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`relative px-4 py-2 text-sm rounded-full transition-colors font-medium
                  ${isActive ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}
                `}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {hoveredIndex === index && !isActive && (
                  <motion.div
                    layoutId="navbar-hover"
                    className="absolute inset-0 bg-muted rounded-full"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{item.label}</span>
              </Link>
            )
          })}
        </div>

        {/* Right side: Theme Toggle and Connect Button */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <ConnectButton />

          {/* Mobile Menu Button - inside the right group */}
          <button
            className="p-2 md:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute top-full left-0 right-0 mt-2 p-4 rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-lg"
        >
          <div className="flex flex-col gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`px-4 py-3 text-sm rounded-lg transition-colors font-medium flex items-center
                    ${isActive ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}
                  `}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              )
            })}
            <Link
              href="/onramp"
              className="px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors flex items-center justify-between"
              onClick={() => setMobileMenuOpen(false)}
            >
              Buy Crypto (Onramp)
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/offramp"
              className="px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors flex items-center justify-between"
              onClick={() => setMobileMenuOpen(false)}
            >
              Sell Crypto (Offramp)
              <ArrowRight className="w-4 h-4" />
            </Link>
            <hr className="border-border my-2" />
            <Button
              variant="ghost"
              className="justify-start text-muted-foreground hover:text-foreground"
            >
              Explore
            </Button>
            <div onClick={() => setMobileMenuOpen(false)}>
              <ConnectButton className="w-full" />
            </div>
          </div>
        </motion.div>
      )}
    </motion.header>
  )
}
