import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PageHeading } from '@/features/admin/components'
import { getSettings, updateSettings } from '@/services/settings.service'
import { queryKeys } from '@/lib/queryKeys'
import type { AppSettings } from '@/types'

export default function AdminSettingsPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.resortSettings,
    queryFn: getSettings,
  })
  const [form, setForm] = useState<AppSettings | null>(null)

  useEffect(() => {
    if (data) setForm({ ...data })
  }, [data])

  const mutation = useMutation({
    mutationFn: (payload: Partial<AppSettings>) => updateSettings(payload),
    onSuccess: (updated) => {
      toast.success('Settings saved.')
      setForm({ ...updated })
      queryClient.invalidateQueries({ queryKey: queryKeys.resortSettings })
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Unable to save settings.')
    },
  })

  if (isLoading || !form) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading settings…
      </div>
    )
  }

  const update = (patch: Partial<AppSettings>) =>
    setForm((prev) => (prev ? { ...prev, ...patch } : prev))

  const handleSave = () => {
    mutation.mutate({
      resortName: form.resortName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      description: form.description.trim(),
      checkInTime: form.checkInTime,
      checkOutTime: form.checkOutTime,
      cancellationPolicy: form.cancellationPolicy.trim(),
      bookingPolicy: form.bookingPolicy.trim(),
      maxGuests: Number(form.maxGuests),
    })
  }

  return (
    <div className="space-y-6">
      <PageHeading
        title="Settings"
        description="Resort details, policies, and booking preferences — backed by Supabase."
        action={
          <Button onClick={handleSave} loading={mutation.isPending}>
            <Save className="h-4 w-4" /> Save changes
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Resort information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="resortName">Resort name</Label>
              <Input
                id="resortName"
                value={form.resortName}
                onChange={(e) => update({ resortName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="settings-email">Email</Label>
                <Input
                  id="settings-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => update({ email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-phone">Phone</Label>
                <Input
                  id="settings-phone"
                  value={form.phone}
                  onChange={(e) => update({ phone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-address">Address</Label>
              <Input
                id="settings-address"
                value={form.address}
                onChange={(e) => update({ address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-description">Description</Label>
              <Textarea
                id="settings-description"
                value={form.description}
                onChange={(e) => update({ description: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Booking preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="checkInTime">Check-in time</Label>
                <Input
                  id="checkInTime"
                  type="time"
                  value={form.checkInTime}
                  onChange={(e) => update({ checkInTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkOutTime">Check-out time</Label>
                <Input
                  id="checkOutTime"
                  type="time"
                  value={form.checkOutTime}
                  onChange={(e) => update({ checkOutTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-maxGuests">Guest capacity</Label>
                <Input
                  id="settings-maxGuests"
                  type="number"
                  min={1}
                  value={form.maxGuests}
                  onChange={(e) => update({ maxGuests: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cancellationPolicy">Cancellation policy</Label>
              <Textarea
                id="cancellationPolicy"
                value={form.cancellationPolicy}
                onChange={(e) => update({ cancellationPolicy: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bookingPolicy">Booking policies</Label>
              <Textarea
                id="bookingPolicy"
                value={form.bookingPolicy}
                onChange={(e) => update({ bookingPolicy: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
