'use client'

import { useEffect, useState, type ComponentType, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'

import { AframpMark } from '@/components/brand/aframp-mark'
import { cn } from '@/lib/utils'

export interface NavLink {
  label: string
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  href: string
  /** Only highlight on an exact match (e.g. an index route like /admin). */
  exact?: boolean
}

interface NavShellProps {
  subtitle: string
  links: NavLink[]
  /** Rendered next to the wordmark, e.g. a network status dot. */
  badge?: ReactNode
  footer: ReactNode
}

export function isActive(pathname: string, link: NavLink) {
  if (link.exact) return pathname === link.href
  return pathname === link.href || pathname.startsWith(`${link.href}/`)
}

/**
 * The app's navigation: a fixed sidebar from `lg` up, and below that a top
 * bar whose menu button opens the same links in a slide-over drawer.
 */
export function NavShell({ subtitle, links, badge, footer }: NavShellProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Close the drawer after navigating.
  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const current = links.find((link) => isActive(pathname, link))

  const content = (
    <>
      <div className="flex items-center gap-2.5 px-1 pt-1">
        <AframpMark className="size-8" />
        <span className="text-xl font-bold tracking-tight text-white">Aframp</span>
        {badge}
      </div>
      <p className="text-dim mt-1.5 px-1 text-xs">{subtitle}</p>

      <nav className="mt-8 space-y-1">
        {links.map((link) => {
          const active = isActive(pathname, link)
          const Icon = link.icon
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                active
                  ? 'bg-nav-active font-bold text-white'
                  : 'text-dim hover:bg-raised hover:text-bright'
              )}
            >
              <Icon className="size-4 shrink-0" strokeWidth={1.75} />
              {link.label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto space-y-3 pt-6">{footer}</div>
    </>
  )

  return (
    <>
      <header className="bg-rail border-hairline sticky top-0 z-40 flex h-14 items-center gap-3 border-b px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="hover:bg-raised -ml-2 rounded-lg p-2 text-white"
        >
          <Menu className="size-5" />
        </button>
        <AframpMark className="size-7" />
        <span className="truncate text-sm font-bold text-white">{current?.label ?? 'Aframp'}</span>
        {badge && <span className="ml-auto">{badge}</span>}
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <aside className="bg-rail border-hairline absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col overflow-y-auto border-r p-4 pb-6">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="text-dim hover:bg-raised absolute top-3 right-3 rounded-lg p-2"
            >
              <X className="size-5" />
            </button>
            {content}
          </aside>
        </div>
      )}

      <aside className="bg-rail border-hairline sticky top-0 hidden h-dvh w-[260px] shrink-0 flex-col overflow-y-auto border-r p-4 pb-6 lg:flex">
        {!open && content}
      </aside>
    </>
  )
}
