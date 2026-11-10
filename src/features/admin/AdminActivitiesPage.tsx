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
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  Wrench,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import type {
  ActivityBookingStatus,
  ActivityType,
  ActivityUnit,
  ActivityUnitInput,
  ActivityUnitStatus,
} from '@/features/activities/types'
import {
  createActivity,
  createActivityUnit,
  deleteActivityUnit,
  listActivityBookings,
  listActivityUnits,
  listAllActivities,
  updateActivity,
  updateActivityBookingStatus,
  updateActivityUnit,
  uploadActivityImage,
} from '@/services/activity.service'
import { formatBookingDate, formatTimeLabel } from '@/features/activities/utils'
import { cn, formatCurrency } from '@/lib/utils'

const ACCEPTED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_SIZE = 2 * 1024 * 1024

const TABS: Array<{ value: ActivityType; label: string; icon: typeof CircleDot; unit: string }> = [
  { value: 'billiards', label: 'Billiards', icon: CircleDot, unit: 'Table' },
  { value: 'atv', label: 'ATV Rental', icon: Gauge, unit: 'ATV' },
]

const STATUS_OPTIONS: Array<{ value: ActivityBookingStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

interface TypeForm {
  name: string
  description: string
  openTime: string
  closeTime: string
  isAvailable: boolean
  isActive: boolean
  weekdayRate: number
  weekendRate: number
  hourlyRate: number
}

type UnitForm = ActivityUnitInput

function emptyUnitForm(type: ActivityType): UnitForm {
  return {
    activityType: type,
    name: '',
    identifier: '',
    description: '',
    imageUrl: '',
    hourlyRate: 0,
    weekdayRate: 0,
    weekendRate: 0,
    maxPlayers: type === 'atv' ? 2 : 4,
    status: 'available',
    isActive: true,
    sortOrder: 0,
  }
}

function unitToForm(unit: ActivityUnit): UnitForm {
  return {
    activityType: unit.activityType,
    name: unit.name,
    identifier: unit.identifier,
    description: unit.description,
    imageUrl: unit.imageUrl,
    hourlyRate: unit.hourlyRate,
    weekdayRate: unit.weekdayRate,
    weekendRate: unit.weekendRate,
    maxPlayers: unit.maxPlayers,
    status: unit.status,
    isActive: unit.isActive,
    sortOrder: unit.sortOrder,
  }
}

function AdminActivityTab({ type, unitLabel }: { type: ActivityType; unitLabel: string }) {
  const queryClient = useQueryClient()
  const unitFileRef = useRef<HTMLInputElement>(null)

  const { data: allActivities = [] } = useQuery({
    queryKey: ['activities', 'all'],
    queryFn: listAllActivities,
  })
  const activity = useMemo(
    () => allActivities.find((item) => item.type === type),
    [allActivities, type],
  )

  const { data: units = [], isLoading: unitsLoading } = useQuery({
    queryKey: ['activity-units', type, 'admin'],
    queryFn: () => listActivityUnits(type, { includeInactive: true }),
  })

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['activity-bookings', type],
    queryFn: () => listActivityBookings(type),
    staleTime: 0,
  })

  const [typeForm, setTypeForm] = useState<TypeForm>({
    name: type === 'atv' ? 'ATV Rental' : 'Billiards',
    description: '',
    openTime: '08:00',
    closeTime: type === 'atv' ? '18:00' : '22:00',
    isAvailable: true,
    isActive: true,
    weekdayRate: 0,
    weekendRate: 0,
    hourlyRate: 0,
  })
  const [savingType, setSavingType] = useState(false)

  const [unitDialogOpen, setUnitDialogOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<ActivityUnit | null>(null)
  const [unitForm, setUnitForm] = useState<UnitForm>(emptyUnitForm(type))
  const [savingUnit, setSavingUnit] = useState(false)
  const [uploadingUnitImage, setUploadingUnitImage] = useState(false)
  const [deleteUnitTarget, setDeleteUnitTarget] = useState<ActivityUnit | null>(null)

  const [statusFilter, setStatusFilter] = useState<ActivityBookingStatus | 'all'>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!activity) return
    setTypeForm({
      name: activity.name,
      description: activity.description,
      openTime: activity.openTime,
      closeTime: activity.closeTime,
      isAvailable: activity.isAvailable,
      isActive: activity.isActive,
      weekdayRate: activity.weekdayRate,
      weekendRate: activity.weekendRate,
      hourlyRate: activity.hourlyRate,
    })
  }, [activity])

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['activities'] })
    queryClient.invalidateQueries({ queryKey: ['activity-units'] })
    queryClient.invalidateQueries({ queryKey: ['activity-bookings'] })
  }, [queryClient])

  const filteredBookings = useMemo(() => {
    const term = search.trim().toLowerCase()
    return bookings.filter((booking) => {
      if (statusFilter !== 'all' && booking.status !== statusFilter) return false
      if (!term) return true
      return [
        booking.reference,
        booking.customerName,
        booking.email,
        booking.contactNumber,
        booking.unitName,
      ]
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

  const saveType = async () => {
    if (!typeForm.name.trim()) {
      toast.error('Activity name is required.')
      return
    }
    if (typeForm.closeTime <= typeForm.openTime) {
      toast.error('Closing time must be after opening time.')
      return
    }
    setSavingType(true)
    try {
      const payload = {
        type,
        name: typeForm.name,
        description: typeForm.description,
        openTime: typeForm.openTime,
        closeTime: typeForm.closeTime,
        isAvailable: typeForm.isAvailable,
        isActive: typeForm.isActive,
        weekdayRate: typeForm.weekdayRate,
        weekendRate: typeForm.weekendRate,
        hourlyRate: typeForm.hourlyRate,
        inventoryCount: Math.max(1, units.length),
        maxPlayers: Math.max(1, ...units.map((u) => u.maxPlayers), 1),
      }
      if (activity) {
        await updateActivity(activity.id, payload)
        toast.success('Activity settings updated.')
      } else {
        await createActivity(payload)
        toast.success('Activity created.')
      }
      refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save activity settings.')
    } finally {
      setSavingType(false)
    }
  }

  const openAddUnit = () => {
    setEditingUnit(null)
    setUnitForm({
      ...emptyUnitForm(type),
      weekdayRate: typeForm.weekdayRate,
      weekendRate: typeForm.weekendRate,
      hourlyRate: typeForm.hourlyRate,
      sortOrder: units.length,
    })
    setUnitDialogOpen(true)
  }

  const openEditUnit = (unit: ActivityUnit) => {
    setEditingUnit(unit)
    setUnitForm(unitToForm(unit))
    setUnitDialogOpen(true)
  }

  const handleUnitImage = async (file: File) => {
    if (!ACCEPTED.includes(file.type)) {
      toast.error('Unsupported file type. Please use JPG, PNG, or WebP.')
      return
    }
    if (file.size > MAX_SIZE) {
      toast.error('File is too large. Maximum size is 2 MB.')
      return
    }
    setUploadingUnitImage(true)
    try {
      const url = await uploadActivityImage(file)
      setUnitForm((prev) => ({ ...prev, imageUrl: url }))
      toast.success('Image uploaded.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed.')
    } finally {
      setUploadingUnitImage(false)
    }
  }

  const saveUnit = async () => {
    if (!unitForm.name.trim()) {
      toast.error(`${unitLabel} name or ID is required.`)
      return
    }
    if (unitForm.maxPlayers < 1) {
      toast.error('Max participants must be at least 1.')
      return
    }
    setSavingUnit(true)
    try {
      if (editingUnit) {
        await updateActivityUnit(editingUnit.id, unitForm)
        toast.success(`${unitLabel} updated.`)
      } else {
        await createActivityUnit(unitForm)
        toast.success(`${unitLabel} added.`)
      }
      setUnitDialogOpen(false)
      refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to save ${unitLabel.toLowerCase()}.`)
    } finally {
      setSavingUnit(false)
    }
  }

  const handleDeleteUnit = async () => {
    if (!deleteUnitTarget) return
    try {
      await deleteActivityUnit(deleteUnitTarget.id)
      toast.success(`${unitLabel} deleted.`)
      setDeleteUnitTarget(null)
      refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Delete failed.')
    }
  }

  const handleBookingStatus = async (bookingId: string, status: ActivityBookingStatus) => {
    try {
      await updateActivityBookingStatus(bookingId, status)
      toast.success(
        status === 'confirmed'
          ? 'Booking approved.'
          : status === 'cancelled'
            ? 'Booking rejected/cancelled.'
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
        <StatCard title="Revenue" value={formatCurrency(stats.revenue)} icon={CheckCircle2} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">{type === 'atv' ? 'ATV' : 'Billiards'} Settings</CardTitle>
          <p className="text-sm text-muted-foreground">
            Shared hours and default pricing. Individual {unitLabel.toLowerCase()}s can override pricing.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Name</Label>
              <Input value={typeForm.name} onChange={(e) => setTypeForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea rows={2} value={typeForm.description} onChange={(e) => setTypeForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Default weekday rate</Label>
              <Input type="number" min={0} value={typeForm.weekdayRate} onChange={(e) => setTypeForm((p) => ({ ...p, weekdayRate: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Default weekend rate</Label>
              <Input type="number" min={0} value={typeForm.weekendRate} onChange={(e) => setTypeForm((p) => ({ ...p, weekendRate: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Opening time</Label>
              <Input type="time" value={typeForm.openTime} onChange={(e) => setTypeForm((p) => ({ ...p, openTime: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Closing time</Label>
              <Input type="time" value={typeForm.closeTime} onChange={(e) => setTypeForm((p) => ({ ...p, closeTime: e.target.value }))} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={typeForm.isAvailable} onChange={(e) => setTypeForm((p) => ({ ...p, isAvailable: e.target.checked }))} />
              Available for booking
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={typeForm.isActive} onChange={(e) => setTypeForm((p) => ({ ...p, isActive: e.target.checked }))} />
              Visible on public site
            </label>
          </div>
          <div className="flex justify-end">
            <Button onClick={saveType} loading={savingType}>Save settings</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="font-display text-lg">{unitLabel}s</CardTitle>
            <p className="text-sm text-muted-foreground">
              Add and manage individual {unitLabel.toLowerCase()}s. Customers select a specific {unitLabel.toLowerCase()} when booking.
            </p>
          </div>
          <Button onClick={openAddUnit}>
            <Plus className="h-4 w-4" /> Add {unitLabel}
          </Button>
        </CardHeader>
        <CardContent>
          {unitsLoading ? (
            <p className="text-sm text-muted-foreground">Loading {unitLabel.toLowerCase()}s…</p>
          ) : units.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <p className="font-medium">No {unitLabel.toLowerCase()}s yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Add your first {unitLabel.toLowerCase()} to enable bookings.</p>
              <Button className="mt-4" onClick={openAddUnit}><Plus className="h-4 w-4" /> Add {unitLabel}</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {units.map((unit) => (
                <div key={unit.id} className="overflow-hidden rounded-xl border">
                  <div className="aspect-[16/10] bg-muted">
                    {unit.imageUrl ? (
                      <img src={unit.imageUrl} alt={unit.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <ImagePlus className="h-7 w-7" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{unit.name}</p>
                        {unit.identifier && <p className="text-xs text-muted-foreground">{unit.identifier}</p>}
                      </div>
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        unit.status === 'available' ? 'bg-emerald-500/90 text-white' : 'bg-slate-700/90 text-white',
                        !unit.isActive && 'bg-muted text-muted-foreground',
                      )}>
                        {!unit.isActive ? 'Inactive' : unit.status === 'maintenance' ? 'Maintenance' : 'Available'}
                      </span>
                    </div>
                    {unit.description && <p className="line-clamp-2 text-xs text-muted-foreground">{unit.description}</p>}
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-muted px-2 py-1">WD ₱{unit.weekdayRate}/hr</span>
                      <span className="rounded-full bg-muted px-2 py-1">WE ₱{unit.weekendRate}/hr</span>
                      <span className="rounded-full bg-muted px-2 py-1">Max {unit.maxPlayers}</span>
                    </div>
                    <div className="flex gap-1 pt-1">
                      <Button variant="ghost" size="sm" onClick={() => openEditUnit(unit)}><Pencil className="h-4 w-4" /></Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title={unit.status === 'available' ? 'Set maintenance' : 'Set available'}
                        onClick={async () => {
                          try {
                            await updateActivityUnit(unit.id, {
                              status: unit.status === 'available' ? 'maintenance' : 'available',
                            })
                            refresh()
                            toast.success(`${unitLabel} status updated.`)
                          } catch {
                            toast.error('Failed to update status.')
                          }
                        }}
                      >
                        <Wrench className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteUnitTarget(unit)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-col gap-4 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="font-display text-lg">Reservations</CardTitle>
            <p className="text-sm text-muted-foreground">View and manage customer bookings.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9 sm:w-64" placeholder="Search reference, name, or unit" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ActivityBookingStatus | 'all')}>
              <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
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
                <TableHead>{unitLabel}</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="hidden sm:table-cell">Time</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[1%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookingsLoading ? (
                <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">Loading reservations…</TableCell></TableRow>
              ) : filteredBookings.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">No reservations match your filters.</TableCell></TableRow>
              ) : (
                filteredBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-mono text-xs font-medium">{booking.reference}</TableCell>
                    <TableCell>
                      <p className="font-medium">{booking.customerName}</p>
                      <p className="text-xs text-muted-foreground">{booking.email}</p>
                    </TableCell>
                    <TableCell>{booking.unitName}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <p>{format(parseISO(booking.bookingDate), 'MMM d, yyyy')}</p>
                      <p className="text-xs text-muted-foreground">{formatBookingDate(booking.bookingDate, 'EEE')}</p>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <p>{formatTimeLabel(booking.startTime)}</p>
                      <p className="text-xs text-muted-foreground">to {formatTimeLabel(booking.endTime)}</p>
                    </TableCell>
                    <TableCell>{formatCurrency(booking.totalAmount)}</TableCell>
                    <TableCell><StatusBadge status={booking.status} /></TableCell>
                    <TableCell className="w-[1%] text-right">
                      <div className="flex justify-end gap-1">
                        {booking.status === 'pending' && (
                          <>
                            <Button variant="ghost" size="sm" title="Approve" onClick={() => handleBookingStatus(booking.id, 'confirmed')}><CheckCircle2 className="h-4 w-4 text-emerald-600" /></Button>
                            <Button variant="ghost" size="sm" title="Reject" onClick={() => handleBookingStatus(booking.id, 'cancelled')}><XCircle className="h-4 w-4 text-destructive" /></Button>
                          </>
                        )}
                        {booking.status === 'confirmed' && (
                          <Button variant="ghost" size="sm" title="Complete" onClick={() => handleBookingStatus(booking.id, 'completed')}><CheckCircle2 className="h-4 w-4" /></Button>
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

      <Dialog open={unitDialogOpen} onOpenChange={(o) => !o && setUnitDialogOpen(false)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUnit ? `Edit ${unitLabel}` : `Add ${unitLabel}`}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{unitLabel} name / ID *</Label>
              <Input value={unitForm.name} onChange={(e) => setUnitForm((p) => ({ ...p, name: e.target.value }))} placeholder={type === 'atv' ? 'ATV 1' : 'Table 1'} />
            </div>
            <div className="space-y-2">
              <Label>Identifier (optional)</Label>
              <Input value={unitForm.identifier ?? ''} onChange={(e) => setUnitForm((p) => ({ ...p, identifier: e.target.value }))} placeholder={type === 'atv' ? 'ATV-01' : 'TBL-01'} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea rows={2} value={unitForm.description} onChange={(e) => setUnitForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Weekday rate / hour</Label>
              <Input type="number" min={0} value={unitForm.weekdayRate} onChange={(e) => setUnitForm((p) => ({ ...p, weekdayRate: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Weekend rate / hour</Label>
              <Input type="number" min={0} value={unitForm.weekendRate} onChange={(e) => setUnitForm((p) => ({ ...p, weekendRate: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Max participants</Label>
              <Input type="number" min={1} value={unitForm.maxPlayers} onChange={(e) => setUnitForm((p) => ({ ...p, maxPlayers: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={unitForm.status} onValueChange={(v) => setUnitForm((p) => ({ ...p, status: v as ActivityUnitStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{unitLabel} image</Label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="flex h-28 w-44 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted">
                  {unitForm.imageUrl ? <img src={unitForm.imageUrl} alt={unitForm.name || unitLabel} className="h-full w-full object-cover" /> : <ImagePlus className="h-7 w-7 text-muted-foreground" />}
                </div>
                <div className="space-y-2">
                  <input ref={unitFileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUnitImage(f); e.target.value = '' }} />
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => unitFileRef.current?.click()} disabled={uploadingUnitImage}>
                      {uploadingUnitImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {unitForm.imageUrl ? 'Replace image' : 'Upload image'}
                    </Button>
                    {unitForm.imageUrl && <Button type="button" variant="ghost" onClick={() => setUnitForm((p) => ({ ...p, imageUrl: '' }))}>Remove</Button>}
                  </div>
                  <p className="text-xs text-muted-foreground">JPG, PNG, or WebP · max 2 MB</p>
                </div>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" checked={unitForm.isActive} onChange={(e) => setUnitForm((p) => ({ ...p, isActive: e.target.checked }))} />
              Active (visible for booking when available)
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnitDialogOpen(false)} disabled={savingUnit}>Cancel</Button>
            <Button onClick={saveUnit} loading={savingUnit || uploadingUnitImage}>{editingUnit ? 'Save' : `Add ${unitLabel}`}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteUnitTarget} onOpenChange={(o) => !o && setDeleteUnitTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Delete {unitLabel}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete “{deleteUnitTarget?.name}”? Existing bookings will keep their history but may lose the direct unit link.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUnitTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteUnit}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function AdminActivitiesPage() {
  const [activeTab, setActiveTab] = useState<ActivityType>('billiards')

  return (
    <div className="space-y-6">
      <PageHeading
        title="Activities"
        description="Manage Billiards and ATV units, pricing, availability, and reservations."
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
            <AdminActivityTab type={tab.value} unitLabel={tab.unit} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
