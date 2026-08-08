'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowUpDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { KycStatus } from '@/types/kyc'

const PAGE_SIZE = 10

interface AdminUser {
  id: string
  walletAddress: string
  kycStatus: KycStatus
  orderCount: number
  totalVolume: number
  currency: string
  joinedAt: number
  lastActiveAt: number
}

type QuickFilter = 'all' | KycStatus
type SortField = 'joinedAt' | 'orderCount' | 'totalVolume' | 'kycStatus'
type SortDirection = 'asc' | 'desc'

const mockUsers: AdminUser[] = [
  { id: 'USR-001', walletAddress: '0x1a2b...3c4d', kycStatus: 'approved', orderCount: 12, totalVolume: 480000, currency: 'NGN', joinedAt: 1740000000000, lastActiveAt: 1748822400000 },
  { id: 'USR-002', walletAddress: '0x5e6f...7a8b', kycStatus: 'pending', orderCount: 1, totalVolume: 5000, currency: 'KES', joinedAt: 1745000000000, lastActiveAt: 1748736000000 },
  { id: 'USR-003', walletAddress: '0x9c0d...1e2f', kycStatus: 'approved', orderCount: 7, totalVolume: 210000, currency: 'NGN', joinedAt: 1742000000000, lastActiveAt: 1748649600000 },
  { id: 'USR-004', walletAddress: '0x3a4b...5c6d', kycStatus: 'rejected', orderCount: 0, totalVolume: 0, currency: 'GHS', joinedAt: 1746000000000, lastActiveAt: 1748563200000 },
  { id: 'USR-005', walletAddress: '0x7e8f...9a0b', kycStatus: 'pending', orderCount: 2, totalVolume: 15000, currency: 'NGN', joinedAt: 1747000000000, lastActiveAt: 1748476800000 },
  { id: 'USR-006', walletAddress: '0x1c2d...3e4f', kycStatus: 'expired', orderCount: 3, totalVolume: 45000, currency: 'ZAR', joinedAt: 1738000000000, lastActiveAt: 1747000000000 },
  { id: 'USR-007', walletAddress: '0x5a6b...7c8d', kycStatus: 'approved', orderCount: 22, totalVolume: 1200000, currency: 'NGN', joinedAt: 1735000000000, lastActiveAt: 1748822400000 },
  { id: 'USR-008', walletAddress: '0x9e0f...1a2b', kycStatus: 'approved', orderCount: 5, totalVolume: 75000, currency: 'KES', joinedAt: 1743000000000, lastActiveAt: 1748304000000 },
  { id: 'USR-009', walletAddress: '0x3c4d...5e6f', kycStatus: 'rejected', orderCount: 0, totalVolume: 0, currency: 'UGX', joinedAt: 1747500000000, lastActiveAt: 1748217600000 },
  { id: 'USR-010', walletAddress: '0x7a8b...9c0d', kycStatus: 'pending', orderCount: 0, totalVolume: 0, currency: 'NGN', joinedAt: 1748000000000, lastActiveAt: 1748131200000 },
  { id: 'USR-011', walletAddress: '0x1e2f...3a4b', kycStatus: 'approved', orderCount: 34, totalVolume: 2800000, currency: 'NGN', joinedAt: 1730000000000, lastActiveAt: 1748822400000 },
  { id: 'USR-012', walletAddress: '0x5c6d...7e8f', kycStatus: 'expired', orderCount: 1, totalVolume: 8000, currency: 'GHS', joinedAt: 1736000000000, lastActiveAt: 1745000000000 },
]

const kycConfig: Record<KycStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  approved: { label: 'Verified', className: 'bg-emerald-500/12 text-emerald-700 border-emerald-500/35 dark:text-emerald-400', icon: CheckCircle2 },
  pending: { label: 'Pending', className: 'bg-amber-500/12 text-amber-700 border-amber-500/35 dark:text-amber-400', icon: Clock },
  rejected: { label: 'Rejected', className: 'bg-rose-500/12 text-rose-700 border-rose-500/35 dark:text-rose-400', icon: XCircle },
  expired: { label: 'Expired', className: 'bg-slate-500/12 text-slate-500 border-slate-500/35 dark:text-slate-400', icon: Clock },
}

function formatDate(ts: number) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(ts))
}

function SortHeader({
  label,
  field,
  sortField,
  onSortChange,
}: {
  label: string
  field: SortField
  sortField: SortField
  onSortChange: (f: SortField) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSortChange(field)}
      className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
    >
      <span>{label}</span>
      <ArrowUpDown className={cn('h-3.5 w-3.5', sortField === field ? 'text-foreground' : 'text-muted-foreground/70')} />
    </button>
  )
}

function Pagination({
  currentPage,
  totalPages,
  totalCount,
  onPageChange,
}: {
  currentPage: number
  totalPages: number
  totalCount: number
  onPageChange: (p: number) => void
}) {
  const start = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const end = Math.min(currentPage * PAGE_SIZE, totalCount)
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
      <p className="text-sm text-muted-foreground">Showing {start}–{end} of {totalCount}</p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="h-9 px-3">
          <ChevronLeft className="h-4 w-4" />Prev
        </Button>
        {Array.from({ length: totalPages }).map((_, i) => {
          const n = i + 1
          return (
            <button
              key={n}
              type="button"
              onClick={() => onPageChange(n)}
              className={cn('h-9 min-w-9 rounded-md px-3 text-sm font-semibold transition-colors', n === currentPage ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground')}
              aria-current={n === currentPage ? 'page' : undefined}
            >
              {n}
            </button>
          )
        })}
        <Button variant="outline" size="sm" onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="h-9 px-3">
          Next<ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export default function AdminUsersPage() {
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')
  const [sortField, setSortField] = useState<SortField>('joinedAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [page, setPage] = useState(1)

  const quickFilters: Array<{ key: QuickFilter; label: string }> = [
    { key: 'all', label: 'All Users' },
    { key: 'approved', label: 'Verified' },
    { key: 'pending', label: 'Pending KYC' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'expired', label: 'Expired' },
  ]

  const filtered = useMemo(
    () => mockUsers.filter((u) => quickFilter === 'all' || u.kycStatus === quickFilter),
    [quickFilter]
  )

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let aVal: string | number = 0
      let bVal: string | number = 0
      switch (sortField) {
        case 'joinedAt': aVal = a.joinedAt; bVal = b.joinedAt; break
        case 'orderCount': aVal = a.orderCount; bVal = b.orderCount; break
        case 'totalVolume': aVal = a.totalVolume; bVal = b.totalVolume; break
        case 'kycStatus': aVal = a.kycStatus; bVal = b.kycStatus; break
      }
      const result = typeof aVal === 'string' ? aVal.localeCompare(bVal as string) : Number(aVal) - Number(bVal)
      return sortDirection === 'asc' ? result : -result
    })
  }, [filtered, sortField, sortDirection])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated = useMemo(
    () => sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [sorted, currentPage]
  )

  const onSortChange = (field: SortField) => {
    setPage(1)
    if (sortField === field) { setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc')); return }
    setSortField(field)
    setSortDirection('desc')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Users</h1>
        <p className="text-sm text-muted-foreground mt-1">All registered platform users with KYC status and activity</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl p-6 border border-border shadow-sm"
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {quickFilters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => { setQuickFilter(f.key); setPage(1) }}
              className={cn(
                'h-8 rounded-full border px-3 text-sm font-medium transition-colors',
                quickFilter === f.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead>
              <tr className="border-b border-border">
                <th className="py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">User ID</th>
                <th className="py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Wallet</th>
                <th className="py-3 text-left"><SortHeader label="KYC" field="kycStatus" sortField={sortField} onSortChange={onSortChange} /></th>
                <th className="py-3 text-left"><SortHeader label="Orders" field="orderCount" sortField={sortField} onSortChange={onSortChange} /></th>
                <th className="py-3 text-left"><SortHeader label="Volume" field="totalVolume" sortField={sortField} onSortChange={onSortChange} /></th>
                <th className="py-3 text-left"><SortHeader label="Joined" field="joinedAt" sortField={sortField} onSortChange={onSortChange} /></th>
                <th className="py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((user, index) => {
                const KycIcon = kycConfig[user.kycStatus].icon
                return (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="border-b border-border/70 transition-colors hover:bg-muted/30"
                  >
                    <td className="py-4 font-mono text-sm text-foreground">{user.id}</td>
                    <td className="py-4 font-mono text-xs text-muted-foreground">{user.walletAddress}</td>
                    <td className="py-4">
                      <Badge
                        variant="outline"
                        className={cn('w-fit rounded-full border px-3 py-1 text-xs font-semibold flex items-center gap-1.5', kycConfig[user.kycStatus].className)}
                      >
                        <KycIcon className="h-3.5 w-3.5" />
                        {kycConfig[user.kycStatus].label}
                      </Badge>
                    </td>
                    <td className="py-4 text-sm font-semibold text-foreground">{user.orderCount}</td>
                    <td className="py-4 text-sm font-bold text-foreground">
                      {user.totalVolume > 0 ? `${user.currency} ${user.totalVolume.toLocaleString()}` : '—'}
                    </td>
                    <td className="py-4 text-sm text-muted-foreground">{formatDate(user.joinedAt)}</td>
                    <td className="py-4 text-sm text-muted-foreground">{formatDate(user.lastActiveAt)}</td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4">
          <Pagination currentPage={currentPage} totalPages={totalPages} totalCount={sorted.length} onPageChange={setPage} />
        </div>
      </motion.div>
    </div>
  )
}
