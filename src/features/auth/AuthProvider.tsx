import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { mapAuthError, mapPostgrestError } from '@/lib/errors'
import type { Profile } from '@/types'

interface AuthContextType {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function buildProfileFromUser(user: User): Profile {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const fullName =
    typeof meta.full_name === 'string'
      ? meta.full_name
      : (user.email ?? '').split('@')[0]
  return {
    id: user.id,
    email: user.email ?? '',
    full_name: fullName,
    role: 'customer',
    is_active: true,
    created_at: user.created_at ?? new Date().toISOString(),
    updated_at: user.created_at ?? new Date().toISOString(),
  }
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.warn('[Supabase] profile fetch error:', mapPostgrestError(error))
    return null
  }
  return data as Profile | null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null)
      return
    }
    const next = await fetchProfile(user.id)
    setProfile(next ?? buildProfileFromUser(user))
  }, [user])

  useEffect(() => {
    let cancelled = false

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (cancelled) return
        const nextSession = data.session ?? null
        setSession(nextSession)
        const nextUser = nextSession?.user ?? null
        setUser(nextUser)
        if (nextUser) {
          const prof = await fetchProfile(nextUser.id)
          if (!cancelled) setProfile(prof ?? buildProfileFromUser(nextUser))
        }
        if (!cancelled) setLoading(false)
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession)
      const nextUser = nextSession?.user ?? null
      setUser(nextUser)
      if (nextUser) {
        const prof = await fetchProfile(nextUser.id)
        setProfile(prof ?? buildProfileFromUser(nextUser))
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      throw new Error(mapAuthError(error))
    }
    if (!data.user) {
      throw new Error('Unable to sign in. Please try again.')
    }
    const prof = await fetchProfile(data.user.id)
    setSession(data.session ?? null)
    setUser(data.user)
    setProfile(prof ?? buildProfileFromUser(data.user))

    if (prof && prof.role !== 'admin') {
      await supabase.auth.signOut()
      setSession(null)
      setUser(null)
      setProfile(null)
      throw new Error('This account does not have administrator access.')
    }
    if (!prof) {
      // Profile not provisioned yet — accept login but warn on next render.
      setProfile(buildProfileFromUser(data.user))
    }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    setProfile(null)
  }, [])

  const isAdmin = profile?.role === 'admin'

  const value = useMemo<AuthContextType>(
    () => ({
      session,
      user,
      profile,
      loading,
      isAdmin,
      signIn,
      signOut,
      refreshProfile,
    }),
    [session, user, profile, loading, isAdmin, signIn, signOut, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
