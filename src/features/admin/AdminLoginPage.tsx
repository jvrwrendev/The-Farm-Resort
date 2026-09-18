import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/features/auth/AuthProvider'
import { BRAND_LOGO_ALT, BRAND_LOGO_URL, BRAND_NAME } from '@/lib/brand'
import { MOCK_ADMIN_EMAIL } from '@/lib/constants'
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
  const accountEmail = accountQuery.data?.email ?? MOCK_ADMIN_EMAIL

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4 py-16">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <img src={BRAND_LOGO_URL} alt={BRAND_LOGO_ALT} className="h-9 w-9 rounded-md object-cover" />
          <span className="font-display text-xl font-semibold">{BRAND_NAME}</span>
        </Link>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2 font-display text-2xl">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Admin Login
            </CardTitle>
            <CardDescription>Sign in to manage bookings, rooms, services, and site content.</CardDescription>
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
                <p className="text-xs text-muted-foreground">
                  Demo credentials: <span className="font-mono text-foreground">{accountEmail}</span>
                  {' / '}
                  <span className="font-mono text-foreground">admin123</span>
                </p>
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

              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Signing in...' : 'Sign in'}
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
  )
}