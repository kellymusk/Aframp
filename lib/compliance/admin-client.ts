/**
 * Browser client for the compliance admin API.
 *
 * Server-only modules (stores, providers, node:crypto) must never be pulled
 * into this bundle, so this file imports types only — same discipline as
 * lib/orders/order-client.ts.
 *
 * Token handling:
 *   The analyst's bearer token is held in sessionStorage, not localStorage, so
 *   it dies with the tab rather than persisting on a shared machine.  This is a
 *   stopgap, not a design — a token readable by any script on the origin is one
 *   XSS away from exposure.  It exists because Aframp has no session
 *   infrastructure yet; the destination is an httpOnly session cookie issued by
 *   a real login.  See the header of lib/compliance/admin-auth.ts.
 */

import type {
  ComplianceCase,
  Jurisdiction,
  SarRecord,
  CaseStatus,
  SarStatus,
} from './types'
import type { JurisdictionPolicy } from './config'

const TOKEN_KEY = 'aframp.compliance.token'

// ---------------------------------------------------------------------------
// Token
// ---------------------------------------------------------------------------
//
// sessionStorage is an external store, so it is exposed as one —
// subscribe/getSnapshot, consumed with useSyncExternalStore.  Mirroring it into
// component state via an effect would mean rendering once with the wrong value
// and correcting it, which is both a cascading render and a visible flash of
// the sign-in form for an analyst who is already signed in.

const listeners = new Set<() => void>()

/** Subscribes to token changes.  Returns an unsubscribe function. */
export function subscribeToToken(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function emitTokenChange(): void {
  for (const listener of listeners) listener()
}

/**
 * Current token, or null.
 *
 * Returns a primitive rather than an object so useSyncExternalStore can compare
 * snapshots by identity without an infinite re-render loop.
 */
export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.sessionStorage.getItem(TOKEN_KEY)
}

/** Server snapshot — there is no session storage during SSR. */
export function getServerTokenSnapshot(): string | null {
  return null
}

export function setStoredToken(token: string): void {
  window.sessionStorage.setItem(TOKEN_KEY, token)
  emitTokenChange()
}

export function clearStoredToken(): void {
  window.sessionStorage.removeItem(TOKEN_KEY)
  emitTokenChange()
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class AdminApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'AdminApiError'
    this.status = status
  }

  /** True when the token was missing, wrong, or the console is unprovisioned. */
  get isAuthError(): boolean {
    return this.status === 401 || this.status === 403
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getStoredToken()
  if (!token) throw new AdminApiError(401, 'Not signed in')

  const response = await fetch(path, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    let message = `Request failed with ${response.status}`
    try {
      const body = await response.json()
      message = body.message ?? body.error ?? message
    } catch {
      // Non-JSON error body — keep the status-derived message.
    }
    throw new AdminApiError(response.status, message)
  }

  return (await response.json()) as T
}

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

export interface CaseStats {
  byStatus: Record<CaseStatus, number>
  total: number
  overdueFilings: number
}

export interface ListCasesResponse {
  cases: ComplianceCase[]
  total: number
  stats: CaseStats
}

export interface CaseFilters {
  status?: CaseStatus
  jurisdiction?: Jurisdiction
  assignedTo?: string
  userId?: string
  minRiskScore?: number
  limit?: number
  offset?: number
}

export function listCases(filters: CaseFilters = {}): Promise<ListCasesResponse> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  return request<ListCasesResponse>(`/api/admin/compliance/cases?${params}`)
}

export function getCase(
  caseId: string
): Promise<{ case: ComplianceCase; retentionExpiresAt: string }> {
  return request(`/api/admin/compliance/cases/${encodeURIComponent(caseId)}`)
}

export type CaseAction =
  | { action: 'assign' }
  | { action: 'note'; note: string }
  | {
      action: 'decide'
      status: 'CLEARED' | 'CONFIRMED_SUSPICIOUS' | 'ESCALATED'
      disposition?: 'FALSE_POSITIVE' | 'TRUE_POSITIVE' | 'INCONCLUSIVE'
      rationale: string
    }
  | { action: 'reopen'; reason: string }

export function actOnCase(
  caseId: string,
  action: CaseAction
): Promise<{ case: ComplianceCase }> {
  return request(`/api/admin/compliance/cases/${encodeURIComponent(caseId)}`, {
    method: 'PATCH',
    body: JSON.stringify(action),
  })
}

// ---------------------------------------------------------------------------
// SARs
// ---------------------------------------------------------------------------

export interface ListSarsResponse {
  sars: SarRecord[]
  jurisdictions: Record<Jurisdiction, JurisdictionPolicy>
}

export function listSars(
  filters: { status?: SarStatus; jurisdiction?: Jurisdiction; overdueOnly?: boolean } = {}
): Promise<ListSarsResponse> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  return request<ListSarsResponse>(`/api/admin/compliance/sars?${params}`)
}

export function draftSar(caseId: string, narrative: string): Promise<{ sar: SarRecord }> {
  return request('/api/admin/compliance/sars', {
    method: 'POST',
    body: JSON.stringify({ action: 'draft', caseId, narrative }),
  })
}

export function advanceSar(
  sarId: string,
  status: Exclude<SarStatus, 'DRAFT'>,
  regulatorReference?: string
): Promise<{ sar: SarRecord }> {
  return request('/api/admin/compliance/sars', {
    method: 'POST',
    body: JSON.stringify({ action: 'advance', sarId, status, regulatorReference }),
  })
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export interface HealthResponse {
  status: 'OK' | 'DEGRADED' | 'CRITICAL'
  checks: {
    sanctionsList: {
      loaded: boolean
      generatedAt: string | null
      ageDays: number | null
      entityCount: number
      addressCount: number
      stale: boolean
    }
    providers: { wallet: string; name: string; localOnly: boolean }
    policy: { failClosed: boolean; hashSaltConfigured: boolean }
    queue: { openCases: number; overdueFilings: number }
  }
}

export function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>('/api/admin/compliance/health')
}
