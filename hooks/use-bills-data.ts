'use client'

import { useEffect, useState } from 'react'

export interface BillCategory {
  id: string
  name: string
  icon: string
  billerCount: number
  color: string
  popular: boolean
}

export interface Biller {
  id: string
  name: string
  logo: string
  category: string
  minAmount: number
  maxAmount: number
  popular: boolean
  trending: boolean
  description: string
}

export interface BillsTransaction {
  id: string
  amount: number
  currency: string
  fee: number
  biller: string
  billerCategory: string
  accountLabel: string
  status: 'completed' | 'pending' | 'failed'
  reference: string
  createdAt: string
  paymentMethod: string
}

export interface ScheduledPayment {
  id: string
  biller: string
  amount: number
  currency: string
  frequency: 'weekly' | 'monthly' | 'daily'
  nextDate: string
  status: 'active' | 'paused'
}

interface UseBillsDataReturn {
  categories: BillCategory[]
  recentBillers: Biller[]
  transactions: BillsTransaction[]
  scheduledPayments: ScheduledPayment[]
  loading: boolean
}

const MOCK_CATEGORIES: BillCategory[] = [
  {
    id: 'electricity',
    name: 'Electricity',
    icon: '⚡',
    billerCount: 12,
    color: 'orange',
    popular: true,
  },
  {
    id: 'internet',
    name: 'Internet & Cable',
    icon: '🌐',
    billerCount: 8,
    color: 'blue',
    popular: true,
  },
  {
    id: 'mobile',
    name: 'Mobile Recharge',
    icon: '📱',
    billerCount: 15,
    color: 'green',
    popular: true,
  },
  {
    id: 'water',
    name: 'Water',
    icon: '💧',
    billerCount: 6,
    color: 'indigo',
    popular: false,
  },
  {
    id: 'education',
    name: 'Education',
    icon: '🎓',
    billerCount: 9,
    color: 'purple',
    popular: false,
  },
  {
    id: 'insurance',
    name: 'Insurance',
    icon: '🛡️',
    billerCount: 7,
    color: 'red',
    popular: false,
  },
]

const MOCK_BILLERS: Biller[] = [
  {
    id: 'dstv',
    name: 'DStv',
    logo: '📺',
    category: 'internet',
    minAmount: 1000,
    maxAmount: 50000,
    popular: true,
    trending: false,
    description: 'Pay for your DStv subscription securely and instantly.',
  },
  {
    id: 'gotv',
    name: 'GOtv',
    logo: '📡',
    category: 'internet',
    minAmount: 500,
    maxAmount: 25000,
    popular: true,
    trending: true,
    description: 'Subscribe to GOtv packages with ease.',
  },
  {
    id: 'spectranet',
    name: 'Spectranet',
    logo: '📶',
    category: 'internet',
    minAmount: 1000,
    maxAmount: 30000,
    popular: false,
    trending: false,
    description: 'Top up your Spectranet account instantly.',
  },
  {
    id: 'aedc',
    name: 'AEDC',
    logo: '💡',
    category: 'electricity',
    minAmount: 500,
    maxAmount: 100000,
    popular: true,
    trending: false,
    description: 'Purchase electricity tokens for AEDC.',
  },
  {
    id: 'ikeja-electric',
    name: 'Ikeja Electric',
    logo: '⚡',
    category: 'electricity',
    minAmount: 500,
    maxAmount: 100000,
    popular: true,
    trending: true,
    description: 'Recharge your Ikeja Electric prepaid meter.',
  },
  {
    id: 'mtn-data',
    name: 'MTN Data',
    logo: '📶',
    category: 'mobile',
    minAmount: 100,
    maxAmount: 20000,
    popular: true,
    trending: true,
    description: 'Quickly buy MTN data plans for any number.',
  },
  {
    id: 'safaricom-airtime',
    name: 'Safaricom',
    logo: '🇰🇪',
    category: 'mobile',
    minAmount: 10,
    maxAmount: 10000,
    popular: false,
    trending: false,
    description: 'Recharge Safaricom airtime instantly.',
  },
]

const MOCK_TRANSACTIONS: BillsTransaction[] = [
  {
    id: 'txn_1',
    amount: 15000,
    currency: 'NGN',
    fee: 100,
    biller: 'DStv Premium',
    billerCategory: 'Internet & Cable',
    accountLabel: 'Decoder: 1234567890',
    status: 'completed',
    reference: 'DSTV2024001',
    createdAt: '2024-01-15T10:30:00Z',
    paymentMethod: 'Wallet',
  },
  {
    id: 'txn_2',
    amount: 8500,
    currency: 'NGN',
    fee: 100,
    biller: 'AEDC Prepaid',
    billerCategory: 'Electricity',
    accountLabel: 'Meter: 9876543210',
    status: 'pending',
    reference: 'AEDC2024002',
    createdAt: '2024-01-14T14:15:00Z',
    paymentMethod: 'Bank Transfer',
  },
  {
    id: 'txn_3',
    amount: 25000,
    currency: 'NGN',
    fee: 100,
    biller: 'Spectranet',
    billerCategory: 'Internet & Cable',
    accountLabel: 'Account: user@example.com',
    status: 'completed',
    reference: 'SPEC2024003',
    createdAt: '2024-01-13T09:45:00Z',
    paymentMethod: 'Wallet',
  },
]

const MOCK_SCHEDULED_PAYMENTS: ScheduledPayment[] = [
  {
    id: 'sched_1',
    biller: 'DStv Premium',
    amount: 15000,
    currency: 'NGN',
    frequency: 'monthly',
    nextDate: '2024-02-15',
    status: 'active',
  },
  {
    id: 'sched_2',
    biller: 'Spectranet',
    amount: 25000,
    currency: 'NGN',
    frequency: 'monthly',
    nextDate: '2024-02-10',
    status: 'active',
  },
]

export function useBillsData(countryCode: string): UseBillsDataReturn {
  const [loading, setLoading] = useState(true)

  // Simulate API delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false)
    }, 800)

    return () => clearTimeout(timer)
  }, [countryCode])

  // In a real app, you would fetch data based on countryCode
  // For now, we return mock data

  return {
    categories: MOCK_CATEGORIES,
    recentBillers: MOCK_BILLERS,
    transactions: MOCK_TRANSACTIONS,
    scheduledPayments: MOCK_SCHEDULED_PAYMENTS,
    loading,
  }
}
