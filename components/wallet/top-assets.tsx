import { memo } from 'react'
import Link from 'next/link'
import type { Balance } from '@/lib/api'
import { formatStroops } from '@/lib/money'

export const TopAssets = memo(function TopAssets({ balances }: { balances: Balance[] }) {
  return (
    <div>
      <p className="text-dim mb-2 text-xs">Balances</p>
      {balances.length === 0 ? (
        <p className="text-dim px-3 py-2.5 text-sm">No balances yet.</p>
      ) : (
        <ul>
          {balances.map((balance) => (
            <li key={balance.asset}>
              <Link
                href="/wallet"
                className="hover:bg-raised/60 flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors"
              >
                <span className="bg-brand-deep text-pos flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
                  {balance.asset.slice(0, 2)}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{balance.asset}</p>
                  {balance.pending > 0n && (
                    <p className="text-dim text-xs">{formatStroops(balance.pending)} confirming</p>
                  )}
                </div>

                <p className="text-sm font-bold text-white tabular-nums">
                  {formatStroops(balance.available)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
})
