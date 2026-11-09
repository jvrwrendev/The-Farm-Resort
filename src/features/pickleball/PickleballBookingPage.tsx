import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
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
  MapPin,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { PublicLayout } from '@/components/layout/Navbar'
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
import { DatePickerField } from '@/features/booking/DatePickerField'
import { PickleballAvailability } from './PickleballAvailability'
import { PickleballBookingSummary } from './PickleballBookingSummary'
import { PICKLEBALL_SETTINGS } from './mockData'
import { pickleballBookingSchema, type PickleballBookingFormValues } from './schema'
import { createPickleballBooking, getPickleballAvailability, isPickleballRangeAvailable } from './service'
import { listPickleballCourts } from '@/services/pickleballCourt.service'
import type { PickleballTimeSlot } from './types'
import { usePickleballStorageSync } from './usePickleballStorageSync'
import { queryKeys } from '@/lib/queryKeys'
import { cn, formatCurrency } from '@/lib/utils'
import {
  formatBookingDate,
  formatTimeLabel,
  formatTimeRange,
  getAvailableEndTimes,
  getDurationHours,
} from './utils'

const today = startOfDay(new Date())
const latestDate = addDays(today, PICKLEBALL_SETTINGS.bookingWindowDays)
const defaultBookingDate = format(addDays(today, 1), 'yyyy-MM-dd')
const EMPTY_SLOTS: PickleballTimeSlot[] = []

export default function PickleballBookingPage() {
  const { data: courts = [] } = useQuery({ queryKey: ['pickleball-courts'], queryFn: listPickleballCourts })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const requestedCourtId = searchParams.get('court')
  const initialCourtId =
    courts.find((court) => court.id === requestedCourtId)?.id ??
    courts[1]?.id ??
    courts[0]?.id ??
    ''

  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewValues, setReviewValues] = useState<PickleballBookingFormValues | null>(null)
  const justBookedRef = useRef(false)

  usePickleballStorageSync()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PickleballBookingFormValues>({
    resolver: zodResolver(pickleballBookingSchema) as Resolver<PickleballBookingFormValues>,
    defaultValues: {
      customerName: '',
      email: '',
      contactNumber: '',
      courtId: initialCourtId,
      bookingDate: defaultBookingDate,
      startTime: '',
      endTime: '',
      players: 2,
      notes: '',
    },
  })

  const courtId = watch('courtId')
  const bookingDate = watch('bookingDate')
  const startTime = watch('startTime')
  const endTime = watch('endTime')
  const players = Number(watch('players')) || 0

  const court = courts.find((c) => c.id === courtId)
  const durationHours = getDurationHours(startTime, endTime)
  const total = (court?.hourlyRate ?? 0) * durationHours

  const availabilityQuery = useQuery({
    queryKey: queryKeys.pickleballAvailability(courtId, bookingDate),
    queryFn: () => getPickleballAvailability(courtId, bookingDate),
    enabled: Boolean(courtId && bookingDate),
    staleTime: 0,
  })

  const slots = availabilityQuery.data ?? EMPTY_SLOTS
  const endOptions = useMemo(
    () => (startTime ? getAvailableEndTimes(slots, startTime) : []),
    [slots, startTime],
  )

  useEffect(() => {
    setValue('startTime', '', { shouldValidate: false })
    setValue('endTime', '', { shouldValidate: false })
  }, [courtId, bookingDate, setValue])

  useEffect(() => {
    if (!startTime || !availabilityQuery.data) return

    const selectedSlot = availabilityQuery.data.find((slot) => slot.startTime === startTime)
    if (selectedSlot && selectedSlot.status !== 'available') {
      setValue('startTime', '', { shouldValidate: false })
      setValue('endTime', '', { shouldValidate: false })
      if (!justBookedRef.current) {
        toast.error('That time slot was just reserved. Please choose another time.')
      }
      return
    }

    if (endTime && endOptions.length > 0 && !endOptions.some((option) => option.value === endTime)) {
      setValue('endTime', endOptions[0].value, { shouldValidate: true })
    }
  }, [availabilityQuery.data, startTime, endTime, endOptions, setValue])

  const mutation = useMutation({
    mutationFn: async (values: PickleballBookingFormValues) =>
      createPickleballBooking({
        customerName: values.customerName,
        email: values.email,
        contactNumber: values.contactNumber,
        courtId: values.courtId,
        bookingDate: values.bookingDate,
        startTime: values.startTime,
        endTime: values.endTime,
        players: Number(values.players),
        notes: values.notes ?? '',
      }),
    onSuccess: (booking) => {
      justBookedRef.current = true
      queryClient.invalidateQueries({ queryKey: ['pickleball'] })
      toast.success(`Court reserved · ${booking.reference}`)
      navigate(`/pickleball/confirmation/${booking.reference}`)
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Unable to reserve the court.')
    },
  })

  const handleSlotSelect = (slot: PickleballTimeSlot) => {
    if (slot.status !== 'available') return

    setValue('startTime', slot.startTime, { shouldValidate: true, shouldDirty: true })
    setValue('endTime', slot.endTime, { shouldValidate: true, shouldDirty: true })
  }

  const handleStartTimeChange = (value: string) => {
    const options = getAvailableEndTimes(slots, value)
    setValue('startTime', value, { shouldValidate: true, shouldDirty: true })
    setValue('endTime', options[0]?.value ?? '', { shouldValidate: true, shouldDirty: true })
  }

  const handleReview = (values: PickleballBookingFormValues) => {
    const selectedCourt = courts.find((c) => c.id === values.courtId)
    if (!selectedCourt) {
      toast.error('Please select a valid court.')
      return
    }

    if (
      !isPickleballRangeAvailable(
        values.courtId,
        values.bookingDate,
        values.startTime,
        values.endTime,
      )
    ) {
      toast.error('That time slot is no longer available. Please choose another time.')
      availabilityQuery.refetch()
      return
    }

    setReviewValues(values)
    setReviewOpen(true)
  }

  const handleConfirm = () => {
    if (!reviewValues) return
    mutation.mutate(reviewValues)
  }

  const reviewCourt = reviewValues ? courts.find((c) => c.id === reviewValues.courtId) : undefined
  const reviewDuration = reviewValues
    ? getDurationHours(reviewValues.startTime, reviewValues.endTime)
    : 0
  const reviewTotal = (reviewCourt?.hourlyRate ?? 0) * reviewDuration

  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link to="/pickleball">
              <ArrowLeft className="h-4 w-4" />
              Back to pickleball
            </Link>
          </Button>
          <div className="mx-auto mt-5 max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Reserve a Court
            </span>
            <h1 className="font-display mt-4 text-3xl font-bold sm:text-4xl lg:text-5xl">
              Book your pickleball session
            </h1>
            <p className="mt-4 text-muted-foreground">
              Choose a court, pick an open hour, and tell us who’s playing. No online payment is
              required.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(handleReview)} noValidate>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-xl">Choose a court</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    All courts are sized for doubles and include lighting and courtside seating.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {courts.map((option) => {
                      const selected = option.id === courtId
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() =>
                            setValue('courtId', option.id, {
                              shouldValidate: true,
                              shouldDirty: true,
                            })
                          }
                          aria-pressed={selected}
                          className={cn(
                            'group overflow-hidden rounded-xl border text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            selected
                              ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                              : 'border-border bg-card hover:border-primary/40 hover:shadow-sm',
                          )}
                        >
                          <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                            {option.imageUrl ? (
                              <img
                                src={option.imageUrl}
                                alt={option.name}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                                No image
                              </div>
                            )}
                            {selected && (
                              <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                                <Check className="h-3.5 w-3.5" />
                              </span>
                            )}
                          </div>
                          <div className="p-3">
                            <p className="text-sm font-semibold text-foreground">{option.name}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {formatCurrency(option.hourlyRate)} / hour · up to {option.maxPlayers}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                  {errors.courtId?.message && (
                    <p className="mt-2 text-sm text-destructive">{errors.courtId.message}</p>
                  )}
                  {court && (
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1">
                        <MapPin className="h-3 w-3 text-primary" />
                        {court.surface}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1">
                        <Users className="h-3 w-3 text-primary" />
                        Up to {court.maxPlayers} players
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1">
                        <Clock className="h-3 w-3 text-primary" />
                        {PICKLEBALL_SETTINGS.slotMinutes}-minute slots
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display text-xl">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    Pick a date and time
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Availability is updated from the mock reservation book. Reserved slots cannot be
                    selected.
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
                      ariaLabel="Pick a pickleball booking date"
                    />
                    {errors.bookingDate?.message && (
                      <p className="text-sm text-destructive">{errors.bookingDate.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Open daily {formatTimeLabel(PICKLEBALL_SETTINGS.openTime)} –{' '}
                      {formatTimeLabel(PICKLEBALL_SETTINGS.closeTime)}. Book up to{' '}
                      {PICKLEBALL_SETTINGS.bookingWindowDays} days ahead.
                    </p>
                  </div>

                  <PickleballAvailability
                    slots={slots}
                    isLoading={availabilityQuery.isLoading}
                    isError={availabilityQuery.isError}
                    onRetry={() => availabilityQuery.refetch()}
                    startTime={startTime}
                    endTime={endTime}
                    onStartTimeChange={(value) => {
                      if (value) handleStartTimeChange(value)
                    }}
                    onEndTimeChange={(value) => {
                      // Radix can emit an empty value when the option list first appears.
                      if (!value) return
                      setValue('endTime', value, { shouldValidate: true, shouldDirty: true })
                    }}
                    onSlotSelect={handleSlotSelect}
                  />

                  {(errors.startTime?.message || errors.endTime?.message) && (
                    <div className="space-y-1">
                      {errors.startTime?.message && (
                        <p className="text-sm text-destructive">{errors.startTime.message}</p>
                      )}
                      {errors.endTime?.message && (
                        <p className="text-sm text-destructive">{errors.endTime.message}</p>
                      )}
                    </div>
                  )}

                  {startTime && endTime && durationHours > 0 && (
                    <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        Holding {formatTimeRange(startTime, endTime)} ({durationHours} hour
                        {durationHours === 1 ? '' : 's'}) for {court?.name ?? 'your court'} on{' '}
                        {formatBookingDate(bookingDate)}.
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-xl">Your details</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    We’ll use these details to prepare your court reservation.
                  </p>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="pickleball-customerName">Full name</Label>
                      <Input
                        id="pickleball-customerName"
                        placeholder="Juan Dela Cruz"
                        error={errors.customerName?.message}
                        {...register('customerName')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pickleball-email">Email address</Label>
                      <Input
                        id="pickleball-email"
                        type="email"
                        placeholder="you@example.com"
                        error={errors.email?.message}
                        {...register('email')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pickleball-contact">Contact number</Label>
                      <Input
                        id="pickleball-contact"
                        placeholder="+63 9XX XXX XXXX"
                        error={errors.contactNumber?.message}
                        {...register('contactNumber')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pickleball-players">Number of players</Label>
                      <Input
                        id="pickleball-players"
                        type="number"
                        min={1}
                        max={court?.maxPlayers ?? PICKLEBALL_SETTINGS.maxPlayers}
                        error={errors.players?.message}
                        {...register('players')}
                      />
                      <p className="text-xs text-muted-foreground">
                        Up to {court?.maxPlayers ?? PICKLEBALL_SETTINGS.maxPlayers} players for this
                        court.
                      </p>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="pickleball-notes">Additional notes (optional)</Label>
                      <Textarea
                        id="pickleball-notes"
                        placeholder="Equipment requests, birthday celebrations, or anything we should know…"
                        error={errors.notes?.message}
                        {...register('notes')}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-28">
                <PickleballBookingSummary
                  court={court}
                  date={bookingDate}
                  startTime={startTime}
                  endTime={endTime}
                  players={players}
                  durationHours={durationHours}
                  total={total}
                  action={
                    <Button type="submit" size="lg" className="w-full rounded-full">
                      Review reservation
                    </Button>
                  }
                />
                <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  Your slot is held only after you confirm.
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      <Dialog
        open={reviewOpen}
        onOpenChange={(open) => {
          if (!mutation.isPending) setReviewOpen(open)
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Review your reservation</DialogTitle>
            <DialogDescription>
              Check the details below. Your court will be held as pending until our team confirms it.
            </DialogDescription>
          </DialogHeader>

          {reviewValues && reviewCourt && (
            <div className="space-y-5">
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Customer
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {reviewValues.customerName}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">{reviewValues.email}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{reviewValues.contactNumber}</p>
                {reviewValues.notes && (
                  <p className="mt-3 rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground">
                    {reviewValues.notes}
                  </p>
                )}
              </div>

              <PickleballBookingSummary
                compact
                court={reviewCourt}
                date={reviewValues.bookingDate}
                startTime={reviewValues.startTime}
                endTime={reviewValues.endTime}
                players={Number(reviewValues.players)}
                durationHours={reviewDuration}
                total={reviewTotal}
              />
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setReviewOpen(false)}
              disabled={mutation.isPending}
            >
              Edit reservation
            </Button>
            <Button type="button" onClick={handleConfirm} loading={mutation.isPending}>
              Confirm reservation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PublicLayout>
  )
}
