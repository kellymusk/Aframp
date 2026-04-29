'use client'

import { AlertTriangle, CheckCircle2, Clock, ShieldAlert } from 'lucide-react'
import type { PepScreeningResult } from '@/lib/pep/types'

const LEVEL_CONFIG = {
  low: { icon: CheckCircle2, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10 border-green-500/20', label: 'Low Risk' },
  medium: { icon: Clock, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', label: 'Medium Risk' },
  high: { icon: AlertTriangle, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', label: 'High Risk — EDD Required' },
  critical: { icon: ShieldAlert, color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20', label: 'Critical — Senior Sign-off Required' },
}

interface PepAlertBannerProps {
  result: PepScreeningResult
}

export function PepAlertBanner({ result }: PepAlertBannerProps) {
  if (result.riskLevel === 'low' && result.matches.length === 0) return null

  const cfg = LEVEL_CONFIG[result.riskLevel]
  const Icon = cfg.icon

  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${cfg.bg}`} role="alert">
      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${cfg.color}`} />
      <div className="space-y-1">
        <p className={`font-semibold ${cfg.color}`}>{cfg.label}</p>
        <p className="text-muted-foreground">
          {result.matches.length} potential PEP match{result.matches.length !== 1 ? 'es' : ''} found
          for <span className="font-medium text-foreground">{result.fullName}</span>.
          {result.requiresEdd && ' Enhanced Due Diligence has been initiated.'}
        </p>
        {result.matches[0] && (
          <p className="text-xs text-muted-foreground">
            Top match: <span className="font-mono">{result.matches[0].candidate.fullName}</span>
            {' '}({result.matches[0].candidate.position}, {result.matches[0].candidate.country})
            — similarity {(result.matches[0].similarityScore * 100).toFixed(0)}%
          </p>
        )}
      </div>
    </div>
  )
}
