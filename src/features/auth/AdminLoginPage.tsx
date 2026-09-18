import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/features/auth/AuthProvider'
import { BRAND_LOGO_ALT, BRAND_LOGO_URL, BRAND_NAME } from '@/lib/brand'
import { MOCK_ADMIN_EMAIL, MOCK_ADMIN_PASSWORD } from '@/lib/constants'
import { queryKeys } from '@/lib/queryKeys'
import { getAdminAccount } from '@/services/auth.service'

export default function AdminLoginPage() {
  const { user, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const accountQuery = useQuery({ queryKey: queryKeys.adminAccount, queryFn: getAdminAccount })

  if (user) {
    return <Navigate to="/admin/dashboard" replace />
  }

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
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

  const accountEmail = accountQuery.data?.email ?? MOCK_ADMIN_EMAIL
  const passwordMatchesDefault = accountQuery.data?.passwordMatchesDefault ?? true

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4 py-16">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <img src={BRAND_LOGO_URL} alt={BRAND_LOGO_ALT} className="h-10 w-10 rounded-xl object-cover" />
          <span className="font-display text-2xl font-semibold">{BRAND_NAME}</span>
        </Link>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2 font-display text-2xl">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Admin Sign In
            </CardTitle>
            <CardDescription>Manage bookings, accommodation, and reports.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email or username</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="text"
                    autoComplete="username"
                    placeholder="admin@thefarm.ph"
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
                    placeholder="Enter your password"
                    className="pl-9 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" loading={submitting}>
                Sign In
              </Button>
            </form>

            <div className="mt-5 rounded-lg border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Demo credentials</p>
              <p className="mt-1">
                {accountEmail} / {passwordMatchesDefault ? MOCK_ADMIN_PASSWORD : '••••••••'}
              </p>
              {!passwordMatchesDefault && (
                <p className="mt-1">Password changed — update it under Admin &rarr; Account.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            &larr; Back to website
          </Link>
        </p>
      </div>
    </div>
  )
}
