/**
 * GET /api/admin/compliance/health
 *
 * Reports whether the AML controls are actually operating, as opposed to
 * merely deployed.
 *
 * This endpoint exists because every failure mode in this module is silent by
 * nature.  Screening against a stale sanctions list, or against the development
 * fixture, produces clean results that look identical to genuinely clean ones.
 * A control that cannot be observed cannot be relied on, and "we didn't know it
 * had stopped working" is not a defence anyone has successfully run.
 *
 * 200 { status, checks }  — status is OK | DEGRADED | CRITICAL
 * 401 / 403 auth
 *
 * `status` is deliberately CRITICAL, not DEGRADED, when the list is a fixture:
 * that state means there is effectively no sanctions screening at all.
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticateAdmin } from '@/lib/compliance/admin-auth'
import { FAIL_CLOSED } from '@/lib/compliance/config'
import { isRunningOnLocalOnly } from '@/lib/compliance/providers'
import { getSnapshotStatus } from '@/lib/compliance/sanctions/list'
import { getCaseStats } from '@/lib/compliance/case-store'

/**
 * Days after which a sanctions snapshot is considered stale.
 *
 * OFAC and the UN amend their lists several times a week, and designations take
 * effect on publication — not on our next refresh — so a week-old list is a
 * week of transactions screened against the wrong corpus.
 */
const SNAPSHOT_STALE_DAYS = 7

export function GET(request: NextRequest) {
  const auth = authenticateAdmin(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const snapshot = getSnapshotStatus()
  const localOnly = isRunningOnLocalOnly()
  const stats = getCaseStats()

  const checks = {
    sanctionsList: {
      loaded: snapshot.loaded,
      generatedAt: snapshot.generatedAt,
      ageDays: snapshot.ageDays,
      entityCount: snapshot.entityCount,
      addressCount: snapshot.addressCount,
      stale: snapshot.ageDays != null && snapshot.ageDays > SNAPSHOT_STALE_DAYS,
    },
    providers: {
      wallet: process.env.COMPLIANCE_WALLET_PROVIDER ?? 'local',
      name: process.env.COMPLIANCE_NAME_PROVIDER ?? 'local',
      localOnly,
    },
    policy: {
      failClosed: FAIL_CLOSED,
      hashSaltConfigured: Boolean(process.env.COMPLIANCE_HASH_SALT),
    },
    queue: {
      openCases: stats.byStatus.OPEN + stats.byStatus.IN_REVIEW + stats.byStatus.ESCALATED,
      overdueFilings: stats.overdueFilings,
    },
  }

  // An overdue filing is a live regulatory breach, not a warning — it is graded
  // alongside the outright control failures.
  const critical =
    !checks.sanctionsList.loaded ||
    !checks.policy.hashSaltConfigured ||
    checks.queue.overdueFilings > 0

  const degraded = checks.sanctionsList.stale || localOnly || !FAIL_CLOSED

  const status = critical ? 'CRITICAL' : degraded ? 'DEGRADED' : 'OK'

  return NextResponse.json(
    { status, checks },
    { status: 200, headers: { 'Cache-Control': 'no-store, private' } }
  )
}
