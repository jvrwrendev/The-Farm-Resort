import { useMemo, useState, type ComponentType } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addDays, format, isAfter, parseISO, startOfDay } from 'date-fns'
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Check,
  CircleDollarSign,
  CreditCard,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Receipt,
  Sparkles,
  Tag,
  User,
  Users,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { DatePickerField } from '@/features/booking/DatePickerField'
import { PageHeading } from '@/features/admin/components'
import { adminCreateBooking, getAllRooms, getBookings } from '@/services/admin.service'
import { isRangeAvailable } from '@/services/booking.service'
import { isBlockingStatus, rangesOverlap } from '@/lib/booking-utils'
import { queryKeys } from '@/lib/queryKeys'
import { BOOKING_TYPE_OPTIONS, BOOKING_TYPE_SHORT_LABELS } from '@/lib/constants'
import { cn, formatCurrency } from '@/lib/utils'
import type {
  Accommodation,
  AdminBooking,
  AdminBookingStatus,
  BookingTypeDb,
  PaymentStatus,
} from '@/types'

const STATUS_OPTIONS: Array<{ value: AdminBookingStatus; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
]

const PAYMENT_OPTIONS: Array<{ value: PaymentStatus; label: string }> = [
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'paid', label: 'Paid' },
  { value: 'partially_paid', label: 'Partially paid' },
]

const PERIOD_OPTIONS: Array<{ value: 'AM' | 'PM'; label: string }> = [
  { value: 'AM', label: 'Morning (AM)' },
  { value: 'PM', label: 'Afternoon (PM)' },
]

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-destructive">{message}</p>
}

function todayIso(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export default function AdminCreateBookingPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Guest
  const [customerName, setCustomerName] = useState('')
  const [email, setEmail] = useState('')
  const [contactNumber, setContactNumber] = useState('')

  // Stay
  const [accommodationId, setAccommodationId] = useState('')
  const [checkIn, setCheckIn] = useState(todayIso())
  const [checkOut, setCheckOut] = useState(format(new Date(Date.now() + 86_400_000), 'yyyy-MM-dd'))
  const [checkInPeriod, setCheckInPeriod] = useState<'AM' | 'PM'>('AM')
  const [checkOutPeriod, setCheckOutPeriod] = useState<'AM' | 'PM'>('AM')
  const [adults, setAdults] = useState(1)
  const [children, setChildren] = useState(0)
  const [guests, setGuests] = useState(1)

  // Source & status (defaults match the manual-entry use case)
  const [bookingType, setBookingType] = useState<BookingTypeDb>('walk_in')
  const [status, setStatus] = useState<AdminBookingStatus>('confirmed')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid')

  const [specialRequests, setSpecialRequests] = useState('')

  const roomsQuery = useQuery({
    queryKey: ['admin-rooms'],
    queryFn: getAllRooms,
  })

  const rooms = roomsQuery.data ?? []
  const selectedRoom: Accommodation | undefined = rooms.find((r) => r.id === accommodationId)

  const allBookingsQuery = useQuery({
    queryKey: ['admin-bookings', { scope: 'availability' }],
    queryFn: () => getBookings({}),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  const occupiedDates = useMemo(() => {
    const set = new Set<string>()
    if (!accommodationId) return set
    const todayKey = format(startOfDay(new Date()), 'yyyy-MM-dd')
    for (const booking of allBookingsQuery.data ?? []) {
      if (booking.accommodationId !== accommodationId) continue
      if (!isBlockingStatus(booking.status)) continue
      const start = parseISO(booking.checkIn)
      const end = parseISO(booking.checkOut)
      if (!isAfter(end, start)) continue
      for (let day = start; day < end; day = addDays(day, 1)) {
        const key = format(day, 'yyyy-MM-dd')
        if (key < todayKey) continue
        set.add(key)
      }
    }
    return set
  }, [accommodationId, allBookingsQuery.data])

  // Range-level overlap check using the existing DB RPC (authoritative).
  const rangeAvailableQuery = useQuery({
    queryKey: ['range-available', accommodationId, checkIn, checkOut],
    queryFn: () => isRangeAvailable(checkIn, checkOut, accommodationId),
    enabled: !!accommodationId && !!checkIn && !!checkOut && checkOut > checkIn,
  })

  // Client-side mirror of overlap so we never need to wait for the network round-trip
  // to show the inline conflict UI.
  const localOverlap = useMemo(() => {
    if (!accommodationId || !checkIn || !checkOut || checkOut <= checkIn) return null
    for (const booking of allBookingsQuery.data ?? []) {
      if (booking.accommodationId !== accommodationId) continue
      if (!isBlockingStatus(booking.status)) continue
      if (rangesOverlap(checkIn, checkOut, booking.checkIn, booking.checkOut)) {
        return booking
      }
    }
    return null
  }, [accommodationId, checkIn, checkOut, allBookingsQuery.data])

  const rangeConflict =
    localOverlap ??
    (rangeAvailableQuery.data === false
      ? {
          id: 'rpc',
          bookingReference: '',
          customerName: 'Existing booking',
          email: '',
          contactNumber: '',
          accommodationId,
          checkIn,
          checkOut,
          checkInPeriod: undefined,
          checkOutPeriod: undefined,
          adults: 0,
          children: 0,
          specialRequests: '',
          numberOfNights: 0,
          pricePerNight: 0,
          totalAmount: 0,
          status: 'confirmed',
          paymentStatus: 'paid',
          bookingType: 'online_booking',
          bookingSource: 'manual',
          checkInAt: null,
          checkOutAt: null,
          createdAt: '',
          updatedAt: '',
        } satisfies AdminBooking
      : null)

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0
    if (checkOut <= checkIn) return 0
    const start = parseISO(checkIn)
    const end = parseISO(checkOut)
    return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000))
  }, [checkIn, checkOut])

  const pricePerNight = selectedRoom?.pricePerNight ?? 0
  const totalAmount = nights * pricePerNight

  const errors = useMemo(() => {
    const e: Record<string, string> = {}
    if (!customerName.trim()) e.customerName = 'Guest name is required.'
    if (!email.trim()) {
      e.email = 'Email is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      e.email = 'Enter a valid email address.'
    }
    if (!contactNumber.trim()) e.contactNumber = 'Contact number is required.'
    if (!accommodationId) e.accommodationId = 'Select an accommodation.'
    if (!checkIn) e.checkIn = 'Check-in date is required.'
    if (!checkOut) e.checkOut = 'Check-out date is required.'
    else if (checkOut <= checkIn) e.checkOut = 'Check-out must be after check-in.'
    if (checkIn && occupiedDates.has(checkIn)) {
      e.checkIn = 'This date is already occupied and cannot be selected.'
    }
    if (checkOut && occupiedDates.has(checkOut)) {
      e.checkOut = 'This date is already occupied and cannot be selected.'
    }
    if (guests < 1) e.guests = 'At least one guest is required.'
    if (rooms.length > 0 && selectedRoom && guests > selectedRoom.maxGuests) {
      e.guests = `Selected accommodation allows up to ${selectedRoom.maxGuests} guests.`
    }
    return e
  }, [
    customerName,
    email,
    contactNumber,
    accommodationId,
    checkIn,
    checkOut,
    guests,
    rooms,
    selectedRoom,
    occupiedDates,
  ])

  const baseValid = Object.keys(errors).length === 0
  // Block submission while availability for the picked range is still being
  // verified — prevents a fast-click from racing the server check.
  const availabilityKnown =
    rangeAvailableQuery.isFetched ||
    rangeAvailableQuery.data === false ||
    localOverlap !== null
  const isValid = baseValid && !rangeConflict && availabilityKnown

  const createMutation = useMutation({
    mutationFn: async () => {
      // 1. Force-refetch all bookings (catches cross-tab races where another admin
      //    just created a booking while this form was open).
      await queryClient.invalidateQueries({ queryKey: ['admin-bookings'] })
      await queryClient.refetchQueries({
        queryKey: ['admin-bookings'],
        type: 'active',
      })

      // 2. Verify the freshly-refetched client data still doesn't overlap.
      const refreshed =
        queryClient.getQueryData<AdminBooking[]>([
          'admin-bookings',
          { scope: 'availability' },
        ]) ?? []
      for (const b of refreshed) {
        if (b.accommodationId !== accommodationId) continue
        if (!isBlockingStatus(b.status)) continue
        if (rangesOverlap(checkIn, checkOut, b.checkIn, b.checkOut)) {
          throw new Error(
            `This date range overlaps an existing booking (${b.customerName} · ${b.bookingReference}). Pick a different range.`,
          )
        }
      }

      // 3. Authoritative server check via the existing is_range_available RPC.
      const available = await queryClient.fetchQuery({
        queryKey: ['range-available', accommodationId, checkIn, checkOut],
        queryFn: () => isRangeAvailable(checkIn, checkOut, accommodationId),
        staleTime: 0,
      })
      if (!available) {
        throw new Error(
          'This date range is no longer available. Another reservation may have been created just now. Please refresh the availability and pick a new range.',
        )
      }

      // 4. Create. The bookings table also has a PostgreSQL EXCLUDE constraint
      //    on (room_id, daterange(check_in, check_out)) so the DB itself will
      //    reject any overlap that slips past the client + RPC checks.
      return adminCreateBooking({
        accommodationId,
        customerName: customerName.trim(),
        email: email.trim().toLowerCase(),
        contactNumber: contactNumber.trim(),
        checkIn,
        checkOut,
        checkInPeriod,
        checkOutPeriod,
        guests,
        adults,
        children,
        bookingType,
        status,
        paymentStatus,
        specialRequests: specialRequests.trim() || undefined,
      })
    },
    onSuccess: (created) => {
      toast.success(`Booking ${created.bookingReference} created.`)
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] })
      queryClient.invalidateQueries({ queryKey: ['admin-booking'] })
      queryClient.invalidateQueries({ queryKey: ['range-available'] })
      navigate('/admin/bookings')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create booking.')
      // Refresh availability so a racing booking that just claimed the slot is
      // reflected immediately (and disables submit until the admin picks again).
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] })
      queryClient.invalidateQueries({ queryKey: ['range-available'] })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid || createMutation.isPending) return
    createMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/admin/bookings')}
        className="-ml-2"
        type="button"
      >
        <ArrowLeft className="h-4 w-4" /> Back to bookings
      </Button>

      <PageHeading
        title="New booking"
        description="Record a walk-in or contact reservation directly. Online bookings still go through the public site."
      />

      {rangeConflict && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">
              The selected date range is unavailable.
            </p>
            <p className="mt-0.5 text-xs text-destructive/80">
              {rangeConflict.bookingReference
                ? `${rangeConflict.customerName} (${rangeConflict.bookingReference}) already occupies ${format(parseISO(rangeConflict.checkIn), 'MMM d')} → ${format(parseISO(rangeConflict.checkOut), 'MMM d, yyyy')}. `
                : `This range overlaps an existing reservation. `}
              Pick different dates or choose another accommodation.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <User className="h-4 w-4 text-primary" /> Guest
              </CardTitle>
            </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="customerName">Full name</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Juan dela Cruz"
                autoComplete="name"
                required
              />
              <FieldError message={errors.customerName} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">
                <Mail className="mr-1 inline h-3.5 w-3.5" /> Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="guest@example.com"
                autoComplete="email"
                required
              />
              <FieldError message={errors.email} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactNumber">
                <Phone className="mr-1 inline h-3.5 w-3.5" /> Contact number
              </Label>
              <Input
                id="contactNumber"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="+63 9XX XXX XXXX"
                autoComplete="tel"
                required
              />
              <FieldError message={errors.contactNumber} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <CalendarDays className="h-4 w-4 text-primary" /> Stay
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
              <Label htmlFor="accommodationId">Accommodation</Label>
              <Select value={accommodationId} onValueChange={setAccommodationId}>
                <SelectTrigger id="accommodationId">
                  <SelectValue
                    placeholder={
                      roomsQuery.isLoading ? 'Loading rooms…' : 'Select a room'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name} · up to {room.maxGuests} guests · {formatCurrency(room.pricePerNight)}/night
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.accommodationId} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="checkIn">Check-in</Label>
              <DatePickerField
                value={checkIn}
                onChange={setCheckIn}
                occupied={occupiedDates}
                ariaLabel="Pick check-in date"
              />
              <FieldError message={errors.checkIn} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="checkOut">Check-out</Label>
              <DatePickerField
                value={checkOut}
                onChange={setCheckOut}
                occupied={occupiedDates}
                ariaLabel="Pick check-out date"
              />
              <FieldError message={errors.checkOut} />
            </div>
            <div className="space-y-1.5">
              <Label>Total nights</Label>
              <Input value={nights > 0 ? `${nights}` : '—'} readOnly />
            </div>

            <div className="space-y-1.5">
              <Label>Check-in period</Label>
              <Select
                value={checkInPeriod}
                onValueChange={(v) => setCheckInPeriod(v as 'AM' | 'PM')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Check-out period</Label>
              <Select
                value={checkOutPeriod}
                onValueChange={(v) => setCheckOutPeriod(v as 'AM' | 'PM')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Total price</Label>
              <Input value={totalAmount > 0 ? formatCurrency(totalAmount) : '—'} readOnly />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adults">Adults</Label>
              <Input
                id="adults"
                type="number"
                min={1}
                value={adults}
                onChange={(e) => {
                  const next = Math.max(1, Number(e.target.value) || 1)
                  setAdults(next)
                  setGuests(Math.max(next + children, next, 1))
                }}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="children">Children</Label>
              <Input
                id="children"
                type="number"
                min={0}
                value={children}
                onChange={(e) => {
                  const next = Math.max(0, Number(e.target.value) || 0)
                  setChildren(next)
                  setGuests(Math.max(adults + next, 1))
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="guests">
                <Users className="mr-1 inline h-3.5 w-3.5" /> Total guests
              </Label>
              <Input
                id="guests"
                type="number"
                min={1}
                value={guests}
                onChange={(e) => setGuests(Math.max(1, Number(e.target.value) || 1))}
                required
              />
              <FieldError message={errors.guests} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Tag className="h-4 w-4 text-primary" /> Booking source & status
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Source</Label>
              <Select
                value={bookingType}
                onValueChange={(v) => setBookingType(v as BookingTypeDb)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BOOKING_TYPE_OPTIONS.filter((o) => o.value !== 'all').map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Defaults to <strong>Walk-in</strong> for in-person guests. Switch to
                Contact for phone / email requests.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>
                <Check className="mr-1 inline h-3.5 w-3.5" /> Booking status
              </Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as AdminBookingStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>
                <Wallet className="mr-1 inline h-3.5 w-3.5" /> Payment status
              </Label>
              <Select
                value={paymentStatus}
                onValueChange={(v) => setPaymentStatus(v as PaymentStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <MessageSquare className="h-4 w-4 text-primary" /> Special requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={4}
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="Optional. Any notes for the operations team (e.g. dietary needs, arrival time, special occasion)."
            />
          </CardContent>
        </Card>

          <div className="sticky bottom-0 -mx-4 mt-2 rounded-xl border bg-background/85 px-4 py-3 shadow-sm backdrop-blur lg:-mx-6 lg:px-6">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Button asChild variant="outline" type="button" className="sm:w-auto">
                <Link to="/admin/bookings">Cancel</Link>
              </Button>
              <Button
                type="submit"
                disabled={!isValid || createMutation.isPending}
                className={cn(!isValid && 'opacity-50', 'sm:w-auto')}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Creating…
                  </>
                ) : rangeAvailableQuery.isFetching &&
                  !availabilityKnown &&
                  baseValid &&
                  !rangeConflict ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Verifying availability…
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" /> Create booking
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <aside className="lg:col-span-1">
          <div className="sticky top-20 space-y-4">
            <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-card via-card to-primary/[0.04] shadow-sm">
              <div className="border-b bg-primary/[0.04] px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Receipt className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-display text-base font-semibold leading-tight">
                      Booking summary
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Updates as you fill out the form
                    </p>
                  </div>
                </div>
              </div>
              <CardContent className="space-y-3 px-5 py-4 text-sm">
                <SummaryRow
                  icon={User}
                  label="Guest"
                  value={customerName.trim() || 'Awaiting guest details'}
                  muted={!customerName.trim()}
                />
                <SummaryRow
                  icon={CalendarDays}
                  label="Accommodation"
                  value={selectedRoom ? selectedRoom.name : 'Not selected'}
                  muted={!selectedRoom}
                />
                <SummaryRow
                  icon={CalendarDays}
                  label="Stay"
                  value={
                    checkIn && checkOut && nights > 0
                      ? `${format(parseISO(checkIn), 'MMM d')} → ${format(
                          parseISO(checkOut),
                          'MMM d, yyyy',
                        )} · ${nights} night${nights === 1 ? '' : 's'}`
                      : 'Pick check-in and check-out'
                  }
                  muted={!(checkIn && checkOut && nights > 0)}
                />
                <SummaryRow
                  icon={Tag}
                  label="Source"
                  value={BOOKING_TYPE_SHORT_LABELS[bookingType]}
                />
                <SummaryRow
                  icon={Check}
                  label="Status"
                  value={status.charAt(0).toUpperCase() + status.slice(1)}
                />
                <SummaryRow
                  icon={Wallet}
                  label="Payment"
                  value={paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1)}
                />

                <div className="mt-2 rounded-xl border bg-muted/30 px-4 py-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {formatCurrency(pricePerNight)}
                      <span className="mx-1">×</span>
                      {nights > 0 ? nights : '—'}
                      <span className="ml-1">night{nights === 1 ? '' : 's'}</span>
                    </span>
                    <span>{totalAmount > 0 ? formatCurrency(totalAmount) : '—'}</span>
                  </div>
                  <div className="mt-3 flex items-end justify-between border-t border-border/60 pt-3">
                    <span className="text-sm font-medium">Total</span>
                    <span className="font-display text-2xl font-bold text-primary">
                      {totalAmount > 0 ? formatCurrency(totalAmount) : '—'}
                    </span>
                  </div>
                </div>

                {isValid ? (
                  <div className="flex items-start gap-2 rounded-lg border border-emerald-200/60 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>Ready to create. Submitting will record this reservation instantly.</span>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200/60 bg-amber-50/70 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-200">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>Complete the required fields to enable Create booking.</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-dashed bg-muted/20">
              <CardContent className="space-y-2 px-5 py-4 text-xs text-muted-foreground">
                <p className="flex items-center gap-2">
                  <CircleDollarSign className="h-3.5 w-3.5 text-primary" />
                  <span>No online payment is processed. The full amount is settled on arrival.</span>
                </p>
                <p>
                  The booking reference will be generated server-side once the form is submitted.
                </p>
              </CardContent>
            </Card>
          </div>
        </aside>
      </form>

      <span className="sr-only" data-testid="admin-create-booking-page">
        {queryKeys.adminBookings.length}
      </span>
    </div>
  )
}

function SummaryRow({
  icon: Icon,
  label,
  value,
  muted,
}: {
  icon?: ComponentType<{ className?: string }>
  label: string
  value: string
  muted?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </span>
      <span
        className={cn(
          'text-right text-sm font-medium',
          muted && 'text-muted-foreground italic',
        )}
      >
        {value}
      </span>
    </div>
  )
}
