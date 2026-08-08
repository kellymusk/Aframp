'use client'

/**
 * Compliance console — the internal review interface for flagged transactions.
 *
 * Three states: sign-in, queue, case detail.  Kept in one component because
 * they share the loaded case list and the token, and splitting them across
 * routes would mean re-fetching the queue every time an analyst closes a case —
 * the single most repeated action in the workflow.
 *
 * The health banner is not decoration.  Every failure mode in the AML module is
 * silent (see app/api/admin/compliance/health/route.ts), so the state of the
 * controls is shown on the same screen as the work rather than on a dashboard
 * nobody opens.
 */

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import {
  AlertOctagon,
  Filter,
  Loader2,
  LogOut,
  RefreshCcw,
  ShieldCheck,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { CaseDetail } from './case-detail'
import {
  AdminApiError,
  clearStoredToken,
  getHealth,
  getServerTokenSnapshot,
  getStoredToken,
  listCases,
  setStoredToken,
  subscribeToToken,
  type CaseStats,
  type HealthResponse,
} from '@/lib/compliance/admin-client'
import type { CaseStatus, ComplianceCase, Jurisdiction, RiskLevel } from '@/lib/compliance/types'

const RISK_STYLES: Record<RiskLevel, string> = {
  LOW: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  MEDIUM: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  HIGH: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  SEVERE: 'bg-red-500/10 text-red-600 border-red-500/20',
}

/** Queue statuses in the order they are worked, closed states last. */
const STATUS_FILTERS: Array<{ value: CaseStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_REVIEW', label: 'In review' },
  { value: 'ESCALATED', label: 'Escalated' },
  { value: 'CONFIRMED_SUSPICIOUS', label: 'Confirmed' },
  { value: 'CLEARED', label: 'Cleared' },
]

const JURISDICTIONS: Array<Jurisdiction | 'ALL'> = ['ALL', 'NG', 'KE', 'GH', 'ZA', 'UG']

export function ComplianceConsole() {
  // The token lives in sessionStorage, which is an external store — subscribed
  // to rather than mirrored into state, so signing in or out anywhere in the
  // tree re-renders this without a effect-driven correction pass.
  const token = useSyncExternalStore(
    subscribeToToken,
    getStoredToken,
    getServerTokenSnapshot
  )

  return token ? <Queue /> : <SignIn />
}

// ---------------------------------------------------------------------------
// Sign-in
// ---------------------------------------------------------------------------

function SignIn() {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)

    // Stored before verifying because the API client reads the token from
    // storage; a failed check clears it again below.
    setStoredToken(value.trim())
    try {
      // Verify against the health endpoint rather than trusting the input —
      // otherwise a wrong token shows an empty queue, which reads as "no cases"
      // rather than "not signed in".
      await getHealth()
      // No state update needed: the store emitted on write, and the console
      // re-rendered into the queue via useSyncExternalStore.
    } catch (caught) {
      clearStoredToken()
      setError(
        caught instanceof AdminApiError ? caught.message : 'Could not verify the token'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h1 className="font-semibold">Compliance console</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Enter your analyst access token. It is held for this tab only and
            cleared when you close it.
          </p>
          <form onSubmit={submit} className="space-y-3">
            <Input
              type="password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Access token"
              autoComplete="off"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy || !value.trim()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Queue
// ---------------------------------------------------------------------------

function Queue() {
  const [cases, setCases] = useState<ComplianceCase[]>([])
  const [stats, setStats] = useState<CaseStats | null>(null)
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [selected, setSelected] = useState<ComplianceCase | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [status, setStatus] = useState<CaseStatus | 'ALL'>('OPEN')
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction | 'ALL'>('ALL')
  const [userId, setUserId] = useState('')

  // Clearing the token emits to the store, which drops the console back to the
  // sign-in form — no local flag to keep in sync.
  const signOut = useCallback(() => {
    clearStoredToken()
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [caseResponse, healthResponse] = await Promise.all([
        listCases({
          status: status === 'ALL' ? undefined : status,
          jurisdiction: jurisdiction === 'ALL' ? undefined : jurisdiction,
          userId: userId.trim() || undefined,
          limit: 50,
        }),
        getHealth(),
      ])
      setCases(caseResponse.cases)
      setStats(caseResponse.stats)
      setHealth(healthResponse)
    } catch (caught) {
      // An expired or revoked token must drop the analyst back to sign-in
      // rather than showing an empty queue they might read as "all clear".
      if (caught instanceof AdminApiError && caught.isAuthError) {
        signOut()
        return
      }
      setError(caught instanceof Error ? caught.message : 'Could not load cases')
    } finally {
      setLoading(false)
    }
  }, [status, jurisdiction, userId, signOut])

  useEffect(() => {
    void load()
  }, [load])

  if (selected) {
    return (
      <CaseDetail
        record={selected}
        onBack={() => {
          setSelected(null)
          void load()
        }}
        onUpdated={(updated) => {
          setSelected(updated)
          setCases((current) => current.map((c) => (c.id === updated.id ? updated : c)))
        }}
      />
    )
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Transaction monitoring</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => void load()} className="gap-1.5">
            <RefreshCcw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5">
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </header>

      {health && health.status !== 'OK' && <HealthBanner health={health} />}

      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Open" value={stats.byStatus.OPEN} />
          <Stat label="In review" value={stats.byStatus.IN_REVIEW} />
          <Stat label="Escalated" value={stats.byStatus.ESCALATED} />
          <Stat
            label="Overdue filings"
            value={stats.overdueFilings}
            emphasis={stats.overdueFilings > 0}
          />
        </div>
      )}

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 pt-6">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {STATUS_FILTERS.map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant={status === option.value ? 'default' : 'outline'}
              onClick={() => setStatus(option.value)}
            >
              {option.label}
            </Button>
          ))}
          <select
            value={jurisdiction}
            onChange={(e) => setJurisdiction(e.target.value as Jurisdiction | 'ALL')}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            aria-label="Jurisdiction"
          >
            {JURISDICTIONS.map((code) => (
              <option key={code} value={code}>
                {code === 'ALL' ? 'All markets' : code}
              </option>
            ))}
          </select>
          <Input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Filter by account…"
            className="h-9 w-full sm:w-64"
          />
        </CardContent>
      </Card>

      {error && (
        <p className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {loading && cases.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : cases.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No cases match these filters.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {cases.map((record) => (
              <button
                key={record.id}
                type="button"
                onClick={() => setSelected(record)}
                className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
              >
                <Badge
                  variant="outline"
                  className={cn('border shrink-0', RISK_STYLES[record.riskLevel])}
                >
                  {record.riskScore}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {record.kind} · {formatUsd(record.amountCents)} {record.asset} ·{' '}
                    {record.jurisdiction}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {record.signals.map((s) => s.code).join(' · ') || 'No signals recorded'}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <Badge variant="secondary" className="text-xs">
                    {record.status.replace(/_/g, ' ')}
                  </Badge>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(record.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function HealthBanner({ health }: { health: HealthResponse }) {
  const { checks } = health
  const problems: string[] = []

  if (!checks.sanctionsList.loaded) {
    problems.push(
      'No sanctions snapshot is loaded — screening is running against development fixture data only.'
    )
  } else if (checks.sanctionsList.stale) {
    problems.push(
      `Sanctions list is ${checks.sanctionsList.ageDays} days old. Re-run the refresh job.`
    )
  }
  if (!checks.policy.hashSaltConfigured) {
    problems.push('COMPLIANCE_HASH_SALT is not set — counterparty monitoring cannot record.')
  }
  if (checks.providers.localOnly) {
    problems.push(
      `No commercial screening provider configured (wallet: ${checks.providers.wallet}, name: ${checks.providers.name}).`
    )
  }
  if (!checks.policy.failClosed) {
    problems.push('FAIL_CLOSED is disabled — provider outages will not hold transactions.')
  }
  if (checks.queue.overdueFilings > 0) {
    problems.push(
      `${checks.queue.overdueFilings} SAR${checks.queue.overdueFilings === 1 ? '' : 's'} past the filing deadline.`
    )
  }

  const critical = health.status === 'CRITICAL'

  return (
    <div
      className={cn(
        'rounded-lg border px-4 py-3',
        critical
          ? 'border-destructive/30 bg-destructive/10'
          : 'border-amber-500/30 bg-amber-500/10'
      )}
    >
      <div className="flex items-start gap-2">
        <AlertOctagon
          className={cn(
            'mt-0.5 h-4 w-4 shrink-0',
            critical ? 'text-destructive' : 'text-amber-600'
          )}
        />
        <div className="min-w-0 text-sm">
          <p className={cn('font-medium', critical ? 'text-destructive' : 'text-amber-700 dark:text-amber-400')}>
            Controls {health.status === 'CRITICAL' ? 'not fully operational' : 'degraded'}
          </p>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-muted-foreground">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  emphasis,
}: {
  label: string
  value: number
  emphasis?: boolean
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={cn(
            'mt-1 text-2xl font-semibold tabular-nums',
            emphasis && 'text-destructive'
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  )
}

function formatUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}
