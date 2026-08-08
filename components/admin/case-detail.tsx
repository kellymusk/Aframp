'use client'

/**
 * Case detail — the analyst's working view of one flagged transaction.
 *
 * Layout follows the order an analyst actually works in:
 *
 *   1. What fired, and how strongly       (signals, with their evidence)
 *   2. What has already been done         (audit trail)
 *   3. What I am doing about it           (actions)
 *
 * Every signal renders its own `metadata` verbatim.  That is deliberate: a
 * screening decision an analyst cannot reconstruct is one they cannot defend,
 * and hiding the observed values behind a friendly summary is how alert review
 * degrades into rubber-stamping.
 */

import { useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileWarning,
  Loader2,
  ShieldAlert,
  UserCheck,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  actOnCase,
  draftSar,
  type CaseAction,
} from '@/lib/compliance/admin-client'
import type { ComplianceCase, RiskLevel, RiskSignal } from '@/lib/compliance/types'

const RISK_STYLES: Record<RiskLevel, string> = {
  LOW: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  MEDIUM: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  HIGH: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  SEVERE: 'bg-red-500/10 text-red-600 border-red-500/20',
}

interface CaseDetailProps {
  record: ComplianceCase
  onBack: () => void
  onUpdated: (updated: ComplianceCase) => void
}

export function CaseDetail({ record, onBack, onUpdated }: CaseDetailProps) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [rationale, setRationale] = useState('')
  const [narrative, setNarrative] = useState('')
  const [sarDrafted, setSarDrafted] = useState(false)

  const closed = record.status === 'CLEARED' || record.status === 'CONFIRMED_SUSPICIOUS'

  async function run(label: string, action: () => Promise<void>) {
    setBusy(label)
    setError(null)
    try {
      await action()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Action failed')
    } finally {
      setBusy(null)
    }
  }

  const act = (label: string, action: CaseAction) =>
    run(label, async () => {
      const { case: updated } = await actOnCase(record.id, action)
      onUpdated(updated)
      if (action.action === 'note') setNote('')
      if (action.action === 'decide') setRationale('')
    })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Queue
        </Button>
        <span className="font-mono text-sm text-muted-foreground">{record.id}</span>
      </div>

      {/* ---- Summary ------------------------------------------------------ */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">
              {record.kind} · {formatUsd(record.amountCents)} {record.asset}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn('border', RISK_STYLES[record.riskLevel])}>
                {record.riskLevel} · {record.riskScore}
              </Badge>
              <Badge variant="secondary">{record.status.replace(/_/g, ' ')}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Field label="Account" value={record.userId} mono />
          <Field label="Transaction" value={record.transactionId} mono />
          <Field label="Jurisdiction" value={record.jurisdiction} />
          <Field label="Screening decision" value={record.decision} />
          <Field label="Opened" value={new Date(record.createdAt).toLocaleString()} />
          <Field
            label="Assigned to"
            value={record.assignedTo ?? 'Unassigned'}
          />
        </CardContent>
      </Card>

      {/* ---- Signals ------------------------------------------------------ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Why this was flagged ({record.signals.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {record.signals.map((signal, index) => (
            <SignalRow key={`${signal.code}-${index}`} signal={signal} />
          ))}
        </CardContent>
      </Card>

      {/* ---- Audit trail -------------------------------------------------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Audit trail</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          {record.events.map((event, index) => (
            <div key={index} className="flex gap-3 py-2 text-sm">
              <span className="w-36 shrink-0 text-xs text-muted-foreground">
                {new Date(event.at).toLocaleString()}
              </span>
              <div className="min-w-0">
                <span className="font-medium">{event.actor}</span>{' '}
                <span className="text-muted-foreground">
                  {event.action.toLowerCase().replace(/_/g, ' ')}
                </span>
                {event.detail && (
                  <p className="mt-0.5 break-words text-muted-foreground">{event.detail}</p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ---- Actions ------------------------------------------------------ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {error && (
            <p className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          {!record.assignedTo && !closed && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={busy !== null}
              onClick={() => act('assign', { action: 'assign' })}
            >
              {busy === 'assign' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserCheck className="h-4 w-4" />
              )}
              Assign to me
            </Button>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Add a note</label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Findings, customer contact, source-of-funds evidence…"
              rows={3}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={busy !== null || note.trim().length === 0}
              onClick={() => act('note', { action: 'note', note: note.trim() })}
            >
              {busy === 'note' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add note'}
            </Button>
          </div>

          {!closed && (
            <>
              <Separator />
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Decision rationale <span className="text-destructive">*</span>
                </label>
                <Textarea
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                  placeholder="Required. Explain what you checked and what you concluded."
                  rows={3}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={busy !== null || rationale.trim().length === 0}
                    onClick={() =>
                      act('clear', {
                        action: 'decide',
                        status: 'CLEARED',
                        disposition: 'FALSE_POSITIVE',
                        rationale: rationale.trim(),
                      })
                    }
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={busy !== null || rationale.trim().length === 0}
                    onClick={() =>
                      act('escalate', {
                        action: 'decide',
                        status: 'ESCALATED',
                        rationale: rationale.trim(),
                      })
                    }
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Escalate
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-1.5"
                    disabled={busy !== null || rationale.trim().length === 0}
                    onClick={() =>
                      act('confirm', {
                        action: 'decide',
                        status: 'CONFIRMED_SUSPICIOUS',
                        disposition: 'TRUE_POSITIVE',
                        rationale: rationale.trim(),
                      })
                    }
                  >
                    <ShieldAlert className="h-4 w-4" />
                    Confirm suspicious
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* A SAR is drafted against a case, so the form lives here rather
              than in a separate screen — the narrative is written while the
              evidence above is still on screen. */}
          {!record.sarId && !sarDrafted && (
            <>
              <Separator />
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Draft {record.jurisdiction} suspicious transaction report
                </label>
                <p className="text-xs text-muted-foreground">
                  The filing deadline runs from when this case was opened
                  ({new Date(record.createdAt).toLocaleString()}), not from now.
                </p>
                <Textarea
                  value={narrative}
                  onChange={(e) => setNarrative(e.target.value)}
                  placeholder="Who, what, when, and why it is suspicious. Minimum 50 characters."
                  rows={6}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={busy !== null || narrative.trim().length < 50}
                  onClick={() =>
                    run('sar', async () => {
                      await draftSar(record.id, narrative.trim())
                      setSarDrafted(true)
                      // Drafting also moves the case to CONFIRMED_SUSPICIOUS
                      // server-side, so re-read rather than patching locally.
                      const { case: updated } = await actOnCase(record.id, {
                        action: 'note',
                        note: 'SAR narrative drafted.',
                      })
                      onUpdated(updated)
                    })
                  }
                >
                  {busy === 'sar' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileWarning className="h-4 w-4" />
                  )}
                  Draft SAR
                </Button>
              </div>
            </>
          )}

          {(record.sarId || sarDrafted) && (
            <p className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
              SAR {record.sarId ?? '(drafted)'} is on file for this case.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SignalRow({ signal }: { signal: RiskSignal }) {
  const [open, setOpen] = useState(false)
  const hasEvidence = signal.metadata && Object.keys(signal.metadata).length > 0

  return (
    <div className="rounded-lg border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn('border text-xs', RISK_STYLES[signal.severity])}>
              {signal.severity}
            </Badge>
            <span className="font-mono text-xs text-muted-foreground">{signal.code}</span>
          </div>
          <p className="mt-1.5 text-sm">{signal.description}</p>
        </div>
        <span className="text-sm font-semibold tabular-nums">{signal.score}</span>
      </div>

      {hasEvidence && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="mt-2 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            {open ? 'Hide evidence' : 'Show evidence'}
          </button>
          {open && (
            <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-muted p-2 text-xs">
              {JSON.stringify(signal.metadata, null, 2)}
            </pre>
          )}
        </>
      )}
    </div>
  )
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <span className="text-muted-foreground">{label}</span>
      <p className={cn('truncate', mono && 'font-mono text-xs')} title={value}>
        {value}
      </p>
    </div>
  )
}

function formatUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}
