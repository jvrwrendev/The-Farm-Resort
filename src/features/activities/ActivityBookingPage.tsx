import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addDays, format, startOfDay } from 'date-fns'
import { toast } from 'sonner'
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Gauge,
  Image as ImageIcon,
  QrCode,
  Receipt,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react'
import { PublicLayout } from '@/components/layout/Navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DatePickerField } from '@/features/booking/DatePickerField'
import {
  createActivityBooking,
  isUnitRangeAvailable,
  listActivities,
  listActivityBookings,
  listActivityUnits,
} from '@/services/activity.service'
import type { ActivityBooking, ActivityType, ActivityUnit } from './types'
import { PaymentCheckout } from '@/features/payment/PaymentCheckout'
import { calculateDownPayment, getPaymentSettings, submitPayment, uploadPaymentReceipt } from '@/services/payment.service'
import { activityBookingSchema, type ActivityBookingFormValues } from './schema'
import {
  formatBookingDate,
  formatTimeLabel,
  generateTimeOptions,
  getEndTime,
  isWeekendDate,
  timeToMinutes,
} from './utils'
import { cn, formatCurrency } from '@/lib/utils'

const today = startOfDay(new Date())
const latestDate = addDays(today, 60)
const defaultBookingDate = format(addDays(today, 1), 'yyyy-MM-dd')

const TYPE_LABELS: Record<
  ActivityType,
  { title: string; noun: string; unit: string; icon: typeof Gauge }
> = {
  billiards: { title: 'Billiards', noun: 'table', unit: 'table', icon: CalendarDays },
  atv: { title: 'ATV Rental', noun: 'ATV', unit: 'ATV', icon: Gauge },
}

function getUnitRate(unit: ActivityUnit | undefined, date: string): number {
  if (!unit) return 0
  return isWeekendDate(date) ? unit.weekendRate : unit.weekdayRate
}

function unitAvailableForSlot(
  unit: ActivityUnit,
  bookings: Array<{ unitId: string | null; startTime: string; endTime: string }>,
  startTime: string,
  endTime: string,
): boolean {
  if (unit.status !== 'available' || !unit.isActive) return false
  if (!startTime || !endTime) return true
  return !bookings.some(
    (booking) =>
      booking.unitId === unit.id &&
      startTime < booking.endTime &&
      endTime > booking.startTime,
  )
}

export default function ActivityBookingPage({
  activityType: forcedType,
}: {
  activityType?: ActivityType
} = {}) {
  const params = useParams<{ type: ActivityType }>()
  const activityType: ActivityType =
    forcedType ?? (params.type === 'atv' ? 'atv' : 'billiards')
  const meta = TYPE_LABELS[activityType]

  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['activities', activityType],
    queryFn: () => listActivities(activityType),
  })
  const activity = activities[0]

  const { data: units = [], isLoading: unitsLoading } = useQuery({
    queryKey: ['activity-units', activityType],
    queryFn: () => listActivityUnits(activityType),
    enabled: Boolean(activity),
  })
  const { data: paymentSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['payment-settings'],
    queryFn: getPaymentSettings,
  })

  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewValues, setReviewValues] = useState<ActivityBookingFormValues | null>(null)
  const [createdBooking] = useState<ActivityBooking | null>(null)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState('')
  const [receiptUrl, setReceiptUrl] = useState('')
  const [uploadingReceipt, setUploadingReceipt] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ActivityBookingFormValues>({
    resolver: zodResolver(activityBookingSchema) as Resolver<ActivityBookingFormValues>,
    defaultValues: {
      customerName: '',
      email: '',
      contactNumber: '',
      activityId: '',
      unitId: '',
      bookingDate: defaultBookingDate,
      startTime: '',
      durationHours: 1,
      quantity: 1,
      players: 2,
      notes: '',
    },
  })

  const bookingDate = watch('bookingDate')
  const startTime = watch('startTime')
  const unitId = watch('unitId')
  const durationHours = Number(watch('durationHours')) || 1
  const players = Number(watch('players')) || 0

  useEffect(() => {
    if (activity && !watch('activityId')) {
      setValue('activityId', activity.id)
    }
  }, [activity, setValue, watch])

  const startOptions = useMemo(() => {
    if (!activity) return []
    const opts = generateTimeOptions(activity.openTime, activity.closeTime, 30)
    const today = format(new Date(), 'yyyy-MM-dd')
    if (bookingDate !== today) return opts
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes()
    return opts.filter((t) => timeToMinutes(t) > nowMin)
  }, [activity, bookingDate])

  const maxDuration = useMemo(() => {
    if (!activity || !startTime) return 0
    return Math.floor((timeToMinutes(activity.closeTime) - timeToMinutes(startTime)) / 60)
  }, [activity, startTime])

  const durationOptions = useMemo(() => {
    const limit = startTime ? Math.max(0, Math.min(6, maxDuration)) : 6
    return Array.from({ length: limit }, (_, index) => index + 1)
  }, [maxDuration, startTime])

  useEffect(() => {
    if (maxDuration > 0 && durationHours > maxDuration) {
      setValue('durationHours', maxDuration)
    }
  }, [durationHours, maxDuration, setValue])

  const endTime = startTime ? getEndTime(startTime, durationHours) : ''

  const { data: dayBookings = [], isFetching: availabilityFetching } = useQuery({
    queryKey: ['activity-day-bookings', activityType, bookingDate],
    queryFn: () => listActivityBookings(activityType),
    select: (bookings) =>
      bookings.filter(
        (booking) =>
          booking.bookingDate === bookingDate &&
          ['pending', 'confirmed', 'checked_in', 'completed'].includes(booking.status),
      ),
    enabled: Boolean(activity && bookingDate),
  })

  useEffect(() => {
    setValue('unitId', '', { shouldValidate: true })
  }, [bookingDate, startTime, durationHours, setValue])

  const selectedUnit = units.find((unit) => unit.id === unitId)
  const rate = getUnitRate(selectedUnit, bookingDate)
  const total = rate * durationHours
  const participantCapacity = selectedUnit?.maxPlayers ?? activity?.maxPlayers ?? 1

  useEffect(() => {
    if (selectedUnit && players > selectedUnit.maxPlayers) {
      setValue('players', selectedUnit.maxPlayers, { shouldValidate: true })
    }
  }, [players, selectedUnit, setValue])

  const mutation = useMutation({
    mutationFn: async ({ values, receiptUrl }: { values: ActivityBookingFormValues; receiptUrl: string }) => {
      if (!activity) throw new Error('Activity not available.')
      const now = new Date()
      const todayStr = format(now, 'yyyy-MM-dd')
      if (values.bookingDate === todayStr) {
        const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
        if (toMin(values.startTime) < now.getHours() * 60 + now.getMinutes()) {
          throw new Error('The selected start time has already passed.')
        }
      }
      const booking = await createActivityBooking({
        activityId: activity.id,
        unitId: values.unitId,
        customerName: values.customerName,
        email: values.email,
        contactNumber: values.contactNumber,
        bookingDate: values.bookingDate,
        startTime: values.startTime,
        endTime: getEndTime(values.startTime, values.durationHours),
        durationHours: values.durationHours,
        quantity: 1,
        players: Number(values.players),
        notes: values.notes ?? '',
      })
      if (receiptUrl) {
        await submitPayment({ bookingType: activityType, bookingReference: booking.reference, totalAmount: booking.totalAmount, receiptUrl })
      }
      return booking
    },
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: ['activity-bookings'] })
      queryClient.invalidateQueries({ queryKey: ['activity-day-bookings'] })
      toast.success(`Booking received · ${booking.reference}`)
      setReviewOpen(false)
      navigate(`/${activityType}/confirmation/${booking.reference}`)
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Unable to submit the booking.')
    },
  })

  const handleReview = async (values: ActivityBookingFormValues) => {
    if (!activity) {
      toast.error('This activity is not available right now.')
      return
    }
    const unit = units.find((item) => item.id === values.unitId)
    if (!unit) {
      toast.error(`Please select a ${meta.unit}.`)
      return
    }
    if (unit.status === 'maintenance') {
      toast.error(`This ${meta.unit} is currently under maintenance.`)
      return
    }
    const end = getEndTime(values.startTime, values.durationHours)
    if (end > activity.closeTime) {
      toast.error('Please choose a shorter duration or an earlier start time.')
      return
    }
    if (values.players > unit.maxPlayers) {
      toast.error(`This ${meta.unit} hosts up to ${unit.maxPlayers} participants.`)
      return
    }
    const available = await isUnitRangeAvailable(
      unit.id,
      values.bookingDate,
      values.startTime,
      end,
    )
    if (!available) {
      toast.error(`That ${meta.unit} is already booked for the selected time.`)
      return
    }
    setReviewValues(values)
    setReviewOpen(true)
  }

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-4xl px-4 py-32 text-center text-muted-foreground sm:px-6">
          Loading {meta.title.toLowerCase()}…
        </div>
      </PublicLayout>
    )
  }

  if (!activity) {
    return (
      <PublicLayout>
        <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-32 text-center sm:px-6">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <meta.icon className="h-7 w-7" />
          </span>
          <h1 className="font-display mt-5 text-2xl font-bold">
            {meta.title} booking is not open yet
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Our team is still setting up online booking for this activity. Please contact the
            front desk to reserve.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </PublicLayout>
    )
  }

  const reviewUnit = reviewValues ? units.find((u) => u.id === reviewValues.unitId) : undefined
  const reviewRate = getUnitRate(reviewUnit, reviewValues?.bookingDate ?? bookingDate)
  const reviewTotal = reviewRate * (reviewValues?.durationHours ?? 0)
  const { downPayment: reviewDown, remaining: reviewRemaining } = calculateDownPayment(reviewTotal)

  const handleReceiptFile = (selected: File) => {
    const ACCEPTED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!ACCEPTED.includes(selected.type)) { toast.error('Unsupported file type. Please use JPG, PNG, or WebP.'); return }
    if (selected.size > 2 * 1024 * 1024) { toast.error('File is too large. Maximum size is 2 MB.'); return }
    setReceiptFile(selected)
    setReceiptPreview(URL.createObjectURL(selected))
    setReceiptUrl('')
  }

  if (createdBooking) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-4xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Step 2 of 2
            </span>
            <h1 className="font-display mt-4 text-3xl font-bold sm:text-4xl">Complete your down payment</h1>
            <p className="mt-3 text-muted-foreground">
              Booking <span className="font-mono font-semibold text-foreground">{createdBooking.reference}</span> received. Pay 50% now to secure it.
            </p>
          </div>
          <PaymentCheckout
            bookingType={activityType}
            bookingReference={createdBooking.reference}
            totalAmount={createdBooking.totalAmount}
            onSubmitted={() => navigate(`/${activityType}/confirmation/${createdBooking.reference}`)}
          />
        </div>
      </PublicLayout>
    )
  }

  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
          </Button>
          <div className="mx-auto mt-5 max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Reserve {meta.title}
            </span>
            <h1 className="font-display mt-4 text-3xl font-bold sm:text-4xl lg:text-5xl">
              Choose your {meta.noun}
            </h1>
            <p className="mt-4 text-muted-foreground">
              Select your preferred {meta.unit}, pick a time, and we’ll prepare it for your visit.
              A 50% GCash down payment is required to secure your reservation.
            </p>

          </div>
        </div>

        <form onSubmit={handleSubmit(handleReview)} noValidate>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display text-xl">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    Pick a date and time
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Select a time first, then choose an available {meta.unit}.
                  </p>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="max-w-sm space-y-2">
                    <Label>Booking date</Label>
                    <DatePickerField
                      value={bookingDate}
                      onChange={(value) =>
                        setValue('bookingDate', value, { shouldValidate: true, shouldDirty: true })
                      }
                      disabledDate={(date) => date < today || date > latestDate}
                      placeholder="Select a booking date"
                      ariaLabel={`Pick a ${meta.title} booking date`}
                    />
                    {errors.bookingDate?.message && (
                      <p className="text-sm text-destructive">{errors.bookingDate.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Start time</Label>
                      <Select
                        value={startTime}
                        onValueChange={(value) =>
                          setValue('startTime', value, { shouldValidate: true, shouldDirty: true })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select start time" />
                        </SelectTrigger>
                        <SelectContent>
                          {startOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {formatTimeLabel(option)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.startTime?.message && (
                        <p className="text-sm text-destructive">{errors.startTime.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Duration</Label>
                      <Select
                        value={String(durationHours)}
                        onValueChange={(value) =>
                          setValue('durationHours', Number(value), {
                            shouldValidate: true,
                            shouldDirty: true,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent>
                          {durationOptions.map((option) => (
                            <SelectItem key={option} value={String(option)}>
                              {option} hour{option === 1 ? '' : 's'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.durationHours?.message && (
                        <p className="text-sm text-destructive">{errors.durationHours.message}</p>
                      )}
                    </div>
                  </div>

                  {startTime && endTime && (
                    <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        {availabilityFetching
                          ? 'Checking availability…'
                          : `Showing ${meta.unit} availability for ${formatTimeLabel(
                              startTime,
                            )} – ${formatTimeLabel(endTime)} on ${formatBookingDate(
                              bookingDate,
                              'MMM d, yyyy',
                            )}.`}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-xl">
                    Select your {meta.unit}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Each {meta.unit} has its own schedule. Booked or maintenance units can’t be
                    selected for the chosen time.
                  </p>
                </CardHeader>
                <CardContent>
                  {unitsLoading ? (
                    <p className="text-sm text-muted-foreground">Loading {meta.unit}s…</p>
                  ) : units.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No {meta.unit}s are available yet. Please contact the front desk.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {units.map((unit) => {
                        const slotAvailable = unitAvailableForSlot(
                          unit,
                          dayBookings,
                          startTime,
                          endTime,
                        )
                        const isSelected = unit.id === unitId
                        const statusLabel =
                          unit.status === 'maintenance'
                            ? 'Maintenance'
                            : startTime && endTime && !slotAvailable
                              ? 'Reserved'
                              : 'Available'
                        const selectable = slotAvailable && Boolean(startTime && endTime)

                        return (
                          <button
                            key={unit.id}
                            type="button"
                            disabled={!selectable}
                            onClick={() => {
                              if (!selectable) return
                              setValue('unitId', unit.id, {
                                shouldValidate: true,
                                shouldDirty: true,
                              })
                            }}
                            className={cn(
                              'group overflow-hidden rounded-xl border text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                              isSelected &&
                                'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20',
                              !isSelected &&
                                selectable &&
                                'border-border bg-card hover:border-primary/40 hover:shadow-sm',
                              !selectable && 'cursor-not-allowed border-border/60 opacity-70',
                            )}
                          >
                            <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                              {unit.imageUrl ? (
                                <img
                                  src={unit.imageUrl}
                                  alt={unit.name}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                  <ImageIcon className="h-7 w-7" />
                                </div>
                              )}
                              <span
                                className={cn(
                                  'absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                                  statusLabel === 'Available' && 'bg-emerald-500/90 text-white',
                                  statusLabel === 'Reserved' && 'bg-amber-500/90 text-white',
                                  statusLabel === 'Maintenance' && 'bg-slate-700/90 text-white',
                                )}
                              >
                                {statusLabel}
                              </span>
                              {isSelected && (
                                <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                                  <Check className="h-3.5 w-3.5" />
                                </span>
                              )}
                            </div>
                            <div className="space-y-1 p-3">
                              <p className="text-sm font-semibold text-foreground">{unit.name}</p>
                              {unit.description && (
                                <p className="line-clamp-2 text-xs text-muted-foreground">
                                  {unit.description}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {formatCurrency(getUnitRate(unit, bookingDate))} / hour · up to{' '}
                                {unit.maxPlayers} guests
                              </p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                  {errors.unitId?.message && (
                    <p className="mt-2 text-sm text-destructive">{errors.unitId.message}</p>
                  )}
                  {!startTime && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Choose a date and start time to check which {meta.unit}s are available.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-xl">Your details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="activity-customerName">Full name</Label>
                      <Input
                        id="activity-customerName"
                        placeholder="Juan Dela Cruz"
                        error={errors.customerName?.message}
                        {...register('customerName')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="activity-email">Email address</Label>
                      <Input
                        id="activity-email"
                        type="email"
                        placeholder="you@example.com"
                        error={errors.email?.message}
                        {...register('email')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="activity-contact">Contact number</Label>
                      <Input
                        id="activity-contact"
                        placeholder="+63 9XX XXX XXXX"
                        error={errors.contactNumber?.message}
                        {...register('contactNumber')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="activity-players">Number of participants</Label>
                      <Input
                        id="activity-players"
                        type="number"
                        min={1}
                        max={participantCapacity}
                        error={errors.players?.message}
                        {...register('players')}
                      />
                      <p className="text-xs text-muted-foreground">
                        {selectedUnit
                          ? `Up to ${selectedUnit.maxPlayers} participants for ${selectedUnit.name}.`
                          : `Select a ${meta.unit} to see capacity.`}
                      </p>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="activity-notes">Additional notes (optional)</Label>
                      <Textarea
                        id="activity-notes"
                        placeholder="Anything we should know before your visit…"
                        error={errors.notes?.message}
                        {...register('notes')}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <div className="space-y-4 lg:sticky lg:top-28">
                <Card>
                  <CardHeader>
                    <CardTitle className="font-display text-lg">Booking summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{meta.unit}</span>
                      <span className="font-medium">{selectedUnit?.name ?? '—'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Date</span>
                      <span className="font-medium">
                        {bookingDate ? formatBookingDate(bookingDate, 'MMM d, yyyy') : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Time</span>
                      <span className="font-medium">
                        {startTime && endTime
                          ? `${formatTimeLabel(startTime)} – ${formatTimeLabel(endTime)}`
                          : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium">
                        {durationHours} hour{durationHours === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Participants</span>
                      <span className="font-medium">{players}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Rate</span>
                      <span className="font-medium">
                        {selectedUnit ? `${formatCurrency(rate)} / hour` : '—'}
                      </span>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex items-end justify-between">
                        <span className="text-muted-foreground">Estimated total</span>
                        <span className="font-display text-2xl font-bold text-primary">
                          {formatCurrency(total)}
                        </span>
                      </div>
                      {selectedUnit && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatCurrency(rate)} × {durationHours} hour
                          {durationHours === 1 ? '' : 's'} · {selectedUnit.name}
                        </p>
                      )}
                    </div>
                    <Button type="submit" size="lg" className="w-full rounded-full">
                      Review booking
                    </Button>
                  </CardContent>
                </Card>
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  A 50% GCash down payment is required after confirming.
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      {reviewOpen && reviewValues && reviewUnit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-background p-6 shadow-xl">
            <h2 className="font-display text-xl font-bold">Review your booking</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Check the details below. Your reservation will be pending until our team confirms it.
            </p>
            <div className="mt-5 space-y-2 rounded-xl border bg-muted/30 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{reviewValues.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{meta.unit}</span>
                <span className="font-medium">{reviewUnit.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">
                  {formatBookingDate(reviewValues.bookingDate, 'MMM d, yyyy')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Time</span>
                <span className="font-medium">
                  {formatTimeLabel(reviewValues.startTime)} –{' '}
                  {formatTimeLabel(getEndTime(reviewValues.startTime, reviewValues.durationHours))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Participants</span>
                <span className="font-medium">{reviewValues.players}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold text-primary">{formatCurrency(reviewTotal)}</span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg border bg-muted/30 p-2 text-center"><p className="text-muted-foreground">Total</p><p className="font-semibold">{formatCurrency(reviewTotal)}</p></div>
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-2 text-center"><p className="text-primary">50% down</p><p className="font-semibold text-primary">{formatCurrency(reviewDown)}</p></div>
              <div className="rounded-lg border bg-muted/30 p-2 text-center"><p className="text-muted-foreground">Remaining</p><p className="font-semibold">{formatCurrency(reviewRemaining)}</p></div>
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-sm font-semibold">GCash QR code</p>
              {settingsLoading ? <p className="text-xs text-muted-foreground">Loading…</p> : (
                <>
                  {paymentSettings?.gcashQrUrl ? <img src={paymentSettings.gcashQrUrl} alt="GCash QR" className="mx-auto max-h-40 rounded-xl border" /> : <div className="flex h-32 items-center justify-center rounded-xl border border-dashed text-muted-foreground"><QrCode className="h-8 w-8" /></div>}
                  <div className="text-xs text-muted-foreground">
                    <p><span className="font-medium text-foreground">Account name:</span> {paymentSettings?.gcashAccountName}</p>
                    <p><span className="font-medium text-foreground">GCash number:</span> {paymentSettings?.gcashNumber}</p>
                    {paymentSettings?.instructions && <p className="mt-1">{paymentSettings.instructions}</p>}
                  </div>
                </>
              )}
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-sm font-semibold">Upload GCash receipt (50% down payment)</p>
              <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" id="actReceiptInput" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleReceiptFile(f) }} />
              {!receiptPreview ? (
                <label htmlFor="actReceiptInput" className="flex h-32 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary">
                  <Upload className="h-6 w-6" />
                  <span className="text-sm font-medium">Click to upload receipt</span>
                </label>
              ) : (
                <div className="relative">
                  <img src={receiptPreview} alt="Receipt preview" className="h-32 w-full rounded-xl object-contain border" />
                  <button type="button" onClick={() => { setReceiptFile(null); setReceiptPreview(''); setReceiptUrl('') }} className="absolute right-2 top-2 rounded-full bg-background/80 p-1 shadow"><X className="h-4 w-4" /></button>
                </div>
              )}
              {receiptFile && <p className="text-xs text-muted-foreground flex items-center gap-1"><Receipt className="h-3.5 w-3.5" /> {receiptFile.name}</p>}
              {receiptFile && !receiptUrl && (
                <Button type="button" size="sm" variant="outline" onClick={async () => {
                  setUploadingReceipt(true)
                  try { const url = await uploadPaymentReceipt(receiptFile); setReceiptUrl(url); toast.success('Receipt uploaded.') }
                  catch (e) { toast.error(e instanceof Error ? e.message : 'Upload failed.') }
                  finally { setUploadingReceipt(false) }
                }} loading={uploadingReceipt}>Upload receipt</Button>
              )}
              {receiptUrl && <p className="text-xs text-primary">Receipt uploaded ✓</p>}
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setReviewOpen(false)}
                disabled={mutation.isPending}
              >
                Edit booking
              </Button>
              <Button
                type="button"
                onClick={() => mutation.mutate({ values: reviewValues!, receiptUrl })}
                loading={mutation.isPending}
                disabled={!receiptUrl}
              >
                Confirm booking
              </Button>
            </div>
          </div>
        </div>
      )}
    </PublicLayout>
  )
}
