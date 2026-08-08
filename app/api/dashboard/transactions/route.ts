import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

type TransactionType = 'onramp' | 'offramp' | 'billpay'
type TransactionStatus = 'pending' | 'completed' | 'failed'
type SortField = 'date' | 'type' | 'asset' | 'amount' | 'status'
type SortDirection = 'asc' | 'desc'

interface Transaction {
  id: string
  date: string
  type: TransactionType
  amount: number
  asset: string
  counterparty: string
  status: TransactionStatus
}

const transactions: Transaction[] = [
  {
    id: 'ONR-240191',
    date: '2026-02-26T08:22:00.000Z',
    type: 'onramp',
    amount: 15000,
    asset: 'cNGN',
    counterparty: 'From Zenith Bank',
    status: 'completed',
  },
  {
    id: 'OFF-240180',
    date: '2026-02-26T07:40:00.000Z',
    type: 'offramp',
    amount: 8700,
    asset: 'USDC',
    counterparty: 'To MTN Mobile Money',
    status: 'pending',
  },
  {
    id: 'BIL-240178',
    date: '2026-02-25T16:11:00.000Z',
    type: 'billpay',
    amount: 5500,
    asset: 'cNGN',
    counterparty: 'To IKEDC Electricity',
    status: 'completed',
  },
  {
    id: 'ONR-240173',
    date: '2026-02-25T11:35:00.000Z',
    type: 'onramp',
    amount: 25000,
    asset: 'cNGN',
    counterparty: 'From Access Bank',
    status: 'pending',
  },
  {
    id: 'OFF-240166',
    date: '2026-02-24T19:02:00.000Z',
    type: 'offramp',
    amount: 12000,
    asset: 'USDT',
    counterparty: 'To Kuda Bank',
    status: 'completed',
  },
  {
    id: 'BIL-240162',
    date: '2026-02-24T09:43:00.000Z',
    type: 'billpay',
    amount: 2100,
    asset: 'cNGN',
    counterparty: 'To Glo Airtime',
    status: 'failed',
  },
  {
    id: 'ONR-240158',
    date: '2026-02-23T20:10:00.000Z',
    type: 'onramp',
    amount: 8000,
    asset: 'cNGN',
    counterparty: 'From GTBank',
    status: 'completed',
  },
  {
    id: 'BIL-240151',
    date: '2026-02-23T08:37:00.000Z',
    type: 'billpay',
    amount: 4300,
    asset: 'cNGN',
    counterparty: 'To DSTV',
    status: 'completed',
  },
  {
    id: 'OFF-240144',
    date: '2026-02-22T22:29:00.000Z',
    type: 'offramp',
    amount: 16000,
    asset: 'USDC',
    counterparty: 'To Opay Wallet',
    status: 'completed',
  },
  {
    id: 'ONR-240132',
    date: '2026-02-22T10:04:00.000Z',
    type: 'onramp',
    amount: 10000,
    asset: 'cNGN',
    counterparty: 'From Moniepoint',
    status: 'failed',
  },
  {
    id: 'OFF-240120',
    date: '2026-02-21T14:18:00.000Z',
    type: 'offramp',
    amount: 7300,
    asset: 'USDT',
    counterparty: 'To First Bank',
    status: 'completed',
  },
]

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(5),
  type: z.enum(['onramp', 'offramp', 'billpay']).optional(),
  status: z.enum(['pending', 'completed', 'failed']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortField: z.enum(['date', 'type', 'asset', 'amount', 'status']).default('date'),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
})

function sortTransactions(items: Transaction[], sortField: SortField, sortDirection: SortDirection) {
  const statusOrder: Record<TransactionStatus, number> = {
    failed: 1,
    pending: 2,
    completed: 3,
  }

  return [...items].sort((a, b) => {
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
}

function filterTransactions(items: Transaction[], params: z.infer<typeof QuerySchema>) {
  return items.filter((tx) => {
    const matchesType = params.type ? tx.type === params.type : true
    const matchesStatus = params.status ? tx.status === params.status : true
    const matchesFrom = params.dateFrom ? new Date(tx.date) >= new Date(params.dateFrom) : true
    const matchesTo = params.dateTo
      ? new Date(tx.date) <= new Date(`${params.dateTo}T23:59:59.999`)
      : true

    return matchesType && matchesStatus && matchesFrom && matchesTo
  })
}

export function GET(request: NextRequest) {
  const parsed = QuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()))

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid transaction query', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { page, pageSize, sortField, sortDirection } = parsed.data
  const filtered = filterTransactions(transactions, parsed.data)
  const sorted = sortTransactions(filtered, sortField, sortDirection)
  const totalCount = sorted.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * pageSize
  const items = sorted.slice(start, start + pageSize)

  return NextResponse.json({
    items,
    page: safePage,
    pageSize,
    totalCount,
    totalPages,
    hasMore: safePage < totalPages,
  })
}
