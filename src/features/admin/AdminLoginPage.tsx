import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/features/auth/AuthProvider'
import { BRAND_LOGO_ALT, BRAND_LOGO_URL, BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand'
import heroImage from '@/assets/images/hero.jpg'

interface LocationState {
  from?: { pathname?: string }
  denied?: boolean
}

export default function AdminLoginPage() {
  const { user, isAdmin, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [denied, setDenied] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const state = (location.state ?? null) as LocationState | null
    if (state?.denied) setDenied(true)
  }, [location.state])

  if (user && isAdmin) {
    return <Navigate to="/admin/dashboard" replace />
  }

  const from = (location.state as LocationState | null)?.from?.pathname

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setDenied(false)
    setSubmitting(true)
    try {
      await signIn(email, password)
      navigate(from && from.startsWith('/admin') ? from : '/admin/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[70%_30%]">
      {/* Left: brand image panel */}
      <div className="relative hidden overflow-hidden lg:block">
        <img
          src={heroImage}
          alt="The Farm Resort"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/40 to-black/20" />
        <div className="relative flex h-full flex-col justify-between p-10 text-white">
          <Link to="/" className="flex items-center gap-2">
            <img
              src={BRAND_LOGO_URL}
              alt={BRAND_LOGO_ALT}
              className="h-10 w-10 rounded-md object-cover ring-2 ring-white/30"
            />
            <span className="font-display text-2xl font-semibold">{BRAND_NAME}</span>
          </Link>
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
              Admin portal
            </p>
            <h1 className="font-display mt-3 text-4xl font-bold leading-tight">
              Manage your resort with confidence.
            </h1>
            <p className="mt-4 text-base text-white/80">{BRAND_TAGLINE}</p>
          </div>
          <p className="text-xs text-white/60">
            © {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
          </p>
        </div>
      </div>

      {/* Mobile banner */}
      <div className="relative h-44 overflow-hidden lg:hidden">
        <img
          src={heroImage}
          alt="The Farm Resort"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/30" />
        <div className="relative flex h-full items-center gap-3 px-6 text-white">
          <img
            src={BRAND_LOGO_URL}
            alt={BRAND_LOGO_ALT}
            className="h-10 w-10 rounded-md object-cover ring-2 ring-white/30"
          />
          <div>
            <p className="font-display text-xl font-semibold">{BRAND_NAME}</p>
            <p className="text-xs text-white/80">Admin portal</p>
          </div>
        </div>
      </div>

      {/* Right: login form */}
      <div className="flex items-center justify-center bg-secondary/40 px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <img src={BRAND_LOGO_URL} alt={BRAND_LOGO_ALT} className="h-9 w-9 rounded-md object-cover" />
            <span className="font-display text-xl font-semibold">{BRAND_NAME}</span>
          </div>

          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2 font-display text-2xl">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Admin Login
              </CardTitle>
              <CardDescription>
                Sign in with the Supabase-managed administrator credentials.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {denied && (
                  <p role="alert" className="text-sm text-destructive">
                    Your account is signed in but does not have administrator access.
                  </p>
                )}
                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Signing in...
                    </>
                  ) : (
                    'Sign in'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">
              &larr; Back to website
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
