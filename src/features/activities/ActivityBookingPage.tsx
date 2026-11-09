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
  Clock,
  Gauge,
  ShieldCheck,
  Users,
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
  listActivities,
  createActivityBooking,
  getPeakActivityInventory,
  isActivityRangeAvailable,
  listBookingsForActivityDate,
} from '@/services/activity.service'
import type { ActivityType } from './types'
import { activityBookingSchema, type ActivityBookingFormValues } from './schema'
import {
  formatBookingDate,
  formatTimeLabel,
  getActivityRate,
  getEndTime,
  generateTimeOptions,
  timeToMinutes,
} from './utils'
import { formatCurrency } from '@/lib/utils'

const today = startOfDay(new Date())
const latestDate = addDays(today, 60)
const defaultBookingDate = format(addDays(today, 1), 'yyyy-MM-dd')

const TYPE_LABELS: Record<ActivityType, { title: string; noun: string; icon: typeof Gauge }> = {
  billiards: { title: 'Billiards', noun: 'table', icon: CalendarDays },
  atv: { title: 'ATV Rental', noun: 'ATV', icon: Gauge },
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

  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewValues, setReviewValues] = useState<ActivityBookingFormValues | null>(null)

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
  const durationHours = Number(watch('durationHours')) || 1
  const quantity = Number(watch('quantity')) || 1
  const players = Number(watch('players')) || 0

  useEffect(() => {
    if (activity && !watch('activityId')) {
      setValue('activityId', activity.id)
    }
  }, [activity, setValue, watch])

  const startOptions = useMemo(
    () => (activity ? generateTimeOptions(activity.openTime, activity.closeTime, 30) : []),
    [activity],
  )

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
  const rate = getActivityRate(activity, bookingDate)

  const availabilityQuery = useQuery({
    queryKey: ['activity-availability', activity?.id, bookingDate],
    queryFn: async () => {
      if (!activity) return []
      return listBookingsForActivityDate(activity.id, bookingDate)
    },
    enabled: Boolean(activity && bookingDate),
  })

  const availableInventory = useMemo(() => {
    if (!activity) return 0
    if (!startTime || !endTime) return activity.inventoryCount
    const occupied = getPeakActivityInventory(
      availabilityQuery.data ?? [],
      startTime,
      endTime,
    )
    return Math.max(0, activity.inventoryCount - occupied)
  }, [activity, availabilityQuery.data, endTime, startTime])

  useEffect(() => {
    if (availableInventory > 0 && quantity > availableInventory) {
      setValue('quantity', availableInventory, { shouldValidate: true })
    }
  }, [availableInventory, quantity, setValue])

  const participantCapacity = activity ? activity.maxPlayers * quantity : 0
  const total = rate * durationHours * quantity

  const mutation = useMutation({
    mutationFn: async (values: ActivityBookingFormValues) => {
      if (!activity) throw new Error('Activity not available.')
      return createActivityBooking({
        activityId: activity.id,
        customerName: values.customerName,
        email: values.email,
        contactNumber: values.contactNumber,
        bookingDate: values.bookingDate,
        startTime: values.startTime,
        endTime: getEndTime(values.startTime, values.durationHours),
        durationHours: values.durationHours,
        quantity: Number(values.quantity),
        players: Number(values.players),
        notes: values.notes ?? '',
      })
    },
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: ['activity-bookings'] })
      toast.success(`Booking received · ${booking.reference}`)
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
    const end = getEndTime(values.startTime, values.durationHours)
    if (end > activity.closeTime) {
      toast.error('Please choose a shorter duration or an earlier start time.')
      return
    }
    if (values.quantity > activity.inventoryCount) {
      toast.error(`You can reserve up to ${activity.inventoryCount} at a time.`)
      return
    }
    const capacity = activity.maxPlayers * values.quantity
    if (values.players > capacity) {
      toast.error(`The selected quantity hosts up to ${capacity} participants.`)
      return
    }
    const available = await isActivityRangeAvailable(
      activity.id,
      values.bookingDate,
      values.startTime,
      end,
      values.quantity,
    )
    if (!available) {
      toast.error('Not enough units are available for that time slot.')
      availabilityQuery.refetch()
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
            Our team is still setting up online booking for this activity. Please contact the front
            desk to reserve.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link to="/">Back to home</Link>
          </Button>
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
              Book your {meta.noun} session
            </h1>
            <p className="mt-4 text-muted-foreground">
              Choose a date and time, tell us who’s coming, and we’ll prepare everything for your
              visit. No online payment is required.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(handleReview)} noValidate>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-xl">{activity.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{activity.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1">
                      <Clock className="h-3 w-3 text-primary" />
                      {formatTimeLabel(activity.openTime)} – {formatTimeLabel(activity.closeTime)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1">
                      <Users className="h-3 w-3 text-primary" />
                      {activity.inventoryCount}{' '}
                      {activityType === 'atv'
                        ? `ATV${activity.inventoryCount === 1 ? '' : 's'}`
                        : `table${activity.inventoryCount === 1 ? '' : 's'}`}{' '}
                      · up to {activity.maxPlayers} guests each
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1">
                      <Check className="h-3 w-3 text-primary" />
                      Weekday {formatCurrency(activity.weekdayRate)} / hour · Weekend{' '}
                      {formatCurrency(activity.weekendRate)} / hour
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display text-xl">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    Pick a date and time
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Availability updates automatically based on confirmed reservations.
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

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

                    <div className="space-y-2">
                      <Label>{activityType === 'atv' ? 'ATVs' : 'Tables'}</Label>
                      <Select
                        value={String(quantity)}
                        onValueChange={(value) =>
                          setValue('quantity', Number(value), {
                            shouldValidate: true,
                            shouldDirty: true,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select quantity" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from(
                            { length: Math.max(availableInventory, 1) },
                            (_, index) => index + 1,
                          ).map((option) => (
                            <SelectItem
                              key={option}
                              value={String(option)}
                              disabled={option > availableInventory}
                            >
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.quantity?.message && (
                        <p className="text-sm text-destructive">{errors.quantity.message}</p>
                      )}
                    </div>
                  </div>

                  {startTime && endTime && (
                    <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        {availabilityQuery.isFetching
                          ? 'Checking availability…'
                          : `${availableInventory} of ${activity.inventoryCount} ${
                              activityType === 'atv' ? 'ATVs' : 'tables'
                            } available from ${formatTimeLabel(startTime)} – ${formatTimeLabel(
                              endTime,
                            )} on ${formatBookingDate(bookingDate, 'MMM d, yyyy')}.`}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-xl">Your details</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    We’ll use these details to prepare your booking.
                  </p>
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
                        Up to {participantCapacity} participants for {quantity}{' '}
                        {activityType === 'atv'
                          ? `ATV${quantity === 1 ? '' : 's'}`
                          : `table${quantity === 1 ? '' : 's'}`}.
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
                      <span className="text-muted-foreground">Activity</span>
                      <span className="font-medium">{activity.name}</span>
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
                      <span className="text-muted-foreground">
                        {activityType === 'atv' ? 'ATVs' : 'Tables'}
                      </span>
                      <span className="font-medium">{quantity}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Participants</span>
                      <span className="font-medium">{players}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Rate</span>
                      <span className="font-medium">{formatCurrency(rate)} / hour</span>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex items-end justify-between">
                        <span className="text-muted-foreground">Estimated total</span>
                        <span className="font-display text-2xl font-bold text-primary">
                          {formatCurrency(total)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatCurrency(rate)} × {durationHours} hour
                        {durationHours === 1 ? '' : 's'} × {quantity}{' '}
                        {activityType === 'atv' ? 'ATV' : 'table'}
                        {quantity === 1 ? '' : 's'}.
                      </p>
                    </div>
                    <Button type="submit" size="lg" className="w-full rounded-full">
                      Review booking
                    </Button>
                  </CardContent>
                </Card>
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  Your slot is held only after you confirm.
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      {reviewOpen && reviewValues && (
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
                <span className="text-muted-foreground">Activity</span>
                <span className="font-medium">{activity.name}</span>
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
                <span className="text-muted-foreground">
                  {activityType === 'atv' ? 'ATVs' : 'Tables'}
                </span>
                <span className="font-medium">{reviewValues.quantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Participants</span>
                <span className="font-medium">{reviewValues.players}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold text-primary">
                  {formatCurrency(
                    getActivityRate(activity, reviewValues.bookingDate) *
                      reviewValues.durationHours *
                      reviewValues.quantity,
                  )}
                </span>
              </div>
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
                onClick={() => mutation.mutate(reviewValues)}
                loading={mutation.isPending}
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
