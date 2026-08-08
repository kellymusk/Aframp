'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowUpDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { OnrampOrder, OrderStatus } from '@/types/onramp'

const PAGE_SIZE = 10

type QuickFilter = 'all' | 'pending' | 'minting' | 'completed' | 'failed'
type SortField = 'createdAt' | 'amount' | 'status' | 'fiatCurrency'
type SortDirection = 'asc' | 'desc'

const mockOrders: OnrampOrder[] = [
  { id: 'ORD-001', createdAt: 1748822400000, expiresAt: 1748908800000, fiatCurrency: 'NGN', cryptoAsset: 'cNGN', paymentMethod: 'bank_transfer', amount: 25000, exchangeRate: 1.01, cryptoAmount: 24750, fees: { processingFee: 200, networkFee: 50, totalFees: 250, totalCost: 25250 }, walletAddress: '0xABC1', status: 'completed', transactionHash: '0xhash1', completedAt: 1748836800000 },
  { id: 'ORD-002', createdAt: 1748736000000, expiresAt: 1748822400000, fiatCurrency: 'KES', cryptoAsset: 'cKES', paymentMethod: 'mobile_money', amount: 5000, exchangeRate: 0.0077, cryptoAmount: 38.5, fees: { processingFee: 50, networkFee: 10, totalFees: 60, totalCost: 5060 }, walletAddress: '0xABC2', status: 'awaiting_payment' },
  { id: 'ORD-003', createdAt: 1748649600000, expiresAt: 1748736000000, fiatCurrency: 'GHS', cryptoAsset: 'cGHS', paymentMethod: 'bank_transfer', amount: 1200, exchangeRate: 0.065, cryptoAmount: 78, fees: { processingFee: 20, networkFee: 5, totalFees: 25, totalCost: 1225 }, walletAddress: '0xABC3', status: 'minting' },
  { id: 'ORD-004', createdAt: 1748563200000, expiresAt: 1748649600000, fiatCurrency: 'ZAR', cryptoAsset: 'USDC', paymentMethod: 'card', amount: 800, exchangeRate: 0.054, cryptoAmount: 43.2, fees: { processingFee: 15, networkFee: 5, totalFees: 20, totalCost: 820 }, walletAddress: '0xABC4', status: 'failed' },
  { id: 'ORD-005', createdAt: 1748476800000, expiresAt: 1748563200000, fiatCurrency: 'NGN', cryptoAsset: 'USDC', paymentMethod: 'bank_transfer', amount: 150000, exchangeRate: 0.00065, cryptoAmount: 97.5, fees: { processingFee: 1000, networkFee: 200, totalFees: 1200, totalCost: 151200 }, walletAddress: '0xABC5', status: 'completed', transactionHash: '0xhash5', completedAt: 1748490000000 },
  { id: 'ORD-006', createdAt: 1748390400000, expiresAt: 1748476800000, fiatCurrency: 'UGX', cryptoAsset: 'XLM', paymentMethod: 'mobile_money', amount: 200000, exchangeRate: 0.00027, cryptoAmount: 54, fees: { processingFee: 2000, networkFee: 500, totalFees: 2500, totalCost: 202500 }, walletAddress: '0xABC6', status: 'transferring' },
  { id: 'ORD-007', createdAt: 1748304000000, expiresAt: 1748390400000, fiatCurrency: 'NGN', cryptoAsset: 'cNGN', paymentMethod: 'bank_transfer', amount: 50000, exchangeRate: 1.01, cryptoAmount: 49500, fees: { processingFee: 400, networkFee: 100, totalFees: 500, totalCost: 50500 }, walletAddress: '0xABC7', status: 'payment_received' },
  { id: 'ORD-008', createdAt: 1748217600000, expiresAt: 1748304000000, fiatCurrency: 'KES', cryptoAsset: 'USDC', paymentMethod: 'mobile_money', amount: 12000, exchangeRate: 0.0077, cryptoAmount: 92.4, fees: { processingFee: 120, networkFee: 25, totalFees: 145, totalCost: 12145 }, walletAddress: '0xABC8', status: 'completed', transactionHash: '0xhash8', completedAt: 1748230800000 },
  { id: 'ORD-009', createdAt: 1748131200000, expiresAt: 1748217600000, fiatCurrency: 'GHS', cryptoAsset: 'cGHS', paymentMethod: 'bank_transfer', amount: 3500, exchangeRate: 0.065, cryptoAmount: 227.5, fees: { processingFee: 35, networkFee: 8, totalFees: 43, totalCost: 3543 }, walletAddress: '0xABC9', status: 'created' },
  { id: 'ORD-010', createdAt: 1748044800000, expiresAt: 1748131200000, fiatCurrency: 'NGN', cryptoAsset: 'USDC', paymentMethod: 'card', amount: 75000, exchangeRate: 0.00065, cryptoAmount: 48.75, fees: { processingFee: 600, networkFee: 150, totalFees: 750, totalCost: 75750 }, walletAddress: '0xABC10', status: 'failed' },
  { id: 'ORD-011', createdAt: 1747958400000, expiresAt: 1748044800000, fiatCurrency: 'ZAR', cryptoAsset: 'XLM', paymentMethod: 'card', amount: 2000, exchangeRate: 0.054, cryptoAmount: 108, fees: { processingFee: 20, networkFee: 5, totalFees: 25, totalCost: 2025 }, walletAddress: '0xABC11', status: 'completed', transactionHash: '0xhash11', completedAt: 1747972000000 },
  { id: 'ORD-012', createdAt: 1747872000000, expiresAt: 1747958400000, fiatCurrency: 'NGN', cryptoAsset: 'cNGN', paymentMethod: 'bank_transfer', amount: 10000, exchangeRate: 1.01, cryptoAmount: 9900, fees: { processingFee: 80, networkFee: 20, totalFees: 100, totalCost: 10100 }, walletAddress: '0xABC12', status: 'minting' },
]

const statusConfig: Record<OrderStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  created: { label: 'Created', className: 'bg-slate-500/12 text-slate-500 border-slate-500/35 dark:text-slate-400', icon: Clock },
  awaiting_payment: { label: 'Awaiting Payment', className: 'bg-amber-500/12 text-amber-700 border-amber-500/35 dark:text-amber-400', icon: Clock },
  payment_received: { label: 'Payment Received', className: 'bg-sky-500/12 text-sky-700 border-sky-500/35 dark:text-sky-400', icon: CheckCircle2 },
  minting: { label: 'Minting', className: 'bg-violet-500/12 text-violet-700 border-violet-500/35 dark:text-violet-400', icon: Clock },
  transferring: { label: 'Transferring', className: 'bg-blue-500/12 text-blue-700 border-blue-500/35 dark:text-blue-400', icon: Clock },
  completed: { label: 'Completed', className: 'bg-emerald-500/12 text-emerald-700 border-emerald-500/35 dark:text-emerald-400', icon: CheckCircle2 },
  failed: { label: 'Failed', className: 'bg-rose-500/12 text-rose-700 border-rose-500/35 dark:text-rose-400', icon: XCircle },
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

export default function AdminOrdersPage() {
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [page, setPage] = useState(1)

  const quickFilters: Array<{ key: QuickFilter; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'minting', label: 'Minting' },
    { key: 'completed', label: 'Completed' },
    { key: 'failed', label: 'Failed' },
  ]

  const filtered = useMemo(() => {
    return mockOrders.filter((o) => {
      if (quickFilter === 'all') return true
      if (quickFilter === 'pending') return ['created', 'awaiting_payment', 'payment_received', 'transferring'].includes(o.status)
      if (quickFilter === 'minting') return o.status === 'minting'
      if (quickFilter === 'completed') return o.status === 'completed'
      if (quickFilter === 'failed') return o.status === 'failed'
      return true
    })
  }, [quickFilter])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let aVal: string | number = 0
      let bVal: string | number = 0
      switch (sortField) {
        case 'createdAt': aVal = a.createdAt; bVal = b.createdAt; break
        case 'amount': aVal = a.amount; bVal = b.amount; break
        case 'status': aVal = a.status; bVal = b.status; break
        case 'fiatCurrency': aVal = a.fiatCurrency; bVal = b.fiatCurrency; break
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
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage onramp and offramp orders</p>
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
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-border">
                <th className="py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Order ID</th>
                <th className="py-3 text-left"><SortHeader label="Amount" field="amount" sortField={sortField} onSortChange={onSortChange} /></th>
                <th className="py-3 text-left"><SortHeader label="Currency" field="fiatCurrency" sortField={sortField} onSortChange={onSortChange} /></th>
                <th className="py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Asset</th>
                <th className="py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Method</th>
                <th className="py-3 text-left"><SortHeader label="Status" field="status" sortField={sortField} onSortChange={onSortChange} /></th>
                <th className="py-3 text-left"><SortHeader label="Created" field="createdAt" sortField={sortField} onSortChange={onSortChange} /></th>
                <th className="py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((order, index) => {
                const StatusIcon = statusConfig[order.status].icon
                return (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="border-b border-border/70 transition-colors hover:bg-muted/30"
                  >
                    <td className="py-4 font-mono text-sm text-foreground">{order.id}</td>
                    <td className="py-4 font-bold text-foreground">{order.amount.toLocaleString()}</td>
                    <td className="py-4 text-sm text-muted-foreground">{order.fiatCurrency}</td>
                    <td className="py-4 text-sm font-medium text-foreground">{order.cryptoAsset}</td>
                    <td className="py-4 text-sm text-muted-foreground capitalize">{order.paymentMethod.replace(/_/g, ' ')}</td>
                    <td className="py-4">
                      <Badge
                        variant="outline"
                        className={cn('w-fit rounded-full border px-3 py-1 text-xs font-semibold flex items-center gap-1.5', statusConfig[order.status].className)}
                      >
                        <StatusIcon className="h-3.5 w-3.5" />
                        {statusConfig[order.status].label}
                      </Badge>
                    </td>
                    <td className="py-4 text-sm text-muted-foreground">{formatDate(order.createdAt)}</td>
                    <td className="py-4">
                      <Button variant="ghost" size="sm" className="h-8 px-3 text-xs">
                        <Eye className="h-3.5 w-3.5" />View
                      </Button>
                    </td>
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
