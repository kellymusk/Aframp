import { Building2, CreditCard, Globe, ShieldCheck, Wallet, Zap } from 'lucide-react'

import { supportedCountryCodes, supportedCountryCount } from '@/lib/landing-data'
import { cn } from '@/lib/utils'

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="border-edge text-dim rounded border px-2 py-0.5 text-[11px]">{children}</span>
  )
}

function Tile({
  icon: Icon,
  tint,
  title,
  blurb,
  className,
  children,
}: {
  icon: typeof Wallet
  tint?: string
  title: string
  blurb: string
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div className={cn('border-edge bg-surface rounded-2xl border p-6', className)}>
      <span
        className={cn(
          'flex size-10 items-center justify-center rounded-full',
          tint ?? 'bg-brand/15'
        )}
      >
        <Icon className={cn('size-5', tint ? 'text-amber-400' : 'text-brand')} />
      </span>
      <h3 className="mt-5 font-bold text-white">{title}</h3>
      <p className="text-dim mt-2 text-sm leading-relaxed">{blurb}</p>
      {children}
    </div>
  )
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <p className="mt-4 flex items-baseline gap-2">
      <span className="text-brand text-lg font-bold">{value}</span>
      <span className="text-dim text-xs">{label}</span>
    </p>
  )
}

const ticker = [
  { label: 'BTC Buy', amount: '₦50,000' },
  { label: 'Bill Pay', amount: '₦15,000' },
  { label: 'ETH Sell', amount: '₦120,000' },
]

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-24">
      <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
        Everything you need to transact
      </h2>
      <p className="text-dim mx-auto mt-3 max-w-xl text-center text-sm">
        From buying your first crypto to running a business on cNGN. Built for Africa, by Africans.
      </p>

      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {/* Lead tile: copy on the left, a live-rate strip and recent
            activity on the right. */}
        <div className="border-edge bg-surface rounded-2xl border p-6 md:col-span-2">
          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <span className="bg-brand/15 flex size-10 items-center justify-center rounded-full">
                <Wallet className="text-brand size-5" />
              </span>
              <h3 className="mt-5 font-bold text-white">Buy Crypto from ₦2,000</h3>
              <p className="text-dim mt-2 text-sm leading-relaxed">
                Start your crypto journey with as little as 2,000 cNGN. Buy Bitcoin, Ethereum, and
                more with instant settlement.
              </p>

              <div className="border-edge bg-band mt-5 flex items-center gap-3 rounded-xl border px-4 py-3">
                <span className="text-sm font-bold text-white">1 cNGN</span>
                <span className="text-dim text-sm">=</span>
                <span className="text-brand text-sm font-bold">₦1.0001</span>
                <span className="bg-brand/15 text-brand ml-auto flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px]">
                  <span className="bg-brand size-1.5 rounded-full" />
                  Live
                </span>
              </div>

              <div className="text-dim mt-3 flex justify-between text-[11px]">
                <span>Stablecoin pegged 1:1 to NGN</span>
                <span>Updated 3:35:14 PM</span>
              </div>
            </div>

            <ul className="space-y-2 sm:pt-2">
              {ticker.map(({ label, amount }) => (
                <li
                  key={label}
                  className="border-edge bg-band flex items-center gap-2 rounded-lg border px-3 py-2.5"
                >
                  <span className="bg-brand size-1.5 shrink-0 rounded-full" />
                  <span className="text-sm text-white">{label}</span>
                  <span className="text-dim ml-auto text-sm">{amount}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Tile
          icon={CreditCard}
          tint="bg-amber-500/15"
          title="Pay Bills Instantly"
          blurb="Airtime, data, electricity, cable TV. Pay all your bills directly with cNGN."
        >
          <div className="mt-4 flex flex-wrap gap-2">
            {['MTN', 'Airtel', 'DSTV', 'IKEDC'].map((b) => (
              <Chip key={b}>{b}</Chip>
            ))}
          </div>
        </Tile>

        <Tile
          icon={Building2}
          title="Business Payments"
          blurb="Accept cNGN payments. Perfect for SMEs looking to expand across Africa."
        >
          <Metric value="0.5% fees" label="lowest in market" />
        </Tile>

        <Tile
          icon={Zap}
          title="Instant Settlement"
          blurb="No more waiting. Receive your funds in seconds, not days."
        >
          <Metric value="<30s" label="avg. settlement" />
        </Tile>

        <Tile
          icon={ShieldCheck}
          title="Bank-Grade Security"
          blurb="Your funds are protected with enterprise-level security and insurance."
        >
          <div className="mt-4 flex flex-wrap gap-2">
            <Chip>CBN Licensed</Chip>
            <Chip>Insured</Chip>
          </div>
        </Tile>

        <Tile
          icon={Globe}
          title="Pan-African Reach"
          blurb={`Send money across ${supportedCountryCount} African countries with zero forex headaches.`}
        >
          <div className="mt-4 flex flex-wrap gap-2">
            {supportedCountryCodes.map((c) => (
              <span
                key={c}
                className="bg-brand/15 text-brand rounded px-2 py-0.5 text-[11px] font-bold"
              >
                {c}
              </span>
            ))}
          </div>
        </Tile>
      </div>
    </section>
  )
}
