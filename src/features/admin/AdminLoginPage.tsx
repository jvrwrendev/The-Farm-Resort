import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, KeyRound, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/features/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { BRAND_LOGO_ALT, BRAND_LOGO_URL, BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand'
import heroImage from '@/assets/images/hero.jpg'

const REMEMBER_KEY = 'farm_admin_remembered_email'

type Mode = 'login' | 'forgot' | 'recovery'

interface LocationState {
  from?: { pathname?: string }
  denied?: boolean
}

export default function AdminLoginPage() {
  const { user, isAdmin, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [mode, setMode] = useState<Mode>('login')

  // login
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [denied, setDenied] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // forgot
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSubmitting, setForgotSubmitting] = useState(false)
  const [forgotError, setForgotError] = useState('')
  const [forgotSent, setForgotSent] = useState(false)

  // recovery
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [recoverySubmitting, setRecoverySubmitting] = useState(false)
  const [recoveryError, setRecoveryError] = useState('')

  // Prefill remembered email + detect recovery mode
  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY)
    if (saved) {
      setEmail(saved)
      setRememberMe(true)
    }

    const state = (location.state ?? null) as LocationState | null
    if (state?.denied) setDenied(true)

    // Detect recovery from URL hash
    const hash = window.location.hash
    if (hash.includes('type=recovery')) {
      setMode('recovery')
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setMode('recovery')
    })
    return () => sub.subscription.unsubscribe()
  }, [location.state])

  if (user && isAdmin && mode !== 'recovery') {
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
      if (rememberMe) localStorage.setItem(REMEMBER_KEY, email)
      else localStorage.removeItem(REMEMBER_KEY)
      navigate(from && from.startsWith('/admin') ? from : '/admin/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleForgot = async (event: FormEvent) => {
    event.preventDefault()
    setForgotError('')
    setForgotSubmitting(true)
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${window.location.origin}/admin/login`,
      })
      if (resetError) throw resetError
      setForgotSent(true)
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : 'Unable to send reset link.')
    } finally {
      setForgotSubmitting(false)
    }
  }

  const handleRecovery = async (event: FormEvent) => {
    event.preventDefault()
    setRecoveryError('')
    if (newPassword.length < 6) {
      setRecoveryError('Password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setRecoveryError('Passwords do not match.')
      return
    }
    setRecoverySubmitting(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) throw updateError
      navigate('/admin/dashboard', { replace: true })
    } catch (err) {
      setRecoveryError(err instanceof Error ? err.message : 'Unable to update password.')
    } finally {
      setRecoverySubmitting(false)
    }
  }

  const renderLogin = () => (
    <>
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 font-display text-2xl">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Welcome back
        </CardTitle>
        <CardDescription>Sign in to your admin account to manage the resort.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="admin@example.com"
                className="pl-9"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                className="pl-9 pr-10"
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

          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              Remember me
            </label>
            <button
              type="button"
              onClick={() => {
                setForgotEmail(email)
                setForgotError('')
                setForgotSent(false)
                setMode('forgot')
              }}
              className="text-sm font-medium text-primary hover:underline"
            >
              Forgot password?
            </button>
          </div>

          {denied && (
            <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              Your account is signed in but does not have administrator access.
            </p>
          )}
          {error && (
            <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-primary to-primary/80 shadow-md transition hover:shadow-lg"
            disabled={submitting}
          >
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
    </>
  )

  const renderForgot = () => (
    <>
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 font-display text-2xl">
          <KeyRound className="h-5 w-5 text-primary" />
          Reset password
        </CardTitle>
        <CardDescription>
          Enter your admin email and we'll send you a link to reset your password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {forgotSent ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300">
              A password reset link has been sent to <span className="font-medium">{forgotEmail}</span>. Check your inbox and follow the instructions.
            </div>
            <Button type="button" variant="outline" className="w-full" onClick={() => setMode('login')}>
              Back to sign in
            </Button>
          </div>
        ) : (
          <form onSubmit={handleForgot} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email address</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@example.com"
                  className="pl-9"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {forgotError && (
              <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {forgotError}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={forgotSubmitting}>
              {forgotSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Sending link...
                </>
              ) : (
                'Send reset link'
              )}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => setMode('login')}>
              Back to sign in
            </Button>
          </form>
        )}
      </CardContent>
    </>
  )

  const renderRecovery = () => (
    <>
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 font-display text-2xl">
          <Lock className="h-5 w-5 text-primary" />
          Set new password
        </CardTitle>
        <CardDescription>Choose a new password for your admin account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleRecovery} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="new-password"
                type={showNewPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="At least 6 characters"
                className="pl-9 pr-10"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="confirm-password"
                type={showNewPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Repeat new password"
                className="pl-9"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {recoveryError && (
            <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {recoveryError}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={recoverySubmitting}>
            {recoverySubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Updating...
              </>
            ) : (
              'Update password'
            )}
          </Button>
        </form>
      </CardContent>
    </>
  )

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

      {/* Right: form */}
      <div className="flex items-center justify-center bg-secondary/40 px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <img src={BRAND_LOGO_URL} alt={BRAND_LOGO_ALT} className="h-9 w-9 rounded-md object-cover" />
            <span className="font-display text-xl font-semibold">{BRAND_NAME}</span>
          </div>

          <Card className="rounded-2xl border-border/60 shadow-xl">
            {mode === 'login' && renderLogin()}
            {mode === 'forgot' && renderForgot()}
            {mode === 'recovery' && renderRecovery()}
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