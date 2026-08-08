'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { KycStatus, KycSubmission } from '@/types/kyc'

const PAGE_SIZE = 10

type QuickFilter = 'all' | KycStatus

const mockSubmissions: KycSubmission[] = [
  { id: 'KYC-001', userId: 'USR-001', status: 'pending', step: 'review', documents: [], createdAt: 1748822400000, updatedAt: 1748822400000, expiresAt: 1749427200000 },
  { id: 'KYC-002', userId: 'USR-002', status: 'pending', step: 'review', documents: [], createdAt: 1748736000000, updatedAt: 1748736000000, expiresAt: 1749340800000 },
  { id: 'KYC-003', userId: 'USR-003', status: 'approved', step: 'submitted', documents: [], createdAt: 1748649600000, updatedAt: 1748736000000, expiresAt: 1780272000000 },
  { id: 'KYC-004', userId: 'USR-004', status: 'rejected', step: 'submitted', documents: [], createdAt: 1748563200000, updatedAt: 1748649600000, expiresAt: 1749168000000, verificationNotes: 'ID document expired' },
  { id: 'KYC-005', userId: 'USR-005', status: 'pending', step: 'review', documents: [], createdAt: 1748476800000, updatedAt: 1748476800000, expiresAt: 1749081600000 },
  { id: 'KYC-006', userId: 'USR-006', status: 'expired', step: 'submitted', documents: [], createdAt: 1746057600000, updatedAt: 1746144000000, expiresAt: 1747612800000 },
  { id: 'KYC-007', userId: 'USR-007', status: 'pending', step: 'review', documents: [], createdAt: 1748390400000, updatedAt: 1748390400000, expiresAt: 1748995200000 },
  { id: 'KYC-008', userId: 'USR-008', status: 'approved', step: 'submitted', documents: [], createdAt: 1748304000000, updatedAt: 1748390400000, expiresAt: 1779926400000 },
  { id: 'KYC-009', userId: 'USR-009', status: 'rejected', step: 'submitted', documents: [], createdAt: 1748217600000, updatedAt: 1748304000000, expiresAt: 1748822400000, verificationNotes: 'Selfie did not match ID photo' },
  { id: 'KYC-010', userId: 'USR-010', status: 'pending', step: 'review', documents: [], createdAt: 1748131200000, updatedAt: 1748131200000, expiresAt: 1748736000000 },
  { id: 'KYC-011', userId: 'USR-011', status: 'approved', step: 'submitted', documents: [], createdAt: 1748044800000, updatedAt: 1748131200000, expiresAt: 1779667200000 },
  { id: 'KYC-012', userId: 'USR-012', status: 'expired', step: 'submitted', documents: [], createdAt: 1745539200000, updatedAt: 1745625600000, expiresAt: 1747094400000 },
]

const statusConfig: Record<KycStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  pending: { label: 'Pending', className: 'bg-amber-500/12 text-amber-700 border-amber-500/35 dark:text-amber-400', icon: Clock },
  approved: { label: 'Approved', className: 'bg-emerald-500/12 text-emerald-700 border-emerald-500/35 dark:text-emerald-400', icon: CheckCircle2 },
  rejected: { label: 'Rejected', className: 'bg-rose-500/12 text-rose-700 border-rose-500/35 dark:text-rose-400', icon: XCircle },
  expired: { label: 'Expired', className: 'bg-slate-500/12 text-slate-500 border-slate-500/35 dark:text-slate-400', icon: Clock },
}

function formatDate(ts: number) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(ts))
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

export default function AdminKycPage() {
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('pending')
  const [page, setPage] = useState(1)
  const [actions, setActions] = useState<Record<string, KycStatus>>({})

  const quickFilters: Array<{ key: QuickFilter; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending Review' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'expired', label: 'Expired' },
  ]

  const filtered = useMemo(() => {
    return mockSubmissions.filter((s) => {
      const effectiveStatus = actions[s.id] ?? s.status
      if (quickFilter === 'all') return true
      return effectiveStatus === quickFilter
    })
  }, [quickFilter, actions])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage]
  )

  const setAction = (id: string, status: KycStatus) => {
    setActions((prev) => ({ ...prev, [id]: status }))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">KYC Review</h1>
        <p className="text-sm text-muted-foreground mt-1">Review and approve or reject KYC submissions</p>
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
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-border">
                <th className="py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Submission</th>
                <th className="py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">User</th>
                <th className="py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                <th className="py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Submitted</th>
                <th className="py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</th>
                <th className="py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((submission, index) => {
                const effectiveStatus = actions[submission.id] ?? submission.status
                const StatusIcon = statusConfig[effectiveStatus].icon
                const isPending = effectiveStatus === 'pending'
                return (
                  <motion.tr
                    key={submission.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="border-b border-border/70 transition-colors hover:bg-muted/30"
                  >
                    <td className="py-4 font-mono text-sm text-foreground">{submission.id}</td>
                    <td className="py-4 text-sm text-muted-foreground">{submission.userId}</td>
                    <td className="py-4">
                      <Badge
                        variant="outline"
                        className={cn('w-fit rounded-full border px-3 py-1 text-xs font-semibold flex items-center gap-1.5', statusConfig[effectiveStatus].className)}
                      >
                        <StatusIcon className="h-3.5 w-3.5" />
                        {statusConfig[effectiveStatus].label}
                      </Badge>
                    </td>
                    <td className="py-4 text-sm text-muted-foreground">{formatDate(submission.createdAt)}</td>
                    <td className="py-4 text-xs text-muted-foreground max-w-[180px] truncate">
                      {submission.verificationNotes ?? '—'}
                    </td>
                    <td className="py-4">
                      {isPending ? (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => setAction(submission.id, 'approved')}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-3 text-xs border-rose-500/40 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
                            onClick={() => setAction(submission.id, 'rejected')}
                          >
                            <XCircle className="h-3.5 w-3.5" />Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4">
          <Pagination currentPage={currentPage} totalPages={totalPages} totalCount={filtered.length} onPageChange={setPage} />
        </div>
      </motion.div>
    </div>
  )
}
