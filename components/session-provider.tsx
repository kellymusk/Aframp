'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { redirect } from 'next/navigation'
import { mutate as clearSwrCache } from 'swr'
import {
  api,
  isOffline,
  setUnauthorizedHandler,
  type AuthResponse,
  type LoginResult,
  type Me,
  type OtpChallengeResponse,
} from '@/lib/api'

// #633: token is now stored in an HTTP-only cookie via /api/session,
// not in localStorage. No token is ever readable by client-side JS.

/** #635: cap how long sign-out waits for the server-side logout to complete. */
const LOGOUT_TIMEOUT_MS = 5000

type MeResult = { success: true; data: Me } | { success: false; reason: 'network' }

interface Session {
  token: string
  userId: string
  merchantId: string | null
}

interface SessionContextValue {
  session: Session | null
  /** False until the cookie has been read from the server — guards against redirecting on first paint. */
  ready: boolean
  /** True while a sign-out request is in-flight (server logout not yet confirmed). */
  signingOut: boolean
  signIn: (email: string, password: string) => Promise<LoginResult>
  /** Always a challenge — the account doesn't exist until `completeOtp` succeeds. */
  signUp: (
    email: string,
    password: string,
    name: string,
    phoneNumber: string
  ) => Promise<OtpChallengeResponse>
  completeOtp: (challengeId: string, code: string) => Promise<void>
  signOut: () => Promise<void>
  /** Re-fetches /me and updates any cached profile data. Returns a discriminated
   * union so callers can distinguish between success, network errors, and auth
   * failures (401). Auth failures are not caught — they propagate to trigger
   * signOut via the unauthorized handler. */
  refreshMe: () => Promise<MeResult>
  /** Latest profile data from /me, if fetched. Loaded once per session; read it from here rather than calling `api.getMe`. */
  me: Me | null
  /** True from sign-in until the first /me request settles. */
  meLoading: boolean
  /** Why the latest /me request failed, if it did. Cleared on the next attempt. */
  meError: unknown
}

const SessionContext = createContext<SessionContextValue | null>(null)

function toSession(response: AuthResponse): Session {
  return {
    token: response.token,
    userId: response.user_id,
    merchantId: response.merchant_id,
  }
}

/** Persist the session to the HTTP-only cookie via the API route. */
async function persistCookie(next: Session): Promise<void> {
  await fetch('/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(next),
  })
}

/** Clear the HTTP-only cookie. */
async function clearCookie(): Promise<void> {
  await fetch('/api/session', { method: 'DELETE' })
}

/** #635: resolve after `promise` settles or after `ms`, whichever comes first. */
function withTimeout(promise: Promise<unknown>, ms: number): Promise<void> {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms)
    promise.then(
      () => {
        clearTimeout(timer)
        resolve()
      },
      () => {
        clearTimeout(timer)
        resolve()
      }
    )
  })
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [me, setMe] = useState<Me | null>(null)
  const [meError, setMeError] = useState<unknown>(null)
  const meRequest = useRef<Promise<MeResult> | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  // #633: on mount, read the session from the HTTP-only cookie via
  // /api/session (GET). This replaces the localStorage read.
  useEffect(() => {
    fetch('/api/session')
      .then((res) => res.json() as Promise<Session | null>)
      .then((stored) => {
        if (stored?.token) setSession(stored)
      })
      .catch(() => {
        // Network error on startup — start with no session.
      })
      .finally(() => setReady(true))
  }, [])

  const persist = useCallback(async (next: Session) => {
    setSession(next)
    try {
      await persistCookie(next)
    } catch {
      // Best-effort: the session still works for this tab if the cookie write fails.
    }
  }, [])

  const signIn = useCallback(
    async (email: string, password: string) => {
      const result = await api.login(email, password)
      // Only a legacy no-phone account gets a session straight away; a
      // challenge means the caller still has to route to `/verify`.
      if ('token' in result) await persist(toSession(result))
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
      await persist(toSession(await api.verifyOtp(challengeId, code)))
    },
    [persist]
  )

  const signOut = useCallback(async () => {
    // #635: await the server-side logout so the token is invalidated before we
    // drop local state. A short timeout prevents a hanging request from
    // blocking sign-out indefinitely.
    setSigningOut(true)
    try {
      if (session) {
        await withTimeout(
          api.logout(session.token).catch(() => {}),
          LOGOUT_TIMEOUT_MS
        )
      }
      await withTimeout(
        clearCookie().catch(() => {}),
        LOGOUT_TIMEOUT_MS
      )
    } finally {
      setSession(null)
      setMe(null)
      setMeError(null)
      // Cached page data belongs to the signed-out user; don't show it to the next one.
      void clearSwrCache(() => true, undefined, { revalidate: false })
      setSigningOut(false)
    }
  }, [session])

  const refreshMe = useCallback((): Promise<MeResult> => {
    if (!session) {
      return Promise.reject(new Error('refreshMe called without a session'))
    }
    // Callers that ask while a request is already in flight share it, so a page
    // load never costs more than one /me.
    if (!meRequest.current) {
      setMeError(null)
      meRequest.current = api
        .getMe(session.token)
        .then((data): MeResult => {
          setMe(data)
          return { success: true, data }
        })
        .catch((cause: unknown) => {
          setMeError(cause)
          // Network errors (status 0) are recoverable — report them without sign-out.
          // Auth errors (401) are not caught here; they propagate to trigger the
          // unauthorized handler in lib/api.ts, which calls signOut.
          if (isOffline(cause)) return { success: false, reason: 'network' }
          throw cause
        })
        .finally(() => {
          meRequest.current = null
        })
    }
    return meRequest.current
  }, [session])

  // Everything that needs the profile (sidebar, Cash out, Settings, the admin
  // gate) reads it from context, so fetch it once when the session starts.
  const token = session?.token
  useEffect(() => {
    if (!token) return
    refreshMe().catch(() => {
      // Surfaced through `meError`.
    })
    // `refreshMe` changes with `session`; the token is the only part that matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    setUnauthorizedHandler(signOut)
    return () => setUnauthorizedHandler(null)
  }, [signOut])

  const meLoading = session !== null && me === null && meError === null

  const value = useMemo(
    () => ({
      session,
      ready,
      signingOut,
      signIn,
      signUp,
      completeOtp,
      signOut,
      refreshMe,
      me,
      meLoading,
      meError,
    }),
    [
      session,
      ready,
      signingOut,
      signIn,
      signUp,
      completeOtp,
      signOut,
      refreshMe,
      me,
      meLoading,
      meError,
    ]
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
