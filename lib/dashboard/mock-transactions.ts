import { isMockEmptyEnabled } from '@/lib/mock-empty'

export interface DashboardTransaction {
  id: string
  date: string
  type: 'onramp' | 'offramp' | 'billpay'
  amount: number
  asset: string
  counterparty: string
  status: 'pending' | 'completed' | 'failed'
}

export const MOCK_DASHBOARD_TRANSACTIONS: DashboardTransaction[] = [
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

export function getDashboardTransactions(
  override?: DashboardTransaction[]
): DashboardTransaction[] {
  if (override !== undefined) return override
  if (isMockEmptyEnabled()) return []
  return MOCK_DASHBOARD_TRANSACTIONS
}
