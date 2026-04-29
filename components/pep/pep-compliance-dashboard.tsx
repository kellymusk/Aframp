'use client'

import { useEffect, useState } from 'react'
import { ShieldAlert, CheckCircle2, Clock, AlertTriangle, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AuditLogEntry, EddRecord, PepMatch, PepScreeningResult } from '@/lib/pep/types'
import { toast } from 'sonner'

const RISK_BADGE: Record<string, string> = {
  low: 'bg-green-500/15 text-green-700 dark:text-green-400',
  medium: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
  high: 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
  critical: 'bg-destructive/15 text-destructive',
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-500/15 text-yellow-700',
  in_review: 'bg-blue-500/15 text-blue-700',
  approved: 'bg-green-500/15 text-green-700',
  rejected: 'bg-destructive/15 text-destructive',
}

export function PepComplianceDashboard() {
  const [results, setResults] = useState<PepScreeningResult[]>([])
  const [eddList, setEddList] = useState<EddRecord[]>([])
  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([])
  const [tab, setTab] = useState<'results' | 'edd' | 'audit'>('results')
  const [reviewModal, setReviewModal] = useState<PepScreeningResult | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [eddModal, setEddModal] = useState<EddRecord | null>(null)

  const load = async () => {
    const [r, e, a] = await Promise.all([
      fetch('/api/pep/screen?wallet=ALL').then((res) => res.json() as Promise<PepScreeningResult[]>).catch((): PepScreeningResult[] => []),
      fetch('/api/pep/edd').then((res) => res.json() as Promise<EddRecord[]>).catch((): EddRecord[] => []),
      fetch('/api/pep/audit').then((res) => res.json() as Promise<AuditLogEntry[]>).catch((): AuditLogEntry[] => []),
    ])
    setResults(Array.isArray(r) ? r : [])
    setEddList(Array.isArray(e) ? e : [])
    setAuditEntries(Array.isArray(a) ? a : [])
  }

  useEffect(() => { load() }, [])

  const handleResolve = async (status: 'confirmed' | 'false_positive' | 'cleared') => {
    if (!reviewModal) return
    const res = await fetch('/api/pep/review', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resultId: reviewModal.id, status, reviewedBy: 'compliance-officer', note: reviewNote }),
    })
    if (res.ok) {
      toast.success(`Result marked as ${status}`)
      setReviewModal(null)
      setReviewNote('')
      load()
    } else {
      toast.error('Failed to update result')
    }
  }

  const handleEddUpdate = async (eddId: string, status: 'approved' | 'rejected', signOffBy: string) => {
    const res = await fetch('/api/pep/edd', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eddId, performedBy: signOffBy, status, signOffBy }),
    })
    if (res.ok) {
      toast.success(`EDD ${status}`)
      setEddModal(null)
      load()
    } else {
      toast.error('Failed to update EDD')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldAlert className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">PEP Compliance Dashboard</h2>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Screened', value: results.length, icon: CheckCircle2, color: 'text-primary' },
          { label: 'High / Critical', value: results.filter((r: PepScreeningResult) => r.riskLevel === 'high' || r.riskLevel === 'critical').length, icon: AlertTriangle, color: 'text-orange-500' },
          { label: 'Pending EDD', value: eddList.filter((e: EddRecord) => e.status === 'pending').length, icon: Clock, color: 'text-yellow-500' },
          { label: 'Audit Entries', value: auditEntries.length, icon: FileText, color: 'text-muted-foreground' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4">
            <Icon className={`w-5 h-5 mb-2 ${color}`} />
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {(['results', 'edd', 'audit'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {t === 'edd' ? 'EDD Tasks' : t === 'audit' ? 'Audit Log' : 'Screening Results'}
          </button>
        ))}
      </div>

      {/* Screening Results */}
      {tab === 'results' && (
        <div className="space-y-3">
          {results.length === 0 && <p className="text-sm text-muted-foreground">No screening results yet.</p>}
          {results.map((r: PepScreeningResult) => (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <p className="font-medium text-foreground truncate">{r.fullName}</p>
                <p className="text-xs text-muted-foreground font-mono">{r.walletAddress.slice(0, 12)}…</p>
                <p className="text-xs text-muted-foreground">{new Date(r.screenedAt).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${RISK_BADGE[r.riskLevel]}`}>
                  {r.riskLevel.toUpperCase()} · {r.riskScore}
                </span>
                <span className="text-xs text-muted-foreground">{r.matches.length} match(es)</span>
                {r.status === 'potential' && (
                  <Button size="sm" variant="outline" onClick={() => setReviewModal(r)}>
                    Review
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EDD Tasks */}
      {tab === 'edd' && (
        <div className="space-y-3">
          {eddList.length === 0 && <p className="text-sm text-muted-foreground">No pending EDD tasks.</p>}
          {eddList.map((e: EddRecord) => (
            <div key={e.id} className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <p className="font-mono text-sm text-foreground truncate">{e.walletAddress.slice(0, 16)}…</p>
                <p className="text-xs text-muted-foreground">Created {new Date(e.createdAt).toLocaleString()}</p>
                {e.sourceOfWealth && <p className="text-xs text-muted-foreground">SoW: {e.sourceOfWealth}</p>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_BADGE[e.status]}`}>
                  {e.status.replace('_', ' ').toUpperCase()}
                </span>
                {(e.status === 'pending' || e.status === 'in_review') && (
                  <Button size="sm" variant="outline" onClick={() => setEddModal(e)}>
                    Sign Off
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Audit Log */}
      {tab === 'audit' && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {auditEntries.length === 0 && <p className="text-sm text-muted-foreground">No audit entries.</p>}
          {[...auditEntries].reverse().map((a: AuditLogEntry) => (
            <div key={a.id} className="flex items-start gap-3 text-xs border-b border-border pb-2">
              <span className="text-muted-foreground shrink-0 font-mono">
                {new Date(a.timestamp).toLocaleTimeString()}
              </span>
              <span className="font-medium text-foreground shrink-0">{a.action.replace(/_/g, ' ')}</span>
              <span className="text-muted-foreground truncate">{a.detail}</span>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold text-foreground">Review Screening Result</h3>
            <p className="text-sm text-muted-foreground">
              <strong>{reviewModal.fullName}</strong> — Risk score {reviewModal.riskScore} ({reviewModal.riskLevel})
            </p>
            {reviewModal.matches.map((m: PepMatch) => (
              <div key={m.candidate.id} className="text-xs bg-muted/30 rounded-lg p-3 space-y-1">
                <p className="font-medium">{m.candidate.fullName} — {m.candidate.position}</p>
                <p className="text-muted-foreground">Similarity: {(m.similarityScore * 100).toFixed(1)}% · Risk: {m.riskScore}</p>
              </div>
            ))}
            <textarea
              placeholder="Review note (required for compliance record)…"
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={3}
            />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleResolve('false_positive')} className="flex-1">False Positive</Button>
              <Button size="sm" variant="destructive" onClick={() => handleResolve('confirmed')} className="flex-1">Confirm PEP</Button>
              <Button size="sm" variant="ghost" onClick={() => setReviewModal(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* EDD Sign-off Modal */}
      {eddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold text-foreground">EDD Sign-off</h3>
            <p className="text-sm text-muted-foreground font-mono">{eddModal.walletAddress}</p>
            <p className="text-xs text-muted-foreground">Senior management sign-off required before account approval.</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleEddUpdate(eddModal.id, 'approved', 'senior-compliance')} className="flex-1">Approve</Button>
              <Button size="sm" variant="destructive" onClick={() => handleEddUpdate(eddModal.id, 'rejected', 'senior-compliance')} className="flex-1">Reject</Button>
              <Button size="sm" variant="ghost" onClick={() => setEddModal(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
