'use client'

import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Payment } from '@/lib/api'
import { assetsInSeries, buildDailyRevenue } from '@/lib/revenue'

/** Bar chart of total confirmed payments per day for the last 7 days (#494). */
export function RevenueChart({ payments }: { payments: Payment[] }) {
  const entries = useMemo(() => buildDailyRevenue(payments), [payments])
  const assets = useMemo(() => assetsInSeries(entries), [entries])
  const chartData = useMemo(
    () => entries.map((entry) => ({ label: entry.label, ...entry.totals })),
    [entries]
  )
  // Different currencies can't share one axis (25,000 cNGN would dwarf 15
  // USDC of similar value), so the chart shows one asset at a time.
  const weeklyTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const entry of entries) {
      for (const [asset, value] of Object.entries(entry.totals)) {
        totals[asset] = (totals[asset] ?? 0) + value
      }
    }
    return totals
  }, [entries])
  const [chosenAsset, setChosenAsset] = useState<string | null>(null)
  const selected =
    chosenAsset && assets.includes(chosenAsset)
      ? chosenAsset
      : [...assets].sort((a, b) => (weeklyTotals[b] ?? 0) - (weeklyTotals[a] ?? 0))[0]

  return (
    <section className="bg-panel border-hairline rounded-2xl border p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-dim text-xs">Last 7 days</p>
          <h2 className="text-lg font-bold tracking-tight text-white">Revenue</h2>
          {selected && (
            <p className="mt-1 text-sm text-white tabular-nums">
              {(weeklyTotals[selected] ?? 0).toLocaleString('en-NG', {
                maximumFractionDigits: 2,
              })}{' '}
              <span className="text-dim">{selected}</span>
            </p>
          )}
        </div>
        {assets.length > 1 && (
          <div role="group" aria-label="Currency" className="bg-raised flex rounded-full p-1">
            {assets.map((asset) => (
              <button
                key={asset}
                type="button"
                aria-pressed={asset === selected}
                onClick={() => setChosenAsset(asset)}
                className={
                  asset === selected
                    ? 'bg-nav-active rounded-full px-3 py-1 text-xs font-bold text-white'
                    : 'text-dim hover:text-bright rounded-full px-3 py-1 text-xs'
                }
              >
                {asset}
              </button>
            ))}
          </div>
        )}
      </div>

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
                width={56}
                tickFormatter={(value: number) =>
                  value.toLocaleString('en-NG', { notation: 'compact' })
                }
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
              {selected && (
                <Bar
                  dataKey={selected}
                  name={selected}
                  fill="var(--color-pos)"
                  radius={[4, 4, 0, 0]}
                />
              )}
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
