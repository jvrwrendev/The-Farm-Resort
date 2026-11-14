import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { TimePicker12h } from '@/components/ui/time-picker'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getAccommodation } from '@/services/accommodation.service'
import { adminCreateBooking } from '@/services/admin.service'
import { BookingCalendar } from '@/components/calendar/BookingCalendar'
import { getCalendarEvents } from '@/services/resort.service'
import { PickleballAvailabilityCalendar } from '@/features/pickleball/PickleballAvailabilityCalendar'
import { ActivityAvailabilityCalendar } from '@/features/activities/ActivityAvailabilityCalendar'
import { createPickleballBooking, getPickleballBookedSlots } from '@/services/pickleballBooking.service'
import { createActivityBooking, listActivityBookings, listAllActivities, listActivityUnits } from '@/services/activity.service'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import type { ActivityBooking, ActivityType } from '@/features/activities/types'
import { formatTimeLabel as formatPickleballTime } from '@/features/pickleball/utils'
import { formatTimeLabel as formatActivityTime } from '@/features/activities/utils'
import { usePickleballCourts } from '@/features/pickleball/usePickleballCourts'

type Category = 'resort' | 'pickleball' | 'atv' | 'billiards'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'resort', label: 'Resort Accommodation' },
  { value: 'pickleball', label: 'Pickleball' },
  { value: 'atv', label: 'ATV Rental' },
  { value: 'billiards', label: 'Billiards' },
]

export default function AdminManualBookingDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient()
  const [category, setCategory] = useState<Category>('resort')

  // Common customer fields
  const [customerName, setCustomerName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')

  // Resort
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [checkInPeriod, setCheckInPeriod] = useState<'AM' | 'PM'>('AM')
  const [resortSelectedDate, setResortSelectedDate] = useState<Date | null>(null)

  useEffect(() => {
    if (resortSelectedDate) {
      setCheckIn(format(resortSelectedDate, 'yyyy-MM-dd'))
    }
  }, [resortSelectedDate])
  const { data: accommodation } = useQuery({ queryKey: ['accommodation'], queryFn: getAccommodation })
  const monthStart = format(new Date(), 'yyyy-MM-dd')
  const monthEnd = format(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  const { data: resortEvents = [] } = useQuery({
    queryKey: ['calendar-events', monthStart, monthEnd],
    queryFn: () => getCalendarEvents(monthStart, monthEnd),
  })

  // Pickleball
  const courts = usePickleballCourts(true)
  const [courtId, setCourtId] = useState('')
  const [pbDate, setPbDate] = useState('')
  const [pbStart, setPbStart] = useState('')
  const [pbEnd, setPbEnd] = useState('')
  const [pbPlayers, setPbPlayers] = useState('2')

  // Activity
  const [activityType, setActivityType] = useState<ActivityType>('billiards')
  const { data: activities = [] } = useQuery({ queryKey: ['activities', 'all'], queryFn: listAllActivities })
  const { data: units = [] } = useQuery({
    queryKey: ['activity-units', activityType],
    queryFn: () => listActivityUnits(activityType),
  })

  const { data: pickleballOccupied = [] } = useQuery({
    queryKey: ['pickleball-booked-slots', courtId, pbDate],
    queryFn: () => getPickleballBookedSlots(courtId, pbDate),
    enabled: Boolean(courtId && pbDate),
  })

  const [unitId, setUnitId] = useState('')
  const [actDate, setActDate] = useState('')
  const [actStart, setActStart] = useState('')
  const [actDuration, setActDuration] = useState('1')
  const [actPlayers, setActPlayers] = useState('2')

  const { data: activityBookingsForDate = [] } = useQuery({
    queryKey: ['activity-bookings', 'date', activityType, actDate],
    queryFn: () => listActivityBookings(activityType),
    enabled: Boolean(actDate),
  })

  const mutation = useMutation({
    mutationFn: async () => {
      if (!customerName.trim() || !email.trim()) throw new Error('Customer name and email are required.')
      if (category === 'resort') {
        if (!checkIn || !checkOut) throw new Error('Check-in and check-out dates are required.')
        const now = new Date()
        const todayStr = format(now, 'yyyy-MM-dd')
        if (checkIn === todayStr && checkInPeriod === 'AM' && now.getHours() >= 12) {
          throw new Error('The AM check-in period has already passed for today.')
        }
        const room = accommodation
        if (!room) throw new Error('Accommodation not found.')
        const booking = await adminCreateBooking({
          accommodationId: room.id,
          customerName: customerName.trim(),
          email: email.trim(),
          contactNumber: phone.trim() || 'N/A',
          checkIn,
          checkOut,
          checkInPeriod,
          guests: 1,
          adults: 1,
          children: 0,
          bookingType: 'walk_in',
          status: 'confirmed',
          paymentStatus: 'partially_paid',
          specialRequests: notes.trim(),
        })
        // set booking source to manual
        await supabase.from('bookings').update({ booking_source: 'manual' }).eq('id', booking.id)
        return booking.bookingReference
      }
      if (category === 'pickleball') {
        if (!courtId || !pbDate || !pbStart || !pbEnd) throw new Error('Court, date and time are required.')
        const conflict = pickleballOccupied.some((slot) => slot.startTime < pbEnd && slot.endTime > pbStart)
        if (conflict) throw new Error('Selected time slot is already booked. Please choose another time.')
        const now = new Date()
        if (pbDate === format(now, 'yyyy-MM-dd')) {
          const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
          if (toMin(pbStart) < now.getHours() * 60 + now.getMinutes()) {
            throw new Error('The selected start time has already passed.')
          }
        }
        const booking = await createPickleballBooking({
          customerName: customerName.trim(),
          email: email.trim(),
          contactNumber: phone.trim() || 'N/A',
          courtId,
          bookingDate: pbDate,
          startTime: pbStart,
          endTime: pbEnd,
          players: Number(pbPlayers) || 2,
          notes: notes.trim(),
        })
        await supabase.from('pickleball_bookings').update({ booking_source: 'manual' }).eq('reference', booking.reference)
        return booking.reference
      }
      // activity
      const type = activityType
      const activity = activities.find((a) => a.type === type)
      if (!activity) throw new Error('Activity not found.')
      if (!unitId || !actDate || !actStart) throw new Error('Unit, date and start time are required.')
      const endTime = (() => {
        const [h, m] = actStart.split(':').map(Number)
        const endH = h + Number(actDuration)
        return `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      })()
      const conflict = activityBookingsForDate.some((b: ActivityBooking) =>
        b.unitId === unitId &&
        b.bookingDate === actDate &&
        b.startTime < endTime &&
        b.endTime > actStart,
      )
      if (conflict) throw new Error('This unit is already booked for the selected time. Please choose another slot.')
      const now = new Date()
      if (actDate === format(now, 'yyyy-MM-dd')) {
        const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
        if (toMin(actStart) < now.getHours() * 60 + now.getMinutes()) {
          throw new Error('The selected start time has already passed.')
        }
      }
      const booking = await createActivityBooking({
        activityId: activity.id,
        unitId,
        customerName: customerName.trim(),
        email: email.trim(),
        contactNumber: phone.trim() || 'N/A',
        bookingDate: actDate,
        startTime: actStart,
        endTime,
        durationHours: Number(actDuration),
        quantity: 1,
        players: Number(actPlayers) || 2,
        notes: notes.trim(),
      })
      await supabase.from('activity_bookings').update({ booking_source: 'manual' }).eq('reference', booking.reference)
      return booking.reference
    },
    onSuccess: (ref) => {
      toast.success(`Manual booking created: ${ref}`)
      queryClient.invalidateQueries({ queryKey: queryKeys.adminBookings() })
      queryClient.invalidateQueries({ queryKey: ['pickleball'] })
      queryClient.invalidateQueries({ queryKey: ['activity-bookings'] })
      onOpenChange(false)
      resetForm()
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create booking.')
    },
  })

  const resetForm = () => {
    setCustomerName('')
    setEmail('')
    setPhone('')
    setNotes('')
    setCheckIn('')
    setCheckOut('')
    setCourtId('')
    setPbDate('')
    setPbStart('')
    setPbEnd('')
    setPbPlayers('2')
    setUnitId('')
    setActDate('')
    setActStart('')
    setActDuration('1')
    setActPlayers('2')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Manual Booking</DialogTitle>
          <DialogDescription>Create a reservation on behalf of a customer. Source will be marked as Manual.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Customer name *</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>

          {category === 'resort' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Check-in date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className="w-full justify-start">
                        {checkIn || 'Select check-in date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <BookingCalendar
                        events={resortEvents}
                        onDateSelect={(date) => {
                          setCheckIn(format(date, 'yyyy-MM-dd'))
                          setResortSelectedDate(date)
                        }}
                        selectedDate={checkIn ? new Date(checkIn) : null}
                        showGuestInfo={false}
                        showLegend={false}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Check-in period</Label>
                  <Select value={checkInPeriod} onValueChange={(v) => setCheckInPeriod(v as 'AM' | 'PM')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AM">AM</SelectItem>
                      <SelectItem value="PM">PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Check-out date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className="w-full justify-start">
                        {checkOut || 'Select check-out date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <BookingCalendar
                        events={resortEvents}
                        onDateSelect={(date) => {
                          const d = format(date, 'yyyy-MM-dd')
                          if (checkIn && d <= checkIn) {
                            toast.error('Check-out must be after check-in.')
                            return
                          }
                          setCheckOut(d)
                        }}
                        selectedDate={checkOut ? new Date(checkOut) : null}
                        showGuestInfo={false}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          )}

          {category === 'pickleball' && (
            <>
              <div className="space-y-2">
                <Label>Court *</Label>
                <Select value={courtId} onValueChange={setCourtId}>
                  <SelectTrigger><SelectValue placeholder="Select court" /></SelectTrigger>
                  <SelectContent>
                    {courts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className="w-full justify-start">
                        {pbDate || 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <PickleballAvailabilityCalendar compact onDateSelect={(d) => setPbDate(format(d, 'yyyy-MM-dd'))} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Start time *</Label>
                  <Label>Start time *</Label>
                  <TimePicker12h value={pbStart} onChange={setPbStart} minTime={pbDate === format(new Date(), 'yyyy-MM-dd') ? format(new Date(), 'HH:mm') : undefined} />
                </div>
                <div className="space-y-2">
                  <Label>End time *</Label>
                  <TimePicker12h value={pbEnd} onChange={setPbEnd} minTime={pbDate === format(new Date(), 'yyyy-MM-dd') ? format(new Date(), 'HH:mm') : undefined} />
                  {pickleballOccupied.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Occupied: {pickleballOccupied.map((s) => `${formatPickleballTime(s.startTime)} – ${formatPickleballTime(s.endTime)}`).join(', ')}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Players</Label>
                <Input type="number" value={pbPlayers} onChange={(e) => setPbPlayers(e.target.value)} />
              </div>
            </>
          )}

          {category === 'atv' || category === 'billiards' ? (
            <>
              <div className="space-y-2">
                <Label>Activity type</Label>
                <Select value={activityType} onValueChange={(v) => setActivityType(v as ActivityType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="billiards">Billiards</SelectItem>
                    <SelectItem value="atv">ATV Rental</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unit / Table *</Label>
                <Select value={unitId} onValueChange={setUnitId}>
                  <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                  <SelectContent>
                    {units.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className="w-full justify-start">
                        {actDate || 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <ActivityAvailabilityCalendar compact onDateSelect={(d) => setActDate(format(d, 'yyyy-MM-dd'))} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Start time *</Label>
                  <TimePicker12h value={actStart} onChange={setActStart} minTime={actDate === format(new Date(), 'yyyy-MM-dd') ? format(new Date(), 'HH:mm') : undefined} />
                  {activityBookingsForDate.filter((b: ActivityBooking) => b.unitId === unitId && b.bookingDate === actDate && ['pending','confirmed','checked_in','completed'].includes(b.status)).length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Occupied:{' '}
                      {activityBookingsForDate
                        .filter((b: ActivityBooking) => b.unitId === unitId && b.bookingDate === actDate && ['pending','confirmed','checked_in','completed'].includes(b.status))
                        .map((b: ActivityBooking) => `${formatActivityTime(b.startTime)} – ${formatActivityTime(b.endTime)}`)
                        .join(', ')}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Duration (hrs)</Label>
                  <Select value={actDuration} onValueChange={setActDuration}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                        <SelectItem key={h} value={String(h)}>{h} hour{h === 1 ? '' : 's'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Players</Label>
                <Input type="number" value={actPlayers} onChange={(e) => setActPlayers(e.target.value)} />
              </div>
            </>
          ) : null}

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => mutation.mutate()} loading={mutation.isPending}>Create booking</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}