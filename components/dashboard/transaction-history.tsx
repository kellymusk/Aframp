'use client'

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useVirtualizer } from '@tanstack/react-virtual'
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
import { useTransactionHistory } from '@/hooks/use-transaction-history'
import {
  mockTransactions,
  quickFilters,
  type QuickFilter,
  type SortField,
  type Transaction,
} from '@/lib/fixtures/transactions'
import { cn } from '@/lib/utils'

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
  pageSize = PAGE_SIZE,
}: {
  currentPage: number
  totalPages: number
  totalCount: number
  pageSize?: number
  onPageChange: (page: number) => void
}) {
  const size = pageSize ?? PAGE_SIZE
  const start = totalCount === 0 ? 0 : (currentPage - 1) * size + 1
  const end = Math.min(currentPage * size, totalCount)

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

interface TransactionHistoryProps {
  transactions?: Transaction[]
  pageSize?: number
  totalCount?: number
  isServerPaginated?: boolean
  onPageChange?: (page: number) => void
}

export function TransactionHistory({
  transactions = mockTransactions,
  pageSize = PAGE_SIZE,
  totalCount,
  isServerPaginated = false,
  onPageChange,
}: TransactionHistoryProps) {
  const [activeSwipeId, setActiveSwipeId] = useState<string | null>(null)
  const touchStartX = useRef(0)
  const parentRef = useRef<HTMLDivElement>(null)

  const {
    quickFilter,
    sortField,
    sortDirection,
    currentPage,
    paginatedTransactions,
    totalPages,
    sortedTransactions,
    onFilterChange,
    onSortChange,
    onPageChange: handlePageChange,
  } = useTransactionHistory({
    transactions,
    pageSize,
    serverMode: isServerPaginated,
    serverTotalCount: totalCount,
    onPageChange,
  })

  const virtualizer = useVirtualizer({
    count: paginatedTransactions.length,
    estimateSize: () => 120,
    getScrollElement: () => parentRef.current,
    overscan: 3,
    measureElement: (element) => element.getBoundingClientRect().height,
  })

  const formatAmount = (value: number) => {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  const formatDate = (value: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(value))
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

  const renderTransactionCard = (tx: Transaction, index: number) => {
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
          onTouchStart={(event: React.TouchEvent<HTMLDivElement>) =>
            onTouchStart(event.changedTouches[0].clientX)
          }
          onTouchEnd={(event: React.TouchEvent<HTMLDivElement>) =>
            onTouchEnd(event.changedTouches[0].clientX, tx.id)
          }
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
            <p className="text-base font-bold text-foreground">NGN {formatAmount(tx.amount)}</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Swipe left for actions</p>
        </motion.div>
      </motion.div>
    )
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
                    NGN {formatAmount(tx.amount)}
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

      <div ref={parentRef} className="max-h-[440px] overflow-y-auto space-y-3 md:hidden">
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const tx = paginatedTransactions[virtualItem.index]
            if (!tx) return null

            return (
              <div
                key={tx.id}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                {renderTransactionCard(tx, virtualItem.index)}
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-4">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={isServerPaginated ? totalCount ?? transactions.length : sortedTransactions.length}
          pageSize={pageSize}
          onPageChange={handlePageChange}
        />
      </div>
    </motion.div>
  )
}
