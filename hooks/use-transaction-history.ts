import { useMemo, useState } from 'react'
import type { QuickFilter, SortDirection, SortField, Transaction } from '@/lib/fixtures/transactions'
import { type TransactionStatus } from '@/lib/fixtures/transactions'

interface UseTransactionHistoryOptions {
  transactions: Transaction[]
  pageSize?: number
  initialSortField?: SortField
  initialSortDirection?: SortDirection
  serverMode?: boolean
  serverTotalCount?: number
  onPageChange?: (nextPage: number) => void
}

interface UseTransactionHistoryResult {
  quickFilter: QuickFilter
  sortField: SortField
  sortDirection: SortDirection
  page: number
  filteredTransactions: Transaction[]
  sortedTransactions: Transaction[]
  paginatedTransactions: Transaction[]
  totalPages: number
  currentPage: number
  onFilterChange: (filter: QuickFilter) => void
  onSortChange: (field: SortField) => void
  onPageChange: (nextPage: number) => void
}

const statusOrder: Record<TransactionStatus, number> = {
  completed: 3,
  pending: 2,
  failed: 1,
}

export function useTransactionHistory({
  transactions,
  pageSize = 5,
  initialSortField = 'date',
  initialSortDirection = 'desc',
  serverMode = false,
  serverTotalCount,
  onPageChange: onPageChangeCallback,
}: UseTransactionHistoryOptions): UseTransactionHistoryResult {
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')
  const [sortField, setSortField] = useState<SortField>(initialSortField)
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialSortDirection)
  const [page, setPage] = useState(1)

  const filteredTransactions = useMemo(() => {
    if (serverMode) return transactions
    if (quickFilter === 'all') return transactions
    if (quickFilter === 'failed') return transactions.filter((tx) => tx.status === 'failed')
    return transactions.filter((tx) => tx.type === quickFilter)
  }, [quickFilter, serverMode, transactions])

  const sortedTransactions = useMemo(() => {
    if (serverMode) return transactions

    return [...filteredTransactions].sort((a, b) => {
      let aValue: string | number = 0
      let bValue: string | number = 0

      switch (sortField) {
        case 'date':
          aValue = new Date(a.date).getTime()
          bValue = new Date(b.date).getTime()
          break
        case 'type':
          aValue = a.type
          bValue = b.type
          break
        case 'asset':
          aValue = a.asset
          bValue = b.asset
          break
        case 'amount':
          aValue = a.amount
          bValue = b.amount
          break
        case 'status':
          aValue = statusOrder[a.status]
          bValue = statusOrder[b.status]
          break
      }

      const result =
        typeof aValue === 'string' && typeof bValue === 'string'
          ? aValue.localeCompare(bValue)
          : Number(aValue) - Number(bValue)

      return sortDirection === 'asc' ? result : -result
    })
  }, [filteredTransactions, serverMode, sortDirection, sortField, transactions])

  const totalPages = Math.max(
    1,
    Math.ceil((serverMode ? serverTotalCount ?? transactions.length : sortedTransactions.length) / pageSize)
  )
  const currentPage = Math.min(page, totalPages)

  const paginatedTransactions = useMemo(() => {
    if (serverMode) return transactions

    const start = (currentPage - 1) * pageSize
    return sortedTransactions.slice(start, start + pageSize)
  }, [currentPage, pageSize, serverMode, sortedTransactions, transactions])

  const onFilterChange = (filter: QuickFilter) => {
    setQuickFilter(filter)
    setPage(1)
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

  const onPageChange = (nextPage: number) => {
    setPage(nextPage)
    onPageChangeCallback?.(nextPage)
  }

  return {
    quickFilter,
    sortField,
    sortDirection,
    page,
    filteredTransactions,
    sortedTransactions,
    paginatedTransactions,
    totalPages,
    currentPage,
    onFilterChange,
    onSortChange,
    onPageChange,
  }
}
