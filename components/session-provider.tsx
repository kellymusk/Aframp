'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  api,
  setUnauthorizedHandler,
  type AuthResponse,
  type LoginResult,
  type Me,
  type OtpChallengeResponse,
} from '@/lib/api'

const STORAGE_KEY = 'aframp.session'

interface Session {
  token: string
  userId: string
  merchantId: string | null
}

interface SessionContextValue {
  session: Session | null
  /** False until localStorage has been read — guards against redirecting on first paint. */
  ready: boolean
  /** Returns the raw result so the caller can branch: a session (legacy
   * no-phone accounts) vs a challenge (everyone else) that needs `/verify`. */
  signIn: (email: string, password: string) => Promise<LoginResult>
  /** Always a challenge — the account doesn't exist until `completeOtp` succeeds. */
  signUp: (email: string, password: string, name: string, phoneNumber: string) => Promise<OtpChallengeResponse>
  completeOtp: (challengeId: string, code: string) => Promise<void>
  signOut: () => void
  /** Re-fetches /me and updates any cached profile data. */
  refreshMe: () => Promise<Me | null>
  /** Latest profile data from /me, if fetched. */
  me: Me | null
}

const SessionContext = createContext<SessionContextValue | null>(null)

function toSession(response: AuthResponse): Session {
  return {
    token: response.token,
    userId: response.user_id,
    merchantId: response.merchant_id,
  }
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [me, setMe] = useState<Me | null>(null)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) setSession(JSON.parse(stored) as Session)
    } catch {
      window.localStorage.removeItem(STORAGE_KEY)
    }
    setReady(true)
  }, [])

  const persist = useCallback((next: Session) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Storage may be unavailable (private mode, quota, blocked) — the
      // session still works for this tab, it just won't survive a reload.
    }
    setSession(next)
  }, [])

  const signIn = useCallback(
    async (email: string, password: string) => {
      const result = await api.login(email, password)
      // Only a legacy no-phone account gets a session straight away; a
      // challenge means the caller still has to route to `/verify`.
      if ('token' in result) persist(toSession(result))
      return result
    },
    [persist]
  )

  const signUp = useCallback((email: string, password: string, name: string, phoneNumber: string) => {
    return api.signup(email, password, name, phoneNumber)
  }, [])

  const completeOtp = useCallback(
    async (challengeId: string, code: string) => {
      persist(toSession(await api.verifyOtp(challengeId, code)))
    },
    [persist]
  )

  const signOut = useCallback(() => {
    // Best-effort: a failed logout call shouldn't block clearing the local
    // session, but it's the only thing that clears the server-side cookie.
    if (session) api.logout(session.token).catch(() => {})
    window.localStorage.removeItem(STORAGE_KEY)
    setSession(null)
    setMe(null)
  }, [session])

  const refreshMe = useCallback(async () => {
    if (!session) return null
    try {
      const data = await api.getMe(session.token)
      setMe(data)
      return data
    } catch {
      return null
    }
  }, [session])

  // Tokens expire after 24h with no refresh path, so drop the session on any
  // 401 from an authenticated call — the route guards handle the redirect.
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

/**
 * For screens that cannot render without a token. The `(app)` layout guarantees
 * one exists before mounting children, so this narrows the type for them.
 */
export function useAuthenticatedSession(): Session {
  const { session } = useSession()
  if (!session) throw new Error('This screen requires a signed-in merchant')
  return session
}