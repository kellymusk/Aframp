'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { redirect } from 'next/navigation'
import {
  api,
  isOffline,
  setUnauthorizedHandler,
  type AuthResponse,
  type LoginResult,
  type Me,
  type OtpChallengeResponse,
} from '@/lib/api'

// #633: the bearer token is stored in an HTTP-only cookie via /api/session,
// not in localStorage. After the one-time POST at sign-in, client JS never
// reads it again: GET /api/session returns only presence flags, and
// middleware.ts attaches the Authorization header server-side for `/backend/*`.
// (The token does pass through JS once, in the login/OTP response, on its way
// to the POST that stores it.)

/** Opaque stand-in for `token` in `api.*` calls. Not a credential; never sent. */
const SESSION_MARKER = 'httpOnly-cookie'

interface Session {
  /** Always SESSION_MARKER: tells `api.*` the call is authenticated. The real token is not available to JS. */
  token: string
  userId: string
  merchantId: string | null
}

interface SessionContextValue {
  session: Session | null
  /** False until the cookie has been read from the server — guards against redirecting on first paint. */
  ready: boolean
  signIn: (email: string, password: string) => Promise<LoginResult>
  /** Always a challenge — the account doesn't exist until `completeOtp` succeeds. */
  signUp: (
    email: string,
    password: string,
    name: string,
    phoneNumber: string
  ) => Promise<OtpChallengeResponse>
  completeOtp: (challengeId: string, code: string) => Promise<void>
  signOut: () => void
  /** Re-fetches /me and updates any cached profile data. Returns a discriminated
   * union so callers can distinguish between success, network errors, and auth
   * failures (401). Auth failures are not caught — they propagate to trigger
   * signOut via the unauthorized handler. */
  refreshMe: () => Promise<{ success: true; data: Me } | { success: false; reason: 'network' }>
  /** Latest profile data from /me, if fetched. */
  me: Me | null
}

const SessionContext = createContext<SessionContextValue | null>(null)

function toSession(response: AuthResponse): Session {
  return {
    token: SESSION_MARKER,
    userId: response.user_id,
    merchantId: response.merchant_id,
  }
}

/** Persist the session to the HTTP-only cookie via the API route. */
async function persistCookie(auth: AuthResponse): Promise<void> {
  await fetch('/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: auth.token,
      userId: auth.user_id,
      merchantId: auth.merchant_id,
    }),
  })
}

/** Clear the HTTP-only cookie. */
async function clearCookie(): Promise<void> {
  await fetch('/api/session', { method: 'DELETE' })
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [me, setMe] = useState<Me | null>(null)

  // #633: on mount, ask /api/session (GET) whether an HTTP-only cookie session
  // exists. It returns presence flags only, never the token.
  useEffect(() => {
    fetch('/api/session')
      .then(
        (res) =>
          res.json() as Promise<{
            authenticated?: boolean
            userId?: string
            merchantId?: string | null
          }>
      )
      .then((stored) => {
        if (stored?.authenticated && stored.userId) {
          setSession({
            token: SESSION_MARKER,
            userId: stored.userId,
            merchantId: stored.merchantId ?? null,
          })
        }
      })
      .catch(() => {
        // Network error on startup — start with no session.
      })
      .finally(() => setReady(true))
  }, [])

  const persist = useCallback(async (auth: AuthResponse) => {
    setSession(toSession(auth))
    try {
      await persistCookie(auth)
    } catch {
      // Best-effort: the session still works for this tab if the cookie write fails.
    }
  }, [])

  const signIn = useCallback(
    async (email: string, password: string) => {
      const result = await api.login(email, password)
      // Only a legacy no-phone account gets a session straight away; a
      // challenge means the caller still has to route to `/verify`.
      if ('token' in result) await persist(result)
      return result
    },
    [persist]
  )

  const signUp = useCallback(
    (email: string, password: string, name: string, phoneNumber: string) => {
      return api.signup(email, password, name, phoneNumber)
    },
    []
  )

  const completeOtp = useCallback(
    async (challengeId: string, code: string) => {
      await persist(await api.verifyOtp(challengeId, code))
    },
    [persist]
  )

  const signOut = useCallback(() => {
    // The cookie must outlive the logout call: middleware reads it to
    // authenticate that request, so clear it only once logout has settled.
    const loggedOut = session ? api.logout(session.token).catch(() => {}) : Promise.resolve()
    loggedOut.then(() => clearCookie()).catch(() => {})
    setSession(null)
    setMe(null)
  }, [session])

  const refreshMe = useCallback(async () => {
    if (!session) {
      throw new Error('refreshMe called without a session')
    }
    try {
      const data = await api.getMe(session.token)
      setMe(data)
      return { success: true as const, data }
    } catch (cause) {
      // Network errors (status 0) are recoverable — report them without sign-out.
      // Auth errors (401) are not caught here; they propagate to trigger the
      // unauthorized handler in lib/api.ts, which calls signOut.
      if (isOffline(cause)) {
        return { success: false as const, reason: 'network' as const }
      }
      throw cause
    }
  }, [session])

  useEffect(() => {
    setUnauthorizedHandler(signOut)
    return () => setUnauthorizedHandler(null)
  }, [signOut])

  const value = useMemo(
    () => ({ session, ready, signIn, signUp, completeOtp, signOut, refreshMe, me }),
    [session, ready, signIn, signUp, completeOtp, signOut, refreshMe, me]
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const context = useContext(SessionContext)
  if (!context) throw new Error('useSession must be used inside <SessionProvider>')
  return context
}

export function useAuthenticatedSession(): Session {
  const { session } = useSession()
  if (!session) redirect('/login')
  return session
}
