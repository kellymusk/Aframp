'use client'

import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Payment } from '@/lib/api'
import { assetsInSeries, buildDailyRevenue } from '@/lib/revenue'

/**
 * Cycled per asset when more than one appears in the 7-day window. `--pos`
 * first — it's already the app's "money coming in" green everywhere else.
 */
const BAR_COLORS = [
  'var(--color-pos)',
  'var(--color-brand)',
  'var(--color-cta-to)',
  'var(--color-bright)',
]

/** Bar chart of total confirmed payments per day for the last 7 days (#494). */
export function RevenueChart({ payments }: { payments: Payment[] }) {
  const entries = useMemo(() => buildDailyRevenue(payments), [payments])
  const assets = useMemo(() => assetsInSeries(entries), [entries])
  const chartData = useMemo(
    () => entries.map((entry) => ({ label: entry.label, ...entry.totals })),
    [entries]
  )

  return (
    <section className="bg-panel border-hairline rounded-2xl border p-5">
      <p className="text-dim text-xs">Last 7 days</p>
      <h2 className="text-lg font-bold tracking-tight text-white">Revenue</h2>

      {assets.length === 0 ? (
        <p className="text-dim mt-4 text-sm">No confirmed payments in the last 7 days.</p>
      ) : (
        // The chart duplicates the accessible table below and adds nothing a
        // screen reader can use (bare SVG shapes) — hide it from assistive
        // tech rather than let it announce confusing fragments.
        <div className="mt-4 h-56" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-hairline)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: 'var(--color-dim)', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'var(--color-dim)', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--color-raised)',
                  border: '1px solid var(--color-hairline)',
                  borderRadius: 8,
                }}
                labelStyle={{ color: 'var(--color-bright)' }}
                cursor={{ fill: 'var(--color-raised)' }}
              />
              {assets.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
              {assets.map((asset, i) => (
                <Bar
                  key={asset}
                  dataKey={asset}
                  name={asset}
                  fill={BAR_COLORS[i % BAR_COLORS.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Same data as the chart above, for screen readers and non-visual UAs. */}
      <table className="sr-only">
        <caption>Total confirmed payments per day for the last 7 days</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            {assets.map((asset) => (
              <th key={asset} scope="col">
                {asset}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.date}>
              <th scope="row">{entry.label}</th>
              {assets.map((asset) => (
                <td key={asset}>{(entry.totals[asset] ?? 0).toFixed(2)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
