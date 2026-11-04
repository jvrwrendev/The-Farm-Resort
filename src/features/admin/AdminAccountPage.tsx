import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { KeyRound, Loader2, Mail, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeading } from '@/features/admin/components'
import { useAuth } from '@/features/auth/AuthProvider'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { mapAuthError } from '@/lib/errors'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

function FieldError({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  )
}

async function verifyCurrentPassword(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  return error
}

export default function AdminAccountPage() {
  const { user, refreshProfile } = useAuth()
  const currentEmail = user?.email ?? ''

  const [emailValues, setEmailValues] = useState({ email: '', confirm: '', currentPassword: '' })
  const [emailError, setEmailError] = useState('')

  const [passwordValues, setPasswordValues] = useState({
    currentPassword: '',
    newPassword: '',
    confirm: '',
  })
  const [passwordError, setPasswordError] = useState('')

  const emailMutation = useMutation({
    mutationFn: async () => {
      if (!currentEmail) throw new Error('No active session.')
      const verify = await verifyCurrentPassword(currentEmail, emailValues.currentPassword)
      if (verify) throw new Error('Current password is incorrect.')
      const { data, error } = await supabase.auth.updateUser({ email: emailValues.email })
      if (error) throw new Error(mapAuthError(error))
      return data
    },
    onSuccess: () => {
      setEmailValues({ email: '', confirm: '', currentPassword: '' })
      setEmailError('')
      toast.success('Confirmation email sent to the new address.')
    },
    onError: (error: unknown) => {
      setEmailError(error instanceof Error ? error.message : 'Unable to update email.')
    },
  })

  const passwordMutation = useMutation({
    mutationFn: async () => {
      if (!currentEmail) throw new Error('No active session.')
      const verify = await verifyCurrentPassword(currentEmail, passwordValues.currentPassword)
      if (verify) throw new Error('Current password is incorrect.')
      const { error } = await supabase.auth.updateUser({ password: passwordValues.newPassword })
      if (error) throw new Error(mapAuthError(error))
    },
    onSuccess: () => {
      setPasswordValues({ currentPassword: '', newPassword: '', confirm: '' })
      setPasswordError('')
      toast.success('Password updated.')
      refreshProfile()
    },
    onError: (error: unknown) => {
      setPasswordError(error instanceof Error ? error.message : 'Unable to update password.')
    },
  })

  const handleEmailSubmit = (event: FormEvent) => {
    event.preventDefault()
    setEmailError('')
    const email = emailValues.email.trim().toLowerCase()
    if (!EMAIL_RE.test(email)) {
      setEmailError('Enter a valid email address.')
      return
    }
    if (email === currentEmail.toLowerCase()) {
      setEmailError('New email must be different from the current one.')
      return
    }
    if (email !== emailValues.confirm.trim().toLowerCase()) {
      setEmailError('Email addresses do not match.')
      return
    }
    if (!emailValues.currentPassword) {
      setEmailError('Enter your current password to confirm the change.')
      return
    }
    if (!isSupabaseConfigured) {
      setEmailError('Supabase is not configured. Update .env to enable account changes.')
      return
    }
    emailMutation.mutate()
  }

  const handlePasswordSubmit = (event: FormEvent) => {
    event.preventDefault()
    setPasswordError('')
    const { currentPassword, newPassword, confirm } = passwordValues
    if (!currentPassword) {
      setPasswordError('Enter your current password.')
      return
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (newPassword === currentPassword) {
      setPasswordError('New password must be different from the current one.')
      return
    }
    if (newPassword !== confirm) {
      setPasswordError('Passwords do not match.')
      return
    }
    if (!isSupabaseConfigured) {
      setPasswordError('Supabase is not configured. Update .env to enable account changes.')
      return
    }
    passwordMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <PageHeading
        title="Account"
        description="Update the admin sign-in email and password through Supabase Auth."
      />

      {!isSupabaseConfigured && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
          Supabase credentials are not set. Configure <code>.env</code> before changing credentials.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Mail className="h-4 w-4 text-primary" />
              Sign-in email
            </CardTitle>
            <CardDescription>
              Current address: <span className="font-medium text-foreground">{currentEmail}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEmailSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="account-new-email">New email</Label>
                <Input
                  id="account-new-email"
                  type="email"
                  autoComplete="email"
                  value={emailValues.email}
                  onChange={(e) => setEmailValues((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-confirm-email">Confirm new email</Label>
                <Input
                  id="account-confirm-email"
                  type="email"
                  autoComplete="email"
                  value={emailValues.confirm}
                  onChange={(e) => setEmailValues((prev) => ({ ...prev, confirm: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-email-current-password">Current password</Label>
                <Input
                  id="account-email-current-password"
                  type="password"
                  autoComplete="current-password"
                  value={emailValues.currentPassword}
                  onChange={(e) => setEmailValues((prev) => ({ ...prev, currentPassword: e.target.value }))}
                />
              </div>
              {emailError && <FieldError message={emailError} />}
              <Button type="submit" disabled={emailMutation.isPending}>
                {emailMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Update email
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <KeyRound className="h-4 w-4 text-primary" />
              Password
            </CardTitle>
            <CardDescription>
              At least {MIN_PASSWORD_LENGTH} characters and different from the current one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="account-current-password">Current password</Label>
                <Input
                  id="account-current-password"
                  type="password"
                  autoComplete="current-password"
                  value={passwordValues.currentPassword}
                  onChange={(e) =>
                    setPasswordValues((prev) => ({ ...prev, currentPassword: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-new-password">New password</Label>
                <Input
                  id="account-new-password"
                  type="password"
                  autoComplete="new-password"
                  value={passwordValues.newPassword}
                  onChange={(e) =>
                    setPasswordValues((prev) => ({ ...prev, newPassword: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-confirm-password">Confirm new password</Label>
                <Input
                  id="account-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={passwordValues.confirm}
                  onChange={(e) =>
                    setPasswordValues((prev) => ({ ...prev, confirm: e.target.value }))
                  }
                />
              </div>
              {passwordError && <FieldError message={passwordError} />}
              <Button type="submit" disabled={passwordMutation.isPending}>
                {passwordMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Update password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
