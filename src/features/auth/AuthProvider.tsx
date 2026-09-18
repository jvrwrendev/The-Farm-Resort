import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from 'react'
import { ADMIN_SESSION_KEY } from '@/lib/constants'
import { buildAdminProfile, signInAdmin, type MockAdminUser } from '@/services/auth.service'
import type { Profile } from '@/types'

interface AuthContextType {
  user: MockAdminUser | null
  profile: Profile | null
  loading: boolean
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => void
  refreshProfile: () => Promise<void>
  refreshSession: (user: MockAdminUser) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function readSession(): MockAdminUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(ADMIN_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as MockAdminUser
    if (!parsed?.id || !parsed?.email) return null
    return parsed
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockAdminUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setUser(readSession())
    setLoading(false)
  }, [])

  const profile = useMemo(() => (user ? buildAdminProfile(user) : null), [user])

  const signIn = useCallback(async (email: string, password: string) => {
    const admin = await signInAdmin(email, password)
    setUser(admin)
    try {
      window.localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(admin))
    } catch {
      // Session stays in memory if storage is unavailable.
    }
  }, [])

  const signOut = useCallback(() => {
    setUser(null)
    try {
      window.localStorage.removeItem(ADMIN_SESSION_KEY)
    } catch {
      // Ignore storage errors.
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    setUser(readSession())
  }, [])

  const refreshSession = useCallback((next: MockAdminUser) => {
    setUser(next)
    try {
      window.localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(next))
    } catch {
      // Session stays in memory if storage is unavailable.
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdmin: !!user,
        signIn,
        signOut,
        refreshProfile,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
