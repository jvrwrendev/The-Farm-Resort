import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addYears, format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import {
  BadgeCheck,
  CalendarDays,
  Check,
  Loader2,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import { PublicLayout } from '@/components/layout/Navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { DatePickerField } from '@/features/booking/DatePickerField'
import { getAccommodation } from '@/services/accommodation.service'
import { createBooking, isRangeAvailable } from '@/services/booking.service'
import { getCalendarEvents } from '@/services/resort.service'
import { queryKeys } from '@/lib/queryKeys'
import { cn, formatCurrency, nightsBetween } from '@/lib/utils'
import { bookingSchema, type BookingFormValues } from '@/features/booking/booking-schema'

const today = format(new Date(), 'yyyy-MM-dd')
const maxBookingDate = format(addYears(new Date(), 1), 'yyyy-MM-dd')

const PERIODS = ['AM', 'PM'] as const

type Period = (typeof PERIODS)[number]

function PeriodToggle({
  value,
  onChange,
  ariaLabel,
}: {
  value: Period
  onChange: (period: Period) => void
  ariaLabel: string
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="grid grid-cols-2 gap-1 rounded-lg border bg-muted/60 p-1">
      {PERIODS.map((period) => (
        <button
          key={period}
          type="button"
          aria-pressed={value === period}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            value === period
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
          onClick={() => onChange(period)}
        >
          {period}
        </button>
      ))}
    </div>
  )
}

export default function BookingPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: accommodation, isLoading } = useQuery({
    queryKey: queryKeys.accommodation,
    queryFn: getAccommodation,
  })

  const { data: events = [] } = useQuery({
    queryKey: queryKeys.calendarEvents(today, maxBookingDate),
    queryFn: () => getCalendarEvents(today, maxBookingDate),
    staleTime: 30_000,
  })

  const occupied = useMemo(() => new Set(events.map((event) => event.event_date)), [events])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema) as Resolver<BookingFormValues>,
    defaultValues: {
      customerName: '',
      email: '',
      contactNumber: '',
      checkIn: '',
      checkInPeriod: 'PM',
      checkOut: '',
      checkOutPeriod: 'PM',
      adults: 2,
      children: 0,
      specialRequests: '',
    },
  })

  const checkIn = watch('checkIn')
  const checkOut = watch('checkOut')
  const checkInPeriod = watch('checkInPeriod')
  const checkOutPeriod = watch('checkOutPeriod')
  const adults = Number(watch('adults')) || 0
  const children = Number(watch('children')) || 0
  const totalGuests = adults + children
  const nights = nightsBetween(checkIn, checkOut)
  const pricePerNight = accommodation?.pricePerNight ?? 0
  const maxGuests = accommodation?.maxGuests ?? 0
  const total = nights * pricePerNight
  const capacityExceeded = maxGuests > 0 && totalGuests > maxGuests

  const rangeValid = nights > 0 && !!checkIn && !!checkOut

  const { data: available, isFetching: checkingAvailability } = useQuery({
    queryKey: queryKeys.availability(checkIn, checkOut),
    queryFn: () => isRangeAvailable(checkIn, checkOut),
    enabled: rangeValid,
    staleTime: 15_000,
  })

  const mutation = useMutation({
    mutationFn: createBooking,
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStats })
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      toast.success('Reservation submitted!')
      navigate(`/book/confirmation/${booking.bookingReference}`)
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Unable to create booking.')
    },
  })

  const rangeCrossesOccupied = (from: string, to: string): boolean => {
    const start = parseISO(from)
    const end = parseISO(to)
    const cursor = new Date(start)
    cursor.setDate(cursor.getDate() + 1)
    while (cursor < end) {
      if (occupied.has(format(cursor, 'yyyy-MM-dd'))) return true
      cursor.setDate(cursor.getDate() + 1)
    }
    return false
  }

  const handleCheckInChange = (key: string) => {
    if (checkOut && checkOut <= key) {
      setValue('checkOut', '', { shouldValidate: true })
    }
    setValue('checkIn', key, { shouldValidate: true })
  }

  const handleCheckOutChange = (key: string) => {
    setValue('checkOut', key, { shouldValidate: true })
  }

  const setPeriod = (field: 'checkInPeriod' | 'checkOutPeriod', period: Period) => {
    setValue(field, period, { shouldDirty: true })
  }

  const onSubmit = (values: BookingFormValues) => {
    if (capacityExceeded) {
      toast.error(`This accommodation hosts up to ${maxGuests} guests.`)
      return
    }
    if (available === false) {
      toast.error('Those dates are already reserved. Please choose another range.')
      return
    }
    mutation.mutate({
      customerName: values.customerName,
      email: values.email,
      contactNumber: values.contactNumber,
      checkIn: values.checkIn,
      checkOut: values.checkOut,
      checkInPeriod: values.checkInPeriod,
      checkOutPeriod: values.checkOutPeriod,
      adults: Number(values.adults),
      children: Number(values.children),
      specialRequests: values.specialRequests ?? '',
    })
  }

  const summary = useMemo(
    () => [
      {
        label: 'Check-in',
        value: checkIn
          ? `${format(parseISO(checkIn), 'EEE, MMM d, yyyy')} · ${checkInPeriod}`
          : 'Select check-in date',
      },
      {
        label: 'Check-out',
        value: checkOut
          ? `${format(parseISO(checkOut), 'EEE, MMM d, yyyy')} · ${checkOutPeriod}`
          : 'Select check-out date',
      },
      { label: 'Nights', value: nights > 0 ? String(nights) : '—' },
      { label: 'Guests', value: totalGuests > 0 ? `${totalGuests} (${adults} adults, ${children} children)` : '—' },
      { label: 'Price per night', value: pricePerNight ? formatCurrency(pricePerNight) : '—' },
    ],
    [checkIn, checkOut, checkInPeriod, checkOutPeriod, nights, totalGuests, adults, children, pricePerNight],
  )

  return (
    <PublicLayout>
      <div className="mx-auto max-w-6xl px-4 pt-28 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Reserve Your Stay
          </span>
          <h1 className="font-display mt-4 text-3xl font-bold sm:text-4xl lg:text-5xl">
            Book the entire resort
          </h1>
          <p className="mt-4 text-muted-foreground">
            One exclusive accommodation. One group at a time. Reserve your dates below.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-xl">Your accommodation</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading || !accommodation ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading accommodation…
                  </div>
                ) : (
                  <div className="flex flex-col gap-5 sm:flex-row">
                    <img
                      src={accommodation.images[0]}
                      alt={accommodation.name}
                      className="h-44 w-full rounded-xl object-cover sm:w-56"
                    />
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-lg font-semibold">{accommodation.name}</h2>
                        <Badge variant={accommodation.status === 'available' ? 'success' : 'secondary'}>
                          {accommodation.status === 'available' ? 'Available' : 'Unavailable'}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{accommodation.description}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                          <Users className="h-4 w-4 text-primary" /> Up to {accommodation.maxGuests} guests
                        </span>
                        <span className="font-semibold text-primary">
                          {formatCurrency(accommodation.pricePerNight)}
                          <span className="ml-1 text-xs font-normal text-muted-foreground">/ night</span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-display text-xl">Guest details</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="customerName">Full name</Label>
                      <Input id="customerName" placeholder="Juan Dela Cruz" error={errors.customerName?.message} {...register('customerName')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="you@example.com" error={errors.email?.message} {...register('email')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactNumber">Contact number</Label>
                      <Input id="contactNumber" placeholder="+63 9XX XXX XXXX" error={errors.contactNumber?.message} {...register('contactNumber')} />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Check-in</Label>
                        <DatePickerField
                          value={checkIn}
                          placeholder="Select check-in date"
                          ariaLabel="Pick check-in date"
                          occupied={occupied}
                          disabledDate={(date) =>
                            (checkOut ? format(date, 'yyyy-MM-dd') >= checkOut : false)
                          }
                          onChange={handleCheckInChange}
                        />
                        <PeriodToggle
                          value={checkInPeriod}
                          ariaLabel="Check-in AM or PM"
                          onChange={(period) => setPeriod('checkInPeriod', period)}
                        />
                        {errors.checkIn?.message && (
                          <p className="text-sm text-destructive">{errors.checkIn.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Check-out</Label>
                        <DatePickerField
                          value={checkOut}
                          placeholder="Select check-out date"
                          ariaLabel="Pick check-out date"
                          occupied={occupied}
                          disabledDate={(date) => {
                            const key = format(date, 'yyyy-MM-dd')
                            if (checkIn && key <= checkIn) return true
                            if (checkIn && rangeCrossesOccupied(checkIn, key)) return true
                            return false
                          }}
                          onChange={handleCheckOutChange}
                        />
                        <PeriodToggle
                          value={checkOutPeriod}
                          ariaLabel="Check-out AM or PM"
                          onChange={(period) => setPeriod('checkOutPeriod', period)}
                        />
                        {errors.checkOut?.message && (
                          <p className="text-sm text-destructive">{errors.checkOut.message}</p>
                        )}
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Shaded dates are already reserved. Pick an open range that fits the whole stay.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="adults">Adults</Label>
                      <Input id="adults" type="number" min={1} error={errors.adults?.message} {...register('adults')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="children">Children</Label>
                      <Input id="children" type="number" min={0} error={errors.children?.message} {...register('children')} />
                    </div>
                  </div>

                  {capacityExceeded && (
                    <p className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                      <X className="h-4 w-4" />
                      This accommodation hosts up to {maxGuests} guests. Please adjust your party size.
                    </p>
                  )}

                  {rangeValid && (
                    <div className="flex items-center gap-2 text-sm">
                      {checkingAvailability ? (
                        <span className="inline-flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" /> Checking availability…
                        </span>
                      ) : available ? (
                        <span className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 font-medium text-primary">
                          <Check className="h-4 w-4" /> These dates are available
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 font-medium text-destructive">
                          <X className="h-4 w-4" /> These dates are already reserved
                        </span>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="specialRequests">Special requests</Label>
                    <Textarea
                      id="specialRequests"
                      placeholder="Celebrations, dietary needs, extra mattresses…"
                      error={errors.specialRequests?.message}
                      {...register('specialRequests')}
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    loading={isSubmitting || mutation.isPending}
                    disabled={!accommodation || accommodation.status === 'unavailable'}
                  >
                    Confirm Booking
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="lg:sticky lg:top-28">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display text-lg">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  Booking summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <dl className="space-y-3">
                  {summary.map((row) => (
                    <div key={row.label} className="flex items-start justify-between gap-4 text-sm">
                      <dt className="text-muted-foreground">{row.label}</dt>
                      <dd className="text-right font-medium text-foreground">{row.value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="border-t pt-4">
                  <div className="flex items-end justify-between">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="font-display text-2xl font-bold text-primary">
                      {formatCurrency(total)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {pricePerNight ? `${formatCurrency(pricePerNight)} × ${nights || 0} night(s)` : ''}
                  </p>
                </div>
                <div className="flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  No payment is taken online. Your reservation is reviewed and confirmed by our team.
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <BadgeCheck className="h-4 w-4 text-primary" />
                  Free cancellation up to 7 days before check-in.
                </div>
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/#calendar">Check availability calendar</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}