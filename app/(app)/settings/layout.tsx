'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { KeyRound, UserCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const SETTINGS_LINKS = [
  { label: 'Profile', icon: UserCircle, href: '/settings' },
  { label: 'API Keys', icon: KeyRound, href: '/settings/api-keys' },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-dim mt-1 text-sm">Manage your merchant account and integrations.</p>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="shrink-0 lg:w-48">
          <nav className="space-y-1">
            {SETTINGS_LINKS.map(({ label, icon: Icon, href }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`)
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
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
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}