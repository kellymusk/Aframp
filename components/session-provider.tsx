'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, setUnauthorizedHandler, type AuthResponse, type Session } from '@/lib/api'
import { connectFreighter, signChallengeTransaction } from '@/lib/freighter'

interface SessionContextValue {
  session: Session | null
  /** False until session cookie has been validated — guards against redirecting on first paint. */
  ready: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  /** SEP-0010: connect Freighter, sign the backend's challenge, exchange for a session. */
  signInWithFreighter: () => Promise<void>
  signOut: () => void
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

  useEffect(() => {
    async function restoreSession() {
      try {
        const result = await api.getSession()
        if (result.session) {
          setSession(result.session)
        }
      } catch {
        // Session restoration failed, user will need to log in
      }
      setReady(true)
    }
    restoreSession()
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    setSession(toSession(await api.login(email, password)))
  }, [])

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    setSession(toSession(await api.signup(email, password, name)))
  }, [])

  const signInWithFreighter = useCallback(async () => {
    const address = await connectFreighter()
    const challenge = await api.getStellarChallenge(address)
    const signedTransaction = await signChallengeTransaction(
      challenge.transaction,
      challenge.network_passphrase
    )
    setSession(toSession(await api.verifyStellarChallenge(signedTransaction)))
  }, [])

  const signOut = useCallback(() => {
    void api.logout().catch(() => {
      // Logout failed, but clear session anyway
    })
    setSession(null)
  }, [])

  // Tokens expire after 24h with no refresh path, so drop the session on any
  // 401 from an authenticated call — the route guards handle the redirect.
  useEffect(() => {
    setUnauthorizedHandler(signOut)
    return () => setUnauthorizedHandler(null)
  }, [signOut])

  const value = useMemo(
    () => ({ session, ready, signIn, signUp, signInWithFreighter, signOut }),
    [session, ready, signIn, signUp, signInWithFreighter, signOut]
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
