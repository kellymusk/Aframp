'use client'

import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Receipt,
  RefreshCcw,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  formatStroops,
  mockTransactions,
  type Transaction,
} from '@/lib/fixtures/transactions'

type SortField = 'date' | 'type' | 'asset' | 'amount' | 'status'
type SortDirection = 'asc' | 'desc'
type QuickFilter = 'all' | 'onramp' | 'offramp' | 'billpay' | 'failed'

const PAGE_SIZE = 5

const typeConfig: Record<
  Transaction['type'],
  { label: string; icon: typeof ArrowDown; iconClassName: string }
> = {
  onramp: {
    label: 'Onramp',
    icon: ArrowDown,
    iconClassName: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30',
  },
  offramp: {
    label: 'Offramp',
    icon: ArrowUp,
    iconClassName: 'text-amber-600 bg-amber-500/10 border-amber-500/30',
  },
  billpay: {
    label: 'Bill Pay',
    icon: Receipt,
    iconClassName: 'text-violet-600 bg-violet-500/10 border-violet-500/30',
  },
}

const statusConfig: Record<Transaction['status'], { label: string; className: string }> = {
  completed: {
    label: 'Completed',
    className:
      'bg-emerald-500/12 text-emerald-700 border-emerald-500/35 dark:text-emerald-400 dark:border-emerald-500/45',
  },
  pending: {
    label: 'Pending',
    className:
      'bg-amber-500/12 text-amber-700 border-amber-500/35 dark:text-amber-400 dark:border-amber-500/45',
  },
  failed: {
    label: 'Failed',
    className:
      'bg-rose-500/12 text-rose-700 border-rose-500/35 dark:text-rose-400 dark:border-rose-500/45',
  },
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
  onSortChange: (field: SortField) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSortChange(field)}
      className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
    >
      <span>{label}</span>
      <ArrowUpDown
        className={cn(
          'h-3.5 w-3.5',
          sortField === field ? 'text-foreground' : 'text-muted-foreground/70'
        )}
      />
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
  onPageChange: (page: number) => void
}) {
  const start = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const end = Math.min(currentPage * PAGE_SIZE, totalCount)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
      <p className="text-sm text-muted-foreground">
        Showing {start}-{end} of {totalCount}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="h-9 px-3"
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </Button>
        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }).map((_, index) => {
            const pageNumber = index + 1
            const isActive = pageNumber === currentPage
            return (
              <button
                key={pageNumber}
                type="button"
                onClick={() => onPageChange(pageNumber)}
                className={cn(
                  'h-9 min-w-9 rounded-md px-3 text-sm font-semibold transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {pageNumber}
              </button>
            )
          })}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="h-9 px-3"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function TransactionHistory() {
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [page, setPage] = useState(1)
  const [activeSwipeId, setActiveSwipeId] = useState<string | null>(null)

  const touchStartX = useRef<number>(0)

  const quickFilters: Array<{ key: QuickFilter; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'onramp', label: 'Onramp' },
    { key: 'offramp', label: 'Offramp' },
    { key: 'billpay', label: 'Bill Pay' },
    { key: 'failed', label: 'Failed' },
  ]

  const filteredTransactions = useMemo(() => {
    if (quickFilter === 'all') return mockTransactions
    if (quickFilter === 'failed') return mockTransactions.filter((tx) => tx.status === 'failed')
    return mockTransactions.filter((tx) => tx.type === quickFilter)
  }, [quickFilter])

  const sortedTransactions = useMemo(() => {
    const valueByStatus: Record<Transaction['status'], number> = {
      completed: 3,
      pending: 2,
      failed: 1,
    }

    return [...filteredTransactions].sort((a, b) => {
      let aValue: string | number | bigint = 0
      let bValue: string | number | bigint = 0

      switch (sortField) {
        case 'date':
          aValue = new Date(a.date).getTime()
          bValue = new Date(b.date).getTime()
          break
        case 'type':
          aValue = typeConfig[a.type].label
          bValue = typeConfig[b.type].label
          break
        case 'asset':
          aValue = a.asset
          bValue = b.asset
          break
        case 'amount':
          aValue = a.amountStroops
          bValue = b.amountStroops
          break
        case 'status':
          aValue = valueByStatus[a.status]
          bValue = valueByStatus[b.status]
          break
      }

      const result =
        typeof aValue === 'string' && typeof bValue === 'string'
          ? aValue.localeCompare(bValue)
          : typeof aValue === 'bigint' && typeof bValue === 'bigint'
            ? aValue < bValue
              ? -1
              : aValue > bValue
                ? 1
                : 0
            : Number(aValue) - Number(bValue)

      return sortDirection === 'asc' ? result : -result
    })
  }, [filteredTransactions, sortField, sortDirection])

  const totalPages = Math.max(1, Math.ceil(sortedTransactions.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return sortedTransactions.slice(start, start + PAGE_SIZE)
  }, [currentPage, sortedTransactions])

  const formatDate = (value: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(value))
  }

  const onSortChange = (field: SortField) => {
    setPage(1)
    if (sortField === field) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortField(field)
    setSortDirection('desc')
  }

  const onFilterChange = (filter: QuickFilter) => {
    setQuickFilter(filter)
    setPage(1)
  }

  const onTouchStart = (xPosition: number) => {
    touchStartX.current = xPosition
  }

  const onTouchEnd = (xPosition: number, txId: string) => {
    const swipeDistance = touchStartX.current - xPosition
    if (swipeDistance > 40) {
      setActiveSwipeId(txId)
      return
    }
    if (swipeDistance < -40) setActiveSwipeId(null)
  }

  const renderStatusIcon = (status: Transaction['status']) => {
    if (status === 'completed') return <CheckCircle2 className="h-4 w-4" />
    if (status === 'pending') return <Clock className="h-4 w-4" />
    return <XCircle className="h-4 w-4" />
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl p-6 border border-border shadow-sm"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Transaction History</h3>
          <p className="text-sm text-muted-foreground">
            Track all onramp, offramp, and bill payments
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {quickFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => onFilterChange(filter.key)}
              className={cn(
                'h-8 rounded-full border px-3 text-sm font-medium transition-colors',
                quickFilter === filter.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[820px]">
          <thead>
            <tr className="border-b border-border">
              <th className="py-3 text-left">
                <SortHeader
                  label="Date"
                  field="date"
                  sortField={sortField}
                  onSortChange={onSortChange}
                />
              </th>
              <th className="py-3 text-left">
                <SortHeader
                  label="Type / ID"
                  field="type"
                  sortField={sortField}
                  onSortChange={onSortChange}
                />
              </th>
              <th className="py-3 text-left">
                <SortHeader
                  label="Asset"
                  field="asset"
                  sortField={sortField}
                  onSortChange={onSortChange}
                />
              </th>
              <th className="py-3 text-left">
                <SortHeader
                  label="Amount"
                  field="amount"
                  sortField={sortField}
                  onSortChange={onSortChange}
                />
              </th>
              <th className="py-3 text-left">
                <SortHeader
                  label="Status"
                  field="status"
                  sortField={sortField}
                  onSortChange={onSortChange}
                />
              </th>
              <th className="py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedTransactions.map((tx, index) => {
              const Icon = typeConfig[tx.type].icon
              return (
                <motion.tr
                  key={tx.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-border/70 transition-colors hover:bg-muted/30"
                >
                  <td className="py-4 text-sm text-foreground">{formatDate(tx.date)}</td>
                  <td className="py-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'h-9 w-9 rounded-lg border flex items-center justify-center',
                          typeConfig[tx.type].iconClassName
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">
                          {typeConfig[tx.type].label}
                        </div>
                        <div className="text-xs text-muted-foreground">{tx.id}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {tx.counterparty}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 font-medium text-foreground">{tx.asset}</td>
                  <td className="py-4 text-base font-bold text-foreground">
                    NGN {formatStroops(tx.amountStroops)}
                  </td>
                  <td className="py-4">
                    <Badge
                      variant="outline"
                      className={cn(
                        'w-fit rounded-full border px-3 py-1.5 text-sm font-semibold flex items-center gap-1.5',
                        statusConfig[tx.status].className
                      )}
                    >
                      {renderStatusIcon(tx.status)}
                      {statusConfig[tx.status].label}
                    </Badge>
                  </td>
                  <td className="py-4">
                    <Button variant="ghost" size="sm" className="h-9">
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {paginatedTransactions.map((tx, index) => {
          const Icon = typeConfig[tx.type].icon
          const isSwipeActive = activeSwipeId === tx.id
          return (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative overflow-hidden rounded-xl border border-border bg-card"
            >
              <div className="absolute inset-y-0 right-0 flex items-center gap-2 pr-2">
                <Button size="sm" variant="outline" className="h-9 px-3">
                  <Eye className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" className="h-9 px-3">
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              </div>
              <motion.div
                animate={{ x: isSwipeActive ? -88 : 0 }}
                transition={{ duration: 0.2 }}
                onTouchStart={(event: React.TouchEvent<HTMLDivElement>) => onTouchStart(event.changedTouches[0].clientX)}
                onTouchEnd={(event: React.TouchEvent<HTMLDivElement>) => onTouchEnd(event.changedTouches[0].clientX, tx.id)}
                className="relative z-10 bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'h-9 w-9 rounded-lg border flex items-center justify-center shrink-0',
                        typeConfig[tx.type].iconClassName
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{typeConfig[tx.type].label}</p>
                      <p className="text-xs text-muted-foreground">{tx.id}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{tx.counterparty}</p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-semibold flex items-center gap-1.5',
                      statusConfig[tx.status].className
                    )}
                  >
                    {renderStatusIcon(tx.status)}
                    {statusConfig[tx.status].label}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{formatDate(tx.date)}</p>
                  <p className="text-base font-bold text-foreground">
                    NGN {formatStroops(tx.amountStroops)}
                  </p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Swipe left for actions</p>
              </motion.div>
            </motion.div>
          )
        })}
      </div>

      <div className="mt-4">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={sortedTransactions.length}
          onPageChange={setPage}
        />
      </div>
    </motion.div>
  )
}
