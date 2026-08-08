'use client'

import { Suspense, useEffect, useMemo, useRef, useState, type TouchEvent } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import useSWRInfinite from 'swr/infinite'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  ExternalLink,
  Filter,
  Receipt,
  RefreshCcw,
  XCircle,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

const TransactionChart = dynamic(
  () => import('./transaction-chart').then((m) => m.TransactionChart),
  { ssr: false, loading: () => <div className="h-40 rounded-lg"><div className="h-full w-full rounded-lg bg-muted/40 animate-pulse" /></div> }
)

const VIRTUAL_THRESHOLD = 50
const ROW_HEIGHT = 72
const PAGE_SIZE = 5

type TransactionType = 'onramp' | 'offramp' | 'billpay'
type TransactionStatus = 'pending' | 'completed' | 'failed'
type SortField = 'date' | 'type' | 'asset' | 'amount' | 'status'
type SortDirection = 'asc' | 'desc'
type TypeFilter = 'all' | TransactionType
type StatusFilter = 'all' | TransactionStatus
type DatePreset = 'all' | '7d' | '30d' | '90d'

interface Transaction {
  id: string
  date: string
  type: TransactionType
  amount: number
  asset: string
  counterparty: string
  status: TransactionStatus
}

interface TransactionPage {
  items: Transaction[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasMore: boolean
}

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

const datePresetLabels: Record<DatePreset, string> = {
  all: 'All time',
  '7d': '7 Days',
  '30d': '30 Days',
  '90d': '90 Days',
}

function getPresetRange(preset: Exclude<DatePreset, 'all'>) {
  const end = new Date()
  const start = new Date(end)
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90
  start.setDate(start.getDate() - days)
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

function parseWsPayload(payload: unknown): Transaction | null {
  if (!payload || typeof payload !== 'object') return null

  const candidate = 'transaction' in payload ? (payload as { transaction: unknown }).transaction : payload

  if (!candidate || typeof candidate !== 'object') return null

  const tx = candidate as Partial<Transaction>
  if (
    typeof tx.id !== 'string' ||
    typeof tx.date !== 'string' ||
    typeof tx.type !== 'string' ||
    typeof tx.amount !== 'number' ||
    typeof tx.asset !== 'string' ||
    typeof tx.counterparty !== 'string' ||
    typeof tx.status !== 'string'
  ) {
    return null
  }

  if (!(tx.type in typeConfig) || !(tx.status in statusConfig)) return null

  return tx as Transaction
}

function useVirtualList<T>(items: T[], rowHeight: number, containerHeight: number) {
  const [scrollTop, setScrollTop] = useState(0)
  const visibleStart = Math.max(0, Math.floor(scrollTop / rowHeight) - 2)
  const visibleEnd = Math.min(items.length, Math.ceil((scrollTop + containerHeight) / rowHeight) + 2)
  const visibleItems = items.slice(visibleStart, visibleEnd).map((item, i) => ({
    item,
    index: visibleStart + i,
    offsetTop: (visibleStart + i) * rowHeight,
  }))

  return { visibleItems, totalHeight: items.length * rowHeight, setScrollTop }
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
      className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
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

function formatAmount(value: number) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function buildTransactionsUrl(params: {
  page: number
  pageSize: number
  typeFilter: TypeFilter
  statusFilter: StatusFilter
  dateFrom: string
  dateTo: string
  sortField: SortField
  sortDirection: SortDirection
}) {
  const searchParams = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
    sortField: params.sortField,
    sortDirection: params.sortDirection,
  })

  if (params.typeFilter !== 'all') searchParams.set('type', params.typeFilter)
  if (params.statusFilter !== 'all') searchParams.set('status', params.statusFilter)
  if (params.dateFrom) searchParams.set('dateFrom', params.dateFrom)
  if (params.dateTo) searchParams.set('dateTo', params.dateTo)

  return `/api/dashboard/transactions?${searchParams.toString()}`
}

function transactionMatchesFilters(
  tx: Transaction,
  filters: {
    typeFilter: TypeFilter
    statusFilter: StatusFilter
    dateFrom: string
    dateTo: string
  }
) {
  const matchesType = filters.typeFilter === 'all' ? true : tx.type === filters.typeFilter
  const matchesStatus = filters.statusFilter === 'all' ? true : tx.status === filters.statusFilter
  const txDate = new Date(tx.date)
  const matchesFrom = filters.dateFrom ? txDate >= new Date(filters.dateFrom) : true
  const matchesTo = filters.dateTo
    ? txDate <= new Date(`${filters.dateTo}T23:59:59.999`)
    : true

  return matchesType && matchesStatus && matchesFrom && matchesTo
}

export function TransactionHistory() {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [datePreset, setDatePreset] = useState<DatePreset>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [activeSwipeId, setActiveSwipeId] = useState<string | null>(null)
  const touchStartX = useRef(0)
  const VIRTUAL_CONTAINER_HEIGHT = 480

  const wsUrl =
    process.env.NEXT_PUBLIC_DASHBOARD_WS_URL ?? process.env.NEXT_PUBLIC_BILLS_WS_URL ?? ''

  const activeFilterCount =
    (typeFilter !== 'all' ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0) +
    (datePreset !== 'all' || dateFrom || dateTo ? 1 : 0)

  const getKey = (pageIndex: number, previousPageData: TransactionPage | null) => {
    if (previousPageData && !previousPageData.hasMore) return null

    return buildTransactionsUrl({
      page: pageIndex + 1,
      pageSize: PAGE_SIZE,
      typeFilter,
      statusFilter,
      dateFrom,
      dateTo,
      sortField,
      sortDirection,
    })
  }

  const fetcher = async (url: string): Promise<TransactionPage> => {
    const response = await fetch(url, { cache: 'no-store' })
    if (!response.ok) {
      throw new Error('Failed to load transaction history')
    }

    return (await response.json()) as TransactionPage
  }

  const { data, error, size, setSize, mutate, isValidating } = useSWRInfinite<TransactionPage>(
    getKey,
    fetcher,
    {
      revalidateFirstPage: false,
      keepPreviousData: true,
    }
  )

  useEffect(() => {
    setSize(1)
  }, [dateFrom, dateTo, datePreset, typeFilter, statusFilter, sortField, sortDirection, setSize])

  useEffect(() => {
    if (!wsUrl) return

    let closed = false
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let socket: WebSocket | null = null

    const connect = () => {
      if (closed || !wsUrl) return

      try {
        socket = new WebSocket(wsUrl)
      } catch {
        return
      }

      socket.onmessage = (event) => {
        let parsed: unknown
        try {
          parsed = JSON.parse(event.data)
        } catch {
          return
        }

        const tx = parseWsPayload(parsed)
        if (!tx) return

        if (!transactionMatchesFilters(tx, { typeFilter, statusFilter, dateFrom, dateTo })) {
          void mutate()
          return
        }

        void mutate(
          (currentPages) => {
            if (!currentPages?.length) {
              return [
                {
                  items: [tx],
                  page: 1,
                  pageSize: PAGE_SIZE,
                  totalCount: 1,
                  totalPages: 1,
                  hasMore: false,
                },
              ]
            }

            let found = false
            const nextPages = currentPages.map((page) => ({
              ...page,
              items: page.items.map((item) => {
                if (item.id !== tx.id) return item
                found = true
                return tx
              }),
            }))

            if (found) return nextPages

            const firstPage = nextPages[0]
            nextPages[0] = {
              ...firstPage,
              items: [tx, ...firstPage.items.filter((item) => item.id !== tx.id)],
            }

            return nextPages
          },
          { revalidate: false }
        )
      }

      socket.onerror = () => {
        socket?.close()
      }

      socket.onclose = () => {
        if (!closed) {
          retryTimer = setTimeout(connect, 4000)
        }
      }
    }

    connect()

    return () => {
      closed = true
      if (retryTimer) clearTimeout(retryTimer)
      socket?.close()
    }
  }, [dateFrom, dateTo, mutate, statusFilter, typeFilter, wsUrl])

  const pages = useMemo(() => data ?? [], [data])
  const allTransactions = useMemo(() => {
    const byId = new Map<string, Transaction>()

    for (const page of pages) {
      for (const tx of page.items) {
        if (!byId.has(tx.id)) byId.set(tx.id, tx)
      }
    }

    return Array.from(byId.values())
  }, [pages])

  const totalCount = data?.[0]?.totalCount ?? 0
  const hasMore = data ? data[data.length - 1]?.hasMore ?? false : false
  const isInitialLoading = !data && !error
  const isLoadingMore = isValidating && size > (data?.length ?? 0)

  const chartData = useMemo(
    () =>
      allTransactions.slice(0, 10).map((tx) => ({
        label: tx.id.split('-')[1] ?? tx.id,
        amount: tx.amount,
        type: tx.type,
      })),
    [allTransactions]
  )

  const volumeChartData = useMemo(() => {
    const grouped = allTransactions.reduce<Record<string, number>>((acc, tx) => {
      const label = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
      }).format(new Date(tx.date))
      acc[label] = (acc[label] ?? 0) + tx.amount
      return acc
    }, {})

    return Object.entries(grouped).map(([date, amount]) => ({
      date,
      amount,
    }))
  }, [allTransactions])

  const typeDistributionData = useMemo(() => {
    const total = allTransactions.length
    const byType = allTransactions.reduce<Record<Transaction['type'], number>>(
      (acc, tx) => {
        acc[tx.type] += 1
        return acc
      },
      {
        onramp: 0,
        offramp: 0,
        billpay: 0,
      }
    )

    return (Object.keys(byType) as Array<Transaction['type']>).map((type) => ({
      name: typeConfig[type].label,
      value: byType[type],
      percentage: total > 0 ? Math.round((byType[type] / total) * 100) : 0,
      color:
        type === 'onramp'
          ? '#10b981'
          : type === 'offramp'
            ? '#f59e0b'
            : '#8b5cf6',
    }))
  }, [allTransactions])

  const volumeData = useMemo(
    () =>
      volumeChartData.map((entry) => ({
        ...entry,
        amount: entry.amount,
      })),
    [volumeChartData]
  )

  const { visibleItems, totalHeight, setScrollTop } = useVirtualList(
    allTransactions,
    ROW_HEIGHT,
    VIRTUAL_CONTAINER_HEIGHT
  )

  const onSortChange = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortField(field)
    setSortDirection('desc')
  }

  const resetFilters = () => {
    setTypeFilter('all')
    setStatusFilter('all')
    setDatePreset('all')
    setDateFrom('')
    setDateTo('')
  }

  const applyDatePreset = (preset: DatePreset) => {
    setDatePreset(preset)

    if (preset === 'all') {
      setDateFrom('')
      setDateTo('')
      return
    }

    const range = getPresetRange(preset)
    setDateFrom(range.start)
    setDateTo(range.end)
  }

  const handleDateFromChange = (value: string) => {
    setDatePreset('all')
    setDateFrom(value)
  }

  const handleDateToChange = (value: string) => {
    setDatePreset('all')
    setDateTo(value)
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

  const getExplorerUrl = (txId: string) => `https://verify.aframp.com/order/${txId}`

  const handleViewTransaction = (txId: string) => {
    window.open(getExplorerUrl(txId), '_blank', 'noopener,noreferrer')
  }

  const TransactionRow = ({
    tx,
    index,
    compact,
  }: {
    tx: Transaction
    index: number
    compact?: boolean
  }) => {
    const Icon = typeConfig[tx.type].icon
    const isSwipeActive = activeSwipeId === tx.id

    return (
      <motion.div
        key={tx.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03 }}
        className={cn(
          'relative overflow-hidden rounded-xl border border-border bg-card',
          compact ? 'p-0' : ''
        )}
      >
        <div className="absolute inset-y-0 right-0 flex items-center gap-2 pr-2">
          <Button
            size="sm"
            variant="outline"
            className="h-9 px-3"
            onClick={() => handleViewTransaction(tx.id)}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
        <motion.div
          animate={{ x: isSwipeActive ? -88 : 0 }}
          transition={{ duration: 0.2 }}
          onTouchStart={(event: TouchEvent<HTMLDivElement>) =>
            onTouchStart(event.changedTouches[0].clientX)
          }
          onTouchEnd={(event: TouchEvent<HTMLDivElement>) =>
            onTouchEnd(event.changedTouches[0].clientX, tx.id)
          }
          className={cn('relative z-10 bg-card', compact ? 'p-3 h-full flex flex-col justify-center' : 'p-4')}
        >
          {compact ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'h-8 w-8 rounded-lg border flex items-center justify-center shrink-0',
                    typeConfig[tx.type].iconClassName
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{typeConfig[tx.type].label}</p>
                  <p className="text-xs text-muted-foreground">{tx.id}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-foreground text-sm">NGN {formatAmount(tx.amount)}</p>
                <Badge
                  variant="outline"
                  className={cn(
                    'rounded-full border px-2 py-0.5 text-xs font-semibold flex items-center gap-1',
                    statusConfig[tx.status].className
                  )}
                >
                  {renderStatusIcon(tx.status)}
                  {statusConfig[tx.status].label}
                </Badge>
              </div>
            </div>
          ) : (
            <>
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
                    <button
                      type="button"
                      onClick={() => handleViewTransaction(tx.id)}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary hover:underline"
                    >
                      {tx.id}
                      <ExternalLink className="h-3 w-3" />
                    </button>
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
            </>
          )}
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
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Transaction History</h3>
            <p className="text-sm text-muted-foreground">
              Track all onramp, offramp, and bill payments
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'onramp', 'offramp', 'billpay'] as TypeFilter[]).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setTypeFilter(filter)}
                className={cn(
                  'h-8 rounded-full border px-3 text-sm font-medium transition-colors',
                  typeFilter === filter
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {filter === 'all'
                  ? 'All Types'
                  : typeConfig[filter].label}
              </button>
            ))}
            {(['all', 'completed', 'pending', 'failed'] as StatusFilter[]).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={cn(
                  'h-8 rounded-full border px-3 text-sm font-medium transition-colors',
                  statusFilter === filter
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {filter === 'all' ? 'All Statuses' : statusConfig[filter].label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void mutate()}>
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={resetFilters} disabled={activeFilterCount === 0}>
            <Filter className="h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 rounded-xl border border-border bg-muted/20 p-3 lg:grid-cols-[1.3fr_1fr_1fr]">
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(datePresetLabels) as DatePreset[]).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => applyDatePreset(preset)}
              className={cn(
                'h-8 rounded-full border px-3 text-sm font-medium transition-colors',
                datePreset === preset
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {datePresetLabels[preset]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(event) => handleDateFromChange(event.target.value)}
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(event) => handleDateToChange(event.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as TypeFilter)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="onramp">Onramp</SelectItem>
              <SelectItem value="offramp">Offramp</SelectItem>
              <SelectItem value="billpay">Bill Pay</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as StatusFilter)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {totalCount > 0 ? (
            <>
              Showing {allTransactions.length} of {totalCount} transactions
              {activeFilterCount > 0 ? ` • ${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active` : ''}
            </>
          ) : isInitialLoading ? (
            'Loading transactions...'
          ) : (
            'No transactions found for the selected filters'
          )}
        </div>
        {pages.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Page size {PAGE_SIZE} • Latest updates stay pinned instantly
          </div>
        )}
      </div>

      <Suspense fallback={<div className="mb-4 h-40 animate-pulse rounded-lg bg-muted" />}>
        <div className="mb-4">
          <TransactionChart data={chartData} />
        </div>
      </Suspense>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-foreground">Volume Trend</h4>
            <span className="text-xs text-muted-foreground">Loaded pages only</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={volumeData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(value: number) => [`NGN ${value.toLocaleString()}`, 'Amount']} />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]} fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-foreground">Type Distribution</h4>
            <span className="text-xs text-muted-foreground">Loaded pages only</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Tooltip formatter={(value: number) => [value, 'Transactions']} />
              <Pie
                data={typeDistributionData}
                dataKey="value"
                nameKey="name"
                innerRadius={42}
                outerRadius={68}
                paddingAngle={4}
              >
                {typeDistributionData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[820px]">
          <thead>
            <tr className="border-b border-border">
              <th className="py-3 text-left">
                <SortHeader label="Date" field="date" sortField={sortField} onSortChange={onSortChange} />
              </th>
              <th className="py-3 text-left">
                <SortHeader label="Type / ID" field="type" sortField={sortField} onSortChange={onSortChange} />
              </th>
              <th className="py-3 text-left">
                <SortHeader label="Asset" field="asset" sortField={sortField} onSortChange={onSortChange} />
              </th>
              <th className="py-3 text-left">
                <SortHeader label="Amount" field="amount" sortField={sortField} onSortChange={onSortChange} />
              </th>
              <th className="py-3 text-left">
                <SortHeader label="Status" field="status" sortField={sortField} onSortChange={onSortChange} />
              </th>
              <th className="py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Action
              </th>
            </tr>
          </thead>
        </table>

        {isInitialLoading ? (
          <div className="space-y-3 py-4">
            {Array.from({ length: PAGE_SIZE }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-lg bg-muted/60" />
            ))}
          </div>
        ) : allTransactions.length > VIRTUAL_THRESHOLD ? (
          <div
            style={{ height: VIRTUAL_CONTAINER_HEIGHT, overflowY: 'auto' }}
            onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
          >
            <div style={{ height: totalHeight, position: 'relative' }}>
              {visibleItems.map(({ item: tx, index, offsetTop }) => {
                const Icon = typeConfig[tx.type].icon

                return (
                  <table
                    key={tx.id}
                    className="absolute w-full min-w-[820px]"
                    style={{ top: offsetTop }}
                  >
                  <tbody>
                    <tr
                      style={{ height: ROW_HEIGHT }}
                      className="border-b border-border/70 hover:bg-muted/30"
                      aria-rowindex={index + 1}
                    >
                      <td className="w-[120px] py-4 text-sm text-foreground">{formatDate(tx.date)}</td>
                      <td className="py-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'flex h-9 w-9 items-center justify-center rounded-lg border',
                              typeConfig[tx.type].iconClassName
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">{typeConfig[tx.type].label}</div>
                            <div className="text-xs text-muted-foreground">{tx.id}</div>
                            <div className="mt-0.5 text-xs text-muted-foreground">{tx.counterparty}</div>
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
                            'flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold',
                            statusConfig[tx.status].className
                          )}
                        >
                          {renderStatusIcon(tx.status)}
                          {statusConfig[tx.status].label}
                        </Badge>
                      </td>
                      <td className="py-4">
                        <Button variant="ghost" size="sm" className="h-9" onClick={() => handleViewTransaction(tx.id)}>
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                      </td>
                    </tr>
                  </tbody>
                </table>
                )
              })}
            </div>
          </div>
        ) : (
          <table className="w-full min-w-[820px]">
            <tbody>
              {allTransactions.map((tx, index) => {
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
                            'flex h-9 w-9 items-center justify-center rounded-lg border',
                            typeConfig[tx.type].iconClassName
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{typeConfig[tx.type].label}</div>
                          <div className="text-xs text-muted-foreground">{tx.id}</div>
                          <div className="mt-0.5 text-xs text-muted-foreground">{tx.counterparty}</div>
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
                          'flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold',
                          statusConfig[tx.status].className
                        )}
                      >
                        {renderStatusIcon(tx.status)}
                        {statusConfig[tx.status].label}
                      </Badge>
                    </td>
                    <td className="py-4">
                      <Button variant="ghost" size="sm" className="h-9" onClick={() => handleViewTransaction(tx.id)}>
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="md:hidden">
        {isInitialLoading ? (
          <div className="space-y-3">
            {Array.from({ length: PAGE_SIZE }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-xl bg-muted/60" />
            ))}
          </div>
        ) : allTransactions.length > VIRTUAL_THRESHOLD ? (
          <div
            style={{ height: VIRTUAL_CONTAINER_HEIGHT, overflowY: 'auto' }}
            onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
          >
            <div style={{ height: totalHeight, position: 'relative' }}>
              {visibleItems.map(({ item: tx, offsetTop, index }) => (
                <div
                  key={tx.id}
                  className="absolute w-full px-0"
                  style={{ top: offsetTop, height: ROW_HEIGHT }}
                >
                  <TransactionRow tx={tx} index={index} compact />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {allTransactions.map((tx, index) => (
              <TransactionRow key={tx.id} tx={tx} index={index} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-sm text-muted-foreground">
          {allTransactions.length > 0
            ? `Loaded ${allTransactions.length} of ${totalCount || allTransactions.length} transactions`
            : 'No transactions loaded yet'}
        </p>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void mutate()} disabled={isValidating}>
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSize(size + 1)}
            disabled={!hasMore || isLoadingMore}
          >
            {isLoadingMore ? 'Loading...' : hasMore ? 'Load more' : 'All loaded'}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
