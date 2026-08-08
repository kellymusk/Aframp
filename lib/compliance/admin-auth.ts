/**
 * Admin authentication for the compliance console.
 *
 * ⚠️  This is a deliberately minimal guard, and it is **not** sufficient on its
 *     own for production.
 *
 *     Aframp has no user authentication system today — identity everywhere else
 *     in the app is a wallet address, which is a claim, not a credential.  The
 *     compliance console cannot wait for that: it exposes customer names,
 *     account identifiers and sanctions determinations, so shipping it with no
 *     gate at all would be worse than shipping nothing.
 *
 *     So this implements shared-secret bearer tokens with per-analyst identity,
 *     which is enough to (a) keep the console off the public internet and
 *     (b) attribute every case decision to a named human, which is the part the
 *     audit trail genuinely depends on.
 *
 *     Before this console handles real customer data it needs, at minimum:
 *       - real per-user accounts with individually revocable credentials
 *       - mandatory MFA (an AML console is a high-value target)
 *       - session expiry and idle timeout
 *       - alerting on bulk case reads, which is how insider misuse presents
 *     Tracked in docs/AML_COMPLIANCE.md § Known gaps.
 *
 * Token format in COMPLIANCE_ADMIN_TOKENS:  analystId:token,analystId:token
 * e.g.  ada.okafor:s3cr3t-1,ben.mwangi:s3cr3t-2
 */

import { timingSafeEqual } from 'node:crypto'
import type { NextRequest } from 'next/server'

export interface AdminIdentity {
  /** Analyst id recorded as the actor on every case event. */
  analystId: string
}

export type AuthResult =
  | { ok: true; identity: AdminIdentity }
  | { ok: false; status: 401 | 403; error: string }

/**
 * Authenticates an admin request from its `Authorization: Bearer` header.
 *
 * Returns a result rather than throwing so route handlers keep their error
 * shape consistent with the rest of the API.
 */
export function authenticateAdmin(request: NextRequest): AuthResult {
  const configured = parseTokens(process.env.COMPLIANCE_ADMIN_TOKENS)

  // No tokens configured means the console is not provisioned.  Denying is the
  // only safe reading: an empty allowlist that admits everyone is how staging
  // configuration becomes a production breach.
  if (configured.size === 0) {
    return {
      ok: false,
      status: 403,
      error: 'Compliance console is not provisioned (COMPLIANCE_ADMIN_TOKENS unset)',
    }
  }

  const header = request.headers.get('authorization') ?? ''
  const [scheme, token] = header.split(' ')

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return { ok: false, status: 401, error: 'Missing bearer token' }
  }

  for (const [analystId, expected] of configured) {
    if (constantTimeEquals(token, expected)) {
      return { ok: true, identity: { analystId } }
    }
  }

  return { ok: false, status: 401, error: 'Invalid token' }
}

function parseTokens(raw: string | undefined): Map<string, string> {
  const tokens = new Map<string, string>()
  if (!raw) return tokens

  for (const pair of raw.split(',')) {
    const trimmed = pair.trim()
    if (!trimmed) continue
    const separator = trimmed.indexOf(':')
    // Reject malformed entries rather than guessing an id — an analyst id that
    // silently defaults would attribute decisions to the wrong person.
    if (separator <= 0 || separator === trimmed.length - 1) continue
    tokens.set(trimmed.slice(0, separator), trimmed.slice(separator + 1))
  }

  return tokens
}

/**
 * Compares two secrets without leaking their contents through timing.
 *
 * Length is compared first and returns early, which does leak length — that is
 * accepted, and is why the tokens are expected to be long random strings rather
 * than anything guessable from their size.
 */
function constantTimeEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, 'utf8')
  const bufferB = Buffer.from(b, 'utf8')
  if (bufferA.length !== bufferB.length) return false
  return timingSafeEqual(bufferA, bufferB)
}
