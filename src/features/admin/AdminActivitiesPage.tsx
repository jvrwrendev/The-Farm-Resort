import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import {
  Banknote,
  CheckCircle2,
  CircleDot,
  Gauge,
  Hash,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Receipt,
  Search,
  Trash2,
  Upload,
  Users,
  Wrench,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { PageHeading, StatusBadge } from '@/features/admin/components'
import { PaymentDetailsCard, PaymentStatusBadge } from '@/features/admin/PaymentDetailsCard'
import type {
  ActivityBooking,
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

const TABS: Array<{
  value: ActivityType
  label: string
  icon: typeof CircleDot
  unit: string
  units: string
}> = [
  {
    value: 'billiards',
    label: 'Billiards',
    icon: CircleDot,
    unit: 'Billiard Table',
    units: 'Billiard Tables',
  },
  { value: 'atv', label: 'ATV Rental', icon: Gauge, unit: 'ATV', units: 'ATVs' },
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
  imageUrl: string
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

function AdminActivityTab({
  type,
  unitLabel,
  unitPlural,
}: {
  type: ActivityType
  unitLabel: string
  unitPlural: string
}) {
  const queryClient = useQueryClient()
  const unitFileRef = useRef<HTMLInputElement>(null)
  const typeFileRef = useRef<HTMLInputElement>(null)

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
    imageUrl: '',
    openTime: '08:00',
    closeTime: type === 'atv' ? '18:00' : '22:00',
    isAvailable: true,
    isActive: true,
    weekdayRate: 0,
    weekendRate: 0,
    hourlyRate: 0,
  })
  const [savingType, setSavingType] = useState(false)
  const [uploadingTypeImage, setUploadingTypeImage] = useState(false)

  const [unitDialogOpen, setUnitDialogOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<ActivityUnit | null>(null)
  const [unitForm, setUnitForm] = useState<UnitForm>(emptyUnitForm(type))
  const [savingUnit, setSavingUnit] = useState(false)
  const [uploadingUnitImage, setUploadingUnitImage] = useState(false)
  const [unitImageFile, setUnitImageFile] = useState<File | null>(null)
  const [unitImagePreview, setUnitImagePreview] = useState('')
  const [deleteUnitTarget, setDeleteUnitTarget] = useState<ActivityUnit | null>(null)

  const [statusFilter, setStatusFilter] = useState<ActivityBookingStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [paymentBooking, setPaymentBooking] = useState<ActivityBooking | null>(null)

  useEffect(() => {
    if (!activity) return
    setTypeForm({
      name: activity.name,
      description: activity.description,
      imageUrl: activity.imageUrl,
      openTime: activity.openTime,
      closeTime: activity.closeTime,
      isAvailable: activity.isAvailable,
      isActive: activity.isActive,
      weekdayRate: activity.weekdayRate,
      weekendRate: activity.weekendRate,
      hourlyRate: activity.hourlyRate,
    })
  }, [activity])

  useEffect(
    () => () => {
      if (unitImagePreview) URL.revokeObjectURL(unitImagePreview)
    },
    [unitImagePreview],
  )

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

  const inventoryStats = useMemo(
    () => ({
      total: units.length,
      available: units.filter((unit) => unit.isActive && unit.status === 'available').length,
      maintenance: units.filter((unit) => unit.isActive && unit.status === 'maintenance').length,
      inactive: units.filter((unit) => !unit.isActive).length,
    }),
    [units],
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
        imageUrl: typeForm.imageUrl,
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
    setUnitImageFile(null)
    setUnitImagePreview('')
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
    setUnitImageFile(null)
    setUnitImagePreview('')
    setUnitForm(unitToForm(unit))
    setUnitDialogOpen(true)
  }

  const closeUnitDialog = () => {
    if (savingUnit || uploadingUnitImage) return
    setUnitDialogOpen(false)
    setEditingUnit(null)
    setUnitImageFile(null)
    setUnitImagePreview('')
    if (unitFileRef.current) unitFileRef.current.value = ''
  }

  const handleTypeImage = async (file: File) => {
    if (!ACCEPTED.includes(file.type)) {
      toast.error('Unsupported file type. Please use JPG, PNG, or WebP.')
      return
    }
    if (file.size > MAX_SIZE) {
      toast.error('File is too large. Maximum size is 2 MB.')
      return
    }
    setUploadingTypeImage(true)
    try {
      const url = await uploadActivityImage(file)
      setTypeForm((prev) => ({ ...prev, imageUrl: url }))
      toast.success('Cover image uploaded. Save settings to apply it.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed.')
    } finally {
      setUploadingTypeImage(false)
    }
  }

  const handleUnitImage = (file: File) => {
    if (!ACCEPTED.includes(file.type)) {
      toast.error('Unsupported file type. Please use JPG, PNG, or WebP.')
      return
    }
    if (file.size > MAX_SIZE) {
      toast.error('File is too large. Maximum size is 2 MB.')
      return
    }
    setUnitImageFile(file)
    setUnitImagePreview(URL.createObjectURL(file))
  }

  const removeUnitImage = () => {
    setUnitImageFile(null)
    setUnitImagePreview('')
    setUnitForm((prev) => ({ ...prev, imageUrl: '' }))
    if (unitFileRef.current) unitFileRef.current.value = ''
  }

  const saveUnit = async () => {
    if (!unitForm.name.trim()) {
      toast.error(`${unitLabel} name or ID is required.`)
      return
    }
    if (unitForm.hourlyRate < 0 || unitForm.weekdayRate < 0 || unitForm.weekendRate < 0) {
      toast.error('Rental prices cannot be negative.')
      return
    }
    if (unitForm.maxPlayers < 1) {
      toast.error('Max participants must be at least 1.')
      return
    }
    setSavingUnit(true)
    try {
      let imageUrl = unitForm.imageUrl
      if (unitImageFile) {
        setUploadingUnitImage(true)
        try {
          imageUrl = await uploadActivityImage(unitImageFile)
        } finally {
          setUploadingUnitImage(false)
        }
      }

      const payload: UnitForm = {
        ...unitForm,
        imageUrl,
      }

      if (editingUnit) {
        await updateActivityUnit(editingUnit.id, payload)
        toast.success(`${unitLabel} updated.`)
      } else {
        await createActivityUnit(payload)
        toast.success(`${unitLabel} added.`)
      }
      setUnitDialogOpen(false)
      setEditingUnit(null)
      setUnitImageFile(null)
      setUnitImagePreview('')
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

  const UnitIcon = type === 'atv' ? Gauge : CircleDot

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border/70 shadow-sm">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="font-display text-lg">
            {type === 'atv' ? 'ATV' : 'Billiards'} Settings
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Shared hours and default pricing. Individual {unitPlural.toLowerCase()} can override
            pricing.
          </p>
        </CardHeader>
        <CardContent className="space-y-5 p-5 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Name</Label>
              <Input value={typeForm.name} onChange={(e) => setTypeForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea rows={2} value={typeForm.description} onChange={(e) => setTypeForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Landing page cover image</Label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="flex h-28 w-44 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted">
                  {typeForm.imageUrl ? (
                    <img
                      src={typeForm.imageUrl}
                      alt={`${typeForm.name || unitLabel} cover`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImagePlus className="h-7 w-7 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    ref={typeFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void handleTypeImage(file)
                      e.target.value = ''
                    }}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => typeFileRef.current?.click()}
                      disabled={uploadingTypeImage}
                    >
                      {uploadingTypeImage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {typeForm.imageUrl ? 'Replace image' : 'Upload image'}
                    </Button>
                    {typeForm.imageUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setTypeForm((p) => ({ ...p, imageUrl: '' }))}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Shown in the landing page section. JPG, PNG, or WebP · max 2 MB. Individual{' '}
                    {unitLabel.toLowerCase()} images are used when this is empty.
                  </p>
                </div>
              </div>
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
            <Button onClick={saveType} loading={savingType} disabled={uploadingTypeImage}>
              Save settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/70 shadow-sm">
        <CardHeader className="border-b bg-gradient-to-r from-primary/5 via-background to-background">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                <UnitIcon className="h-4 w-4" /> Inventory
              </div>
              <CardTitle className="font-display text-xl">{unitPlural}</CardTitle>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Manage each {unitLabel.toLowerCase()} individually. Customers choose a specific{' '}
                {unitLabel.toLowerCase()} when they make a reservation.
              </p>
              <div className="flex flex-wrap gap-2 pt-2 text-xs">
                <span className="rounded-full border bg-background px-2.5 py-1 font-medium">
                  {inventoryStats.total} total
                </span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                  {inventoryStats.available} available
                </span>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-medium text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300">
                  {inventoryStats.maintenance} maintenance
                </span>
                {inventoryStats.inactive > 0 && (
                  <span className="rounded-full border bg-muted px-2.5 py-1 font-medium text-muted-foreground">
                    {inventoryStats.inactive} inactive
                  </span>
                )}
              </div>
            </div>
            <Button onClick={openAddUnit} className="w-full shrink-0 sm:w-auto">
              <Plus className="h-4 w-4" /> Add {unitLabel}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-5 sm:p-6">
          {unitsLoading ? (
            <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading {unitPlural.toLowerCase()}…
            </div>
          ) : units.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 p-8 text-center">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UnitIcon className="h-6 w-6" />
              </span>
              <p className="font-display text-lg font-semibold">No {unitPlural.toLowerCase()} yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Add your first {unitLabel.toLowerCase()} to make it available for reservations.
              </p>
              <Button className="mt-5" onClick={openAddUnit}>
                <Plus className="h-4 w-4" /> Add {unitLabel}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {units.map((unit) => (
                <article
                  key={unit.id}
                  className="group overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                    {unit.imageUrl ? (
                      <img
                        src={unit.imageUrl}
                        alt={unit.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-muted to-muted/40 text-muted-foreground">
                        <UnitIcon className="h-8 w-8 opacity-60" />
                        <span className="text-xs">No image</span>
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                    <Badge
                      className={cn(
                        'absolute right-3 top-3 border-0 shadow-sm',
                        !unit.isActive
                          ? 'bg-slate-700 text-white hover:bg-slate-700'
                          : unit.status === 'maintenance'
                            ? 'bg-amber-500 text-white hover:bg-amber-500'
                            : 'bg-emerald-600 text-white hover:bg-emerald-600',
                      )}
                    >
                      {!unit.isActive
                        ? 'Inactive'
                        : unit.status === 'maintenance'
                          ? 'Maintenance'
                          : 'Available'}
                    </Badge>
                    {unit.identifier && (
                      <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/45 px-2.5 py-1 font-mono text-[11px] font-medium text-white backdrop-blur-sm">
                        <Hash className="h-3 w-3" /> {unit.identifier}
                      </span>
                    )}
                  </div>
                  <div className="space-y-4 p-4">
                    <div>
                      <h3 className="font-display text-lg font-semibold text-foreground">
                        {unit.name}
                      </h3>
                      <p className="mt-1 min-h-10 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                        {unit.description || `Managed ${unitLabel.toLowerCase()} ready for booking.`}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl border bg-muted/30 p-2.5">
                        <p className="text-muted-foreground">Weekday</p>
                        <p className="mt-0.5 font-semibold text-foreground">
                          {formatCurrency(unit.weekdayRate)} / hr
                        </p>
                      </div>
                      <div className="rounded-xl border bg-muted/30 p-2.5">
                        <p className="text-muted-foreground">Weekend</p>
                        <p className="mt-0.5 font-semibold text-foreground">
                          {formatCurrency(unit.weekendRate)} / hr
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Banknote className="h-3.5 w-3.5 text-primary" /> Base{' '}
                        {formatCurrency(unit.hourlyRate)} / hr
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-primary" /> Max {unit.maxPlayers}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 border-t pt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => openEditUnit(unit)}
                      >
                        <Pencil className="h-4 w-4" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={
                          unit.status === 'available' ? 'Set to maintenance' : 'Mark as available'
                        }
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
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Delete ${unit.name}`}
                        title={`Delete ${unit.name}`}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeleteUnitTarget(unit)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </article>
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
                <TableHead>Payment</TableHead>
                <TableHead className="w-[1%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookingsLoading ? (
                <TableRow><TableCell colSpan={9} className="py-10 text-center text-muted-foreground">Loading reservations…</TableCell></TableRow>
              ) : filteredBookings.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="py-10 text-center text-muted-foreground">No reservations match your filters.</TableCell></TableRow>
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
                    <TableCell><PaymentStatusBadge status={booking.paymentStatus} /></TableCell>
                    <TableCell className="w-[1%] text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" title="View payment details" onClick={() => setPaymentBooking(booking)}><Receipt className="h-4 w-4 text-primary" /></Button>
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

      <Dialog
        open={unitDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeUnitDialog()
        }}
      >
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto p-0">
          <DialogHeader className="border-b bg-muted/30 px-6 py-5 pr-12 text-left">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <UnitIcon className="h-5 w-5" />
              </span>
              <div>
                <DialogTitle className="font-display text-xl">
                  {editingUnit ? `Edit ${unitLabel}` : `Add ${unitLabel}`}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {editingUnit
                    ? `Update the details, pricing, and availability for ${editingUnit.name}.`
                    : `Create a new ${unitLabel.toLowerCase()} without leaving this page.`}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form
            onSubmit={(event) => {
              event.preventDefault()
              void saveUnit()
            }}
          >
            <div className="space-y-7 px-6 py-5">
              <section className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Basic information</h3>
                  <p className="text-xs text-muted-foreground">
                    Give this {unitLabel.toLowerCase()} a clear name and reference number.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`${type}-unit-name`}>{unitLabel} name / number *</Label>
                    <Input
                      id={`${type}-unit-name`}
                      autoFocus
                      required
                      value={unitForm.name}
                      onChange={(event) =>
                        setUnitForm((previous) => ({ ...previous, name: event.target.value }))
                      }
                      placeholder={type === 'atv' ? 'ATV 1' : 'Table 1'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${type}-unit-identifier`}>Identifier</Label>
                    <Input
                      id={`${type}-unit-identifier`}
                      value={unitForm.identifier ?? ''}
                      onChange={(event) =>
                        setUnitForm((previous) => ({
                          ...previous,
                          identifier: event.target.value,
                        }))
                      }
                      placeholder={type === 'atv' ? 'ATV-01' : 'TBL-01'}
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional internal label or asset number.
                    </p>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor={`${type}-unit-description`}>Description</Label>
                    <Textarea
                      id={`${type}-unit-description`}
                      rows={3}
                      value={unitForm.description}
                      onChange={(event) =>
                        setUnitForm((previous) => ({
                          ...previous,
                          description: event.target.value,
                        }))
                      }
                      placeholder={`Describe this ${unitLabel.toLowerCase()} for administrators and guests.`}
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-4 border-t pt-6">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Photo</h3>
                  <p className="text-xs text-muted-foreground">
                    Add a clear image so guests can identify the correct {unitLabel.toLowerCase()}.
                  </p>
                </div>
                <div className="flex flex-col gap-4 rounded-2xl border bg-muted/20 p-4 sm:flex-row sm:items-center">
                  <div className="flex aspect-video w-full shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted sm:w-52">
                    {unitImagePreview || unitForm.imageUrl ? (
                      <img
                        src={unitImagePreview || unitForm.imageUrl}
                        alt={unitForm.name || unitLabel}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ImagePlus className="h-8 w-8" />
                        <span className="text-xs">No image selected</span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-3">
                    <input
                      ref={unitFileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) handleUnitImage(file)
                        event.target.value = ''
                      }}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => unitFileRef.current?.click()}
                        disabled={savingUnit || uploadingUnitImage}
                      >
                        <Upload className="h-4 w-4" />
                        {unitImagePreview || unitForm.imageUrl ? 'Replace image' : 'Upload image'}
                      </Button>
                      {(unitImagePreview || unitForm.imageUrl) && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={removeUnitImage}
                          disabled={savingUnit || uploadingUnitImage}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    {unitImageFile && (
                      <p className="truncate text-xs font-medium text-foreground">
                        Selected: {unitImageFile.name}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      JPG, JPEG, PNG, or WebP · maximum 2 MB. The image uploads when you save.
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-4 border-t pt-6">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Pricing and capacity</h3>
                  <p className="text-xs text-muted-foreground">
                    Set the hourly rental prices and participant limit for this item.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor={`${type}-unit-base-rate`}>Rental price / hour</Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        ₱
                      </span>
                      <Input
                        id={`${type}-unit-base-rate`}
                        className="pl-7"
                        type="number"
                        min={0}
                        step="0.01"
                        value={unitForm.hourlyRate}
                        onChange={(event) =>
                          setUnitForm((previous) => ({
                            ...previous,
                            hourlyRate: Number(event.target.value),
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${type}-unit-weekday-rate`}>Weekday / hour</Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        ₱
                      </span>
                      <Input
                        id={`${type}-unit-weekday-rate`}
                        className="pl-7"
                        type="number"
                        min={0}
                        step="0.01"
                        value={unitForm.weekdayRate}
                        onChange={(event) =>
                          setUnitForm((previous) => ({
                            ...previous,
                            weekdayRate: Number(event.target.value),
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${type}-unit-weekend-rate`}>Weekend / hour</Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        ₱
                      </span>
                      <Input
                        id={`${type}-unit-weekend-rate`}
                        className="pl-7"
                        type="number"
                        min={0}
                        step="0.01"
                        value={unitForm.weekendRate}
                        onChange={(event) =>
                          setUnitForm((previous) => ({
                            ...previous,
                            weekendRate: Number(event.target.value),
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${type}-unit-capacity`}>Max participants</Label>
                    <Input
                      id={`${type}-unit-capacity`}
                      type="number"
                      min={1}
                      required
                      value={unitForm.maxPlayers}
                      onChange={(event) =>
                        setUnitForm((previous) => ({
                          ...previous,
                          maxPlayers: Number(event.target.value),
                        }))
                      }
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-4 border-t pt-6">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Availability</h3>
                  <p className="text-xs text-muted-foreground">
                    Control whether this {unitLabel.toLowerCase()} can be selected for new bookings.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Current status</Label>
                    <Select
                      value={unitForm.status}
                      onValueChange={(value) =>
                        setUnitForm((previous) => ({
                          ...previous,
                          status: value as ActivityUnitStatus,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available for booking</SelectItem>
                        <SelectItem value="maintenance">Under maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-muted/20 p-4 transition-colors hover:bg-muted/40">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 accent-primary"
                      checked={unitForm.isActive}
                      onChange={(event) =>
                        setUnitForm((previous) => ({
                          ...previous,
                          isActive: event.target.checked,
                        }))
                      }
                    />
                    <span>
                      <span className="block text-sm font-medium text-foreground">
                        Active and visible
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                        Show this item to guests when its status is available.
                      </span>
                    </span>
                  </label>
                </div>
              </section>
            </div>

            <DialogFooter className="sticky bottom-0 border-t bg-background/95 px-6 py-4 backdrop-blur-sm">
              <Button
                type="button"
                variant="outline"
                onClick={closeUnitDialog}
                disabled={savingUnit || uploadingUnitImage}
              >
                Cancel
              </Button>
              <Button type="submit" loading={savingUnit || uploadingUnitImage}>
                {editingUnit ? 'Save changes' : `Save ${unitLabel}`}
              </Button>
            </DialogFooter>
          </form>
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

      <Dialog open={!!paymentBooking} onOpenChange={(open) => !open && setPaymentBooking(null)}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Payment details</DialogTitle>
            <DialogDescription>
              {paymentBooking?.reference} · {paymentBooking?.customerName}
            </DialogDescription>
          </DialogHeader>
          {paymentBooking && (
            <PaymentDetailsCard
              bookingType={paymentBooking.activityType}
              reference={paymentBooking.reference}
              totalAmount={paymentBooking.totalAmount}
              fallbackStatus={paymentBooking.paymentStatus}
              className="border-0 shadow-none"
            />
          )}
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
            <AdminActivityTab
              type={tab.value}
              unitLabel={tab.unit}
              unitPlural={tab.units}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
