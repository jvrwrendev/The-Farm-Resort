import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import {
  CheckCircle2,
  CircleDot,
  Clock,
  Gauge,
  ImagePlus,
  Loader2,
  Search,
  Upload,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeading, StatCard, StatusBadge } from '@/features/admin/components'
import type { Activity, ActivityBookingStatus, ActivityType } from '@/features/activities/types'
import {
  createActivity,
  listAllActivities,
  listActivityBookings,
  updateActivity,
  updateActivityBookingStatus,
  uploadActivityImage,
} from '@/services/activity.service'
import { formatBookingDate, formatTimeLabel } from '@/features/activities/utils'
import { formatCurrency } from '@/lib/utils'

const ACCEPTED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_SIZE = 2 * 1024 * 1024

const TABS: Array<{ value: ActivityType; label: string; icon: typeof CircleDot }> = [
  { value: 'billiards', label: 'Billiards', icon: CircleDot },
  { value: 'atv', label: 'ATV Rental', icon: Gauge },
]

const STATUS_OPTIONS: Array<{ value: ActivityBookingStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

interface ActivityForm {
  name: string
  description: string
  imageUrl: string
  hourlyRate: number
  weekdayRate: number
  weekendRate: number
  inventoryCount: number
  maxPlayers: number
  openTime: string
  closeTime: string
  isAvailable: boolean
  isActive: boolean
}

const EMPTY_FORM: ActivityForm = {
  name: '',
  description: '',
  imageUrl: '',
  hourlyRate: 0,
  weekdayRate: 0,
  weekendRate: 0,
  inventoryCount: 1,
  maxPlayers: 4,
  openTime: '08:00',
  closeTime: '18:00',
  isAvailable: true,
  isActive: true,
}

function activityToForm(activity: Activity): ActivityForm {
  return {
    name: activity.name,
    description: activity.description,
    imageUrl: activity.imageUrl,
    hourlyRate: activity.hourlyRate,
    weekdayRate: activity.weekdayRate,
    weekendRate: activity.weekendRate,
    inventoryCount: activity.inventoryCount,
    maxPlayers: activity.maxPlayers,
    openTime: activity.openTime,
    closeTime: activity.closeTime,
    isAvailable: activity.isAvailable,
    isActive: activity.isActive,
  }
}

function AdminActivityTab({ type }: { type: ActivityType }) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: allActivities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ['activities', 'all'],
    queryFn: listAllActivities,
  })

  const activities = useMemo(
    () => allActivities.filter((item) => item.type === type),
    [allActivities, type],
  )

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['activity-bookings', type],
    queryFn: () => listActivityBookings(type),
    staleTime: 0,
  })

  const activity = activities[0]

  const [form, setForm] = useState<ActivityForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<ActivityBookingStatus | 'all'>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    setForm(activity ? activityToForm(activity) : { ...EMPTY_FORM, name: type === 'atv' ? 'ATV Rental' : 'Billiards Table' })
  }, [activity, type])

  const filteredBookings = useMemo(() => {
    const term = search.trim().toLowerCase()
    return bookings.filter((booking) => {
      if (statusFilter !== 'all' && booking.status !== statusFilter) return false
      if (!term) return true
      return [booking.reference, booking.customerName, booking.email, booking.contactNumber]
        .join(' ')
        .toLowerCase()
        .includes(term)
    })
  }, [bookings, search, statusFilter])

  const stats = useMemo(
    () =>
      bookings.reduce(
        (acc, booking) => {
          acc.total += 1
          acc[booking.status] += 1
          if (booking.status === 'confirmed' || booking.status === 'completed') {
            acc.revenue += booking.totalAmount
          }
          return acc
        },
        { total: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0, revenue: 0 },
      ),
    [bookings],
  )

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['activities'] })
    queryClient.invalidateQueries({ queryKey: ['activity-bookings'] })
  }, [queryClient])

  const handleImageSelected = async (file: File) => {
    if (!ACCEPTED.includes(file.type)) {
      toast.error('Unsupported file type. Please use JPG, PNG, or WebP.')
      return
    }
    if (file.size > MAX_SIZE) {
      toast.error('File is too large. Maximum size is 2 MB.')
      return
    }
    setUploading(true)
    try {
      const url = await uploadActivityImage(file)
      setForm((prev) => ({ ...prev, imageUrl: url }))
      toast.success('Image uploaded. Save changes to publish it.')
    } catch {
      toast.error('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Activity name is required.')
      return
    }
    if (form.closeTime <= form.openTime) {
      toast.error('Closing time must be after opening time.')
      return
    }
    if (!Number.isInteger(form.inventoryCount) || form.inventoryCount < 1) {
      toast.error('Inventory must be at least one.')
      return
    }
    if (!Number.isInteger(form.maxPlayers) || form.maxPlayers < 1) {
      toast.error('Participant capacity must be at least one.')
      return
    }
    setSaving(true)
    try {
      if (activity) {
        await updateActivity(activity.id, { ...form, type })
        toast.success('Activity updated.')
      } else {
        await createActivity({ ...form, type })
        toast.success('Activity created.')
      }
      refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save activity.')
    } finally {
      setSaving(false)
    }
  }

  const handleStatus = async (bookingId: string, status: ActivityBookingStatus) => {
    try {
      await updateActivityBookingStatus(bookingId, status)
      toast.success(
        status === 'confirmed'
          ? 'Booking approved.'
          : status === 'cancelled'
            ? 'Booking rejected.'
            : 'Booking marked completed.',
      )
      queryClient.invalidateQueries({ queryKey: ['activity-bookings'] })
    } catch {
      toast.error('Failed to update the booking.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard title="Total" value={stats.total} icon={Clock} />
        <StatCard title="Pending" value={stats.pending} icon={Clock} hint="Awaiting review" />
        <StatCard title="Confirmed" value={stats.confirmed} icon={CheckCircle2} />
        <StatCard title="Completed" value={stats.completed} icon={CheckCircle2} />
        <StatCard
          title="Revenue"
          value={formatCurrency(stats.revenue)}
          icon={CheckCircle2}
          hint="Confirmed + completed"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">
            {activity ? `Edit ${activity.name}` : 'Create activity'}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Update the public content, pricing, operating hours, and availability.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Activity name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Hourly rate</Label>
              <Input
                type="number"
                min={0}
                value={form.hourlyRate}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, hourlyRate: Number(e.target.value) }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Weekday rate</Label>
              <Input
                type="number"
                min={0}
                value={form.weekdayRate}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, weekdayRate: Number(e.target.value) }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Weekend rate</Label>
              <Input
                type="number"
                min={0}
                value={form.weekendRate}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, weekendRate: Number(e.target.value) }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{type === 'atv' ? 'Number of ATVs' : 'Number of tables'}</Label>
              <Input
                type="number"
                min={1}
                value={form.inventoryCount}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, inventoryCount: Number(e.target.value) }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Max participants per {type === 'atv' ? 'ATV' : 'table'}</Label>
              <Input
                type="number"
                min={1}
                value={form.maxPlayers}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, maxPlayers: Number(e.target.value) }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Opening time</Label>
              <Input
                type="time"
                value={form.openTime}
                onChange={(e) => setForm((prev) => ({ ...prev, openTime: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Closing time</Label>
              <Input
                type="time"
                value={form.closeTime}
                onChange={(e) => setForm((prev) => ({ ...prev, closeTime: e.target.value }))}
              />
            </div>
            <div className="flex flex-wrap items-center gap-5 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isAvailable}
                  onChange={(e) => setForm((prev) => ({ ...prev, isAvailable: e.target.checked }))}
                />
                Available for booking
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                />
                Visible on the public site
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Activity image</Label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex h-28 w-44 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted">
                {form.imageUrl ? (
                  <img
                    src={form.imageUrl}
                    alt={form.name || 'Activity'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImagePlus className="h-7 w-7 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void handleImageSelected(file)
                    e.target.value = ''
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {form.imageUrl ? 'Replace image' : 'Upload image'}
                </Button>
                {form.imageUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setForm((prev) => ({ ...prev, imageUrl: '' }))}
                  >
                    Remove
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">JPG, PNG, or WebP · max 2 MB</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} loading={saving || activitiesLoading}>
              {activity ? 'Save changes' : 'Create activity'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-col gap-4 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="font-display text-lg">Reservations</CardTitle>
            <p className="text-sm text-muted-foreground">
              View, approve, reject, or complete customer reservations.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9 sm:w-64"
                placeholder="Search reference or name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as ActivityBookingStatus | 'all')}
            >
              <SelectTrigger className="sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="px-0 py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="hidden sm:table-cell">Time</TableHead>
                <TableHead className="hidden lg:table-cell">
                  {type === 'atv' ? 'ATVs' : 'Tables'}
                </TableHead>
                <TableHead className="hidden xl:table-cell">Guests</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[1%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookingsLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    Loading reservations…
                  </TableCell>
                </TableRow>
              ) : filteredBookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    No reservations match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-mono text-xs font-medium">
                      {booking.reference}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{booking.customerName}</p>
                      <p className="text-xs text-muted-foreground">{booking.email}</p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <p>{format(parseISO(booking.bookingDate), 'MMM d, yyyy')}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatBookingDate(booking.bookingDate, 'EEE')}
                      </p>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <p>{formatTimeLabel(booking.startTime)}</p>
                      <p className="text-xs text-muted-foreground">
                        to {formatTimeLabel(booking.endTime)}
                      </p>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{booking.quantity}</TableCell>
                    <TableCell className="hidden xl:table-cell">{booking.players}</TableCell>
                    <TableCell>{formatCurrency(booking.totalAmount)}</TableCell>
                    <TableCell>
                      <StatusBadge status={booking.status} />
                    </TableCell>
                    <TableCell className="w-[1%] text-right">
                      <div className="flex justify-end gap-1">
                        {booking.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Approve"
                              onClick={() => handleStatus(booking.id, 'confirmed')}
                            >
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Reject"
                              onClick={() => handleStatus(booking.id, 'cancelled')}
                            >
                              <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                        {booking.status === 'confirmed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Mark completed"
                            onClick={() => handleStatus(booking.id, 'completed')}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                        {(booking.status === 'completed' || booking.status === 'cancelled') && (
                          <span className="px-2 text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AdminActivitiesPage() {
  const [activeTab, setActiveTab] = useState<ActivityType>('billiards')

  return (
    <div className="space-y-6">
      <PageHeading
        title="Activities"
        description="Manage Billiards and ATV rental content, pricing, availability, and reservations."
      />
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ActivityType)}>
        <TabsList className="grid w-full grid-cols-2 sm:max-w-md">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-6">
            <AdminActivityTab type={tab.value} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
