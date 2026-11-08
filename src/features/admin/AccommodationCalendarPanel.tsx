import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { CalendarCheck2, CalendarDays, Lock, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { BookingActions } from '@/features/admin/BookingActions'
import { StatusBadge } from '@/features/admin/components'
import { isBlockingStatus } from '@/lib/booking-utils'
import { cn, formatCurrency } from '@/lib/utils'
import type { AdminBooking } from '@/types'
import {
  CALENDAR_STATUS_CHIP,
  CALENDAR_STATUS_DOT,
  CALENDAR_STATUS_LABELS,
  CALENDAR_STATUS_ORDER,
  CALENDAR_STATUS_PRIORITY,
  type CalendarStatus,
} from './calendarStatus'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function firstName(name: string): string {
  return name.trim().split(' ')[0] || name
}

interface AccommodationCalendarPanelProps {
  bookings: AdminBooking[]
  isLoading: boolean
  currentMonth: Date
  selectedDate: Date | null
  visible: Record<CalendarStatus, boolean>
  onSelectDate: (date: Date) => void
}

export function AccommodationCalendarPanel({
  bookings,
  isLoading,
  currentMonth,
  selectedDate,
  visible,
  onSelectDate,
}: AccommodationCalendarPanelProps) {
  const navigate = useNavigate()

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, AdminBooking[]>()
    for (const booking of bookings) {
      const start = parseISO(booking.checkIn)
      const end = parseISO(booking.checkOut)
      if (end <= start) continue
      for (const day of eachDayOfInterval({ start, end: addDays(end, -1) })) {
        const key = format(day, 'yyyy-MM-dd')
        const list = map.get(key)
        if (list) list.push(booking)
        else map.set(key, [booking])
      }
    }
    for (const list of map.values()) {
      list.sort((a, b) => CALENDAR_STATUS_PRIORITY[a.status] - CALENDAR_STATUS_PRIORITY[b.status])
    }
    return map
  }, [bookings])

  const days = useMemo(() => {
    const calStart = startOfWeek(startOfMonth(currentMonth))
    const calEnd = endOfWeek(endOfMonth(currentMonth))
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentMonth])

  const monthDays = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth),
      }),
    [currentMonth],
  )

  const occupiedNights = useMemo(
    () =>
      monthDays.filter((day) => {
        const list = bookingsByDate.get(format(day, 'yyyy-MM-dd'))
        return list?.some((booking) => isBlockingStatus(booking.status)) ?? false
      }).length,
    [monthDays, bookingsByDate],
  )

  const totalNights = monthDays.length
  const availableNights = totalNights - occupiedNights
  const occupancyRate = totalNights > 0 ? Math.round((occupiedNights / totalNights) * 100) : 0

  const monthBookingCount = useMemo(() => {
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd')
    return bookings.filter((booking) => booking.checkIn <= end && booking.checkOut > start).length
  }, [bookings, currentMonth])

  const selectedKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null
  const selectedDayAll = selectedKey ? bookingsByDate.get(selectedKey) ?? [] : []
  const selectedDayBookings = selectedDayAll.filter((booking) => visible[booking.status])
  const selectedDayBlocking = selectedDayAll.some((booking) => isBlockingStatus(booking.status))

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardContent className="px-2 py-3 sm:px-4 sm:py-4">
          <div className="grid grid-cols-7 border-b pb-2">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5 pt-2 sm:gap-2">
            {isLoading ? (
              <div className="col-span-7 py-16 text-center text-sm text-muted-foreground">
                Loading calendar…
              </div>
            ) : (
              days.map((day) => {
                const key = format(day, 'yyyy-MM-dd')
                const all = bookingsByDate.get(key) ?? []
                const blocking = all.some((booking) => isBlockingStatus(booking.status))
                const dayBookings = all.filter((booking) => visible[booking.status])
                const isSelected = !!selectedDate && isSameDay(day, selectedDate)
                const isCurrentMonth = isSameMonth(day, currentMonth)
                const today = isToday(day)

                return (
                  <div
                    key={key}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectDate(day)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onSelectDate(day)
                      }
                    }}
                    className={cn(
                      'flex min-h-[84px] cursor-pointer flex-col gap-1 rounded-lg border p-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-[104px]',
                      !isCurrentMonth && 'opacity-50',
                      isSelected ? 'border-primary ring-2 ring-primary/30' : 'border-border',
                      blocking ? 'bg-muted/60' : 'bg-card hover:border-primary/40 hover:bg-primary/5',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                          today ? 'bg-primary text-primary-foreground' : 'text-foreground',
                        )}
                      >
                        {format(day, 'd')}
                      </span>
                      {blocking && <Lock className="h-3 w-3 text-muted-foreground" />}
                    </div>

                    <div className="flex flex-1 flex-col gap-1">
                      {dayBookings.slice(0, 2).map((booking) => (
                        <button
                          key={booking.id}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            navigate(`/admin/bookings/${booking.id}`)
                          }}
                          title={`${booking.customerName} · ${booking.bookingReference}`}
                          className={cn(
                            'flex items-center gap-1 truncate rounded border px-1 py-0.5 text-[10px] font-medium transition-opacity hover:opacity-80 sm:text-[11px]',
                            CALENDAR_STATUS_CHIP[booking.status],
                          )}
                        >
                          {booking.checkIn === key && <span className="font-bold">In</span>}
                          <span className="truncate">{firstName(booking.customerName)}</span>
                        </button>
                      ))}
                      {dayBookings.length > 2 && (
                        <span className="px-1 text-[10px] font-medium text-muted-foreground">
                          +{dayBookings.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">
              {selectedDate ? format(selectedDate, 'EEEE, MMM d') : 'Select a date'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedDate ? (
              <p className="text-sm text-muted-foreground">
                Pick a day on the calendar to see its reservations and manage their status.
              </p>
            ) : selectedDayBookings.length === 0 ? (
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <CalendarCheck2 className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold">
                    {selectedDayAll.length > 0 ? 'Hidden by filters' : selectedDayBlocking ? 'Occupied' : 'Available'}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedDayAll.length > 0
                      ? 'Reservations on this date are hidden by your status filters. Enable a status to view them.'
                      : selectedDayBlocking
                        ? 'This date is covered by a booking but it is currently hidden. Enable a status to view it.'
                        : 'No reservations cover this date. The resort is available.'}
                  </p>
                </div>
              </div>
            ) : (
              selectedDayBookings.map((booking) => (
                <div key={booking.id} className="rounded-xl border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{booking.customerName}</p>
                      <p className="text-xs text-muted-foreground">{booking.bookingReference}</p>
                    </div>
                    <StatusBadge status={booking.status} />
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                    <p>
                      {format(parseISO(booking.checkIn), 'MMM d')} —{' '}
                      {format(parseISO(booking.checkOut), 'MMM d, yyyy')}
                    </p>
                    <p className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {booking.adults + booking.children} guests
                      </span>
                      <span>{formatCurrency(booking.totalAmount)}</span>
                    </p>
                  </div>
                  <div className="mt-3 border-t pt-3">
                    <BookingActions
                      booking={booking}
                      onView={(selected) => navigate(`/admin/bookings/${selected.id}`)}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">This month</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-display text-4xl font-bold text-primary">{occupancyRate}%</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {occupiedNights} of {totalNights} nights booked
              </p>
            </div>
            <Progress value={occupancyRate} />
            <div className="flex items-center justify-between border-t pt-3 text-sm">
              <span className="text-muted-foreground">Available nights</span>
              <span className="font-medium">{availableNights}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Reservations this month</span>
              <span className="font-medium">{monthBookingCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <CalendarDays className="h-4 w-4 text-primary" /> Legend
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-card ring-1 ring-border" />
              <span className="text-muted-foreground">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-muted ring-1 ring-border" />
              <span className="text-muted-foreground">Occupied (blocking booking)</span>
            </div>
            {CALENDAR_STATUS_ORDER.map((status) => (
              <div key={status} className="flex items-center gap-2">
                <span className={cn('h-3 w-3 rounded-full', CALENDAR_STATUS_DOT[status])} />
                <span className="text-muted-foreground">{CALENDAR_STATUS_LABELS[status]}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
