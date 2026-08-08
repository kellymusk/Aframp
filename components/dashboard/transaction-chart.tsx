'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface ChartEntry {
  label: string
  amount: number
  type: 'onramp' | 'offramp' | 'billpay'
}

const TYPE_COLOR: Record<ChartEntry['type'], string> = {
  onramp: '#10b981',
  offramp: '#f59e0b',
  billpay: '#8b5cf6',
}

export function TransactionChart({ data }: { data: ChartEntry[] }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(value: number) => [`NGN ${value.toLocaleString()}`, 'Amount']}
          contentStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={TYPE_COLOR[entry.type]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
