import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import {
  CalendarCheck2,
  CalendarDays,
  Clock,
  Eye,
  MapPin,
  Trophy,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/features/admin/components'
import {
  CALENDAR_STATUS_CHIP,
  CALENDAR_STATUS_DOT,
  CALENDAR_STATUS_LABELS,
  CALENDAR_STATUS_ORDER,
  type CalendarStatus,
} from '@/features/admin/calendarStatus'
import { PICKLEBALL_BLOCKING_STATUSES, getPickleballBookings } from '../service'
import type { PickleballBooking } from '../types'
import { usePickleballStorageSync } from '../usePickleballStorageSync'
import { formatTimeLabel, getCourt } from '../utils'
import { PickleballBookingActions } from './PickleballBookingActions'
import { queryKeys } from '@/lib/queryKeys'
import { cn, formatCurrency } from '@/lib/utils'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function compactTime(time: string): string {
  return formatTimeLabel(time).replace(':00 ', ' ')
}

function courtShortName(courtId: string): string {
  return getCourt(courtId)?.name.replace(/\s*Court$/i, '') ?? 'Court'
}

interface PickleballCalendarPanelProps {
  currentMonth: Date
  selectedDate: Date | null
  visible: Record<CalendarStatus, boolean>
  onSelectDate: (date: Date) => void
}

export function PickleballCalendarPanel({
  currentMonth,
  selectedDate,
  visible,
  onSelectDate,
}: PickleballCalendarPanelProps) {
  const navigate = useNavigate()

  usePickleballStorageSync()

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: queryKeys.pickleballBookings({ scope: 'calendar' }),
    queryFn: () => getPickleballBookings(),
    staleTime: 0,
  })

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, PickleballBooking[]>()
    for (const booking of bookings) {
      const list = map.get(booking.bookingDate)
      if (list) list.push(booking)
      else map.set(booking.bookingDate, [booking])
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          a.startTime.localeCompare(b.startTime) || a.courtId.localeCompare(b.courtId),
      )
    }
    return map
  }, [bookings])

  const days = useMemo(() => {
    const calStart = startOfWeek(startOfMonth(currentMonth))
    const calEnd = endOfWeek(endOfMonth(currentMonth))
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentMonth])

  const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd')
  const monthBookings = useMemo(
    () =>
      bookings.filter(
        (booking) => booking.bookingDate >= monthStart && booking.bookingDate <= monthEnd,
      ),
    [bookings, monthEnd, monthStart],
  )

  const reservedHours = useMemo(
    () =>
      monthBookings
        .filter((booking) => PICKLEBALL_BLOCKING_STATUSES.includes(booking.status))
        .reduce((total, booking) => total + booking.durationHours, 0),
    [monthBookings],
  )

  const pendingCount = useMemo(
    () => monthBookings.filter((booking) => booking.status === 'pending').length,
    [monthBookings],
  )

  const revenue = useMemo(
    () =>
      monthBookings
        .filter(
          (booking) => booking.status === 'confirmed' || booking.status === 'completed',
        )
        .reduce((total, booking) => total + booking.totalAmount, 0),
    [monthBookings],
  )

  const selectedKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null
  const selectedDayAll = selectedKey ? bookingsByDate.get(selectedKey) ?? [] : []
  const selectedDayBookings = selectedDayAll.filter((booking) => visible[booking.status])

  const openDetails = (booking: PickleballBooking) =>
    navigate(`/admin/pickleball/${encodeURIComponent(booking.reference)}`, {
      state: { from: `/admin/calendar?date=${booking.bookingDate}&tab=pickleball` },
    })

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
                Loading pickleball calendar…
              </div>
            ) : (
              days.map((day) => {
                const key = format(day, 'yyyy-MM-dd')
                const all = bookingsByDate.get(key) ?? []
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
                      isSelected
                        ? 'border-primary ring-2 ring-primary/30'
                        : 'border-border',
                      dayBookings.length > 0
                        ? 'bg-primary/[0.03] hover:border-primary/40'
                        : 'bg-card hover:border-primary/40 hover:bg-primary/5',
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
                      {dayBookings.length > 0 && (
                        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                          {dayBookings.length}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col gap-1">
                      {dayBookings.slice(0, 2).map((booking) => (
                        <button
                          key={booking.id}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            openDetails(booking)
                          }}
                          title={`${booking.customerName} · ${formatTimeLabel(
                            booking.startTime,
                          )}–${formatTimeLabel(booking.endTime)} · ${courtShortName(
                            booking.courtId,
                          )} Court`}
                          className={cn(
                            'flex items-center gap-1 truncate rounded border px-1 py-0.5 text-[10px] font-medium transition-opacity hover:opacity-80 sm:text-[11px]',
                            CALENDAR_STATUS_CHIP[booking.status],
                          )}
                        >
                          <span className="font-semibold">{compactTime(booking.startTime)}</span>
                          <span className="truncate">{courtShortName(booking.courtId)}</span>
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
                Pick a day on the calendar to see its court reservations and manage their status.
              </p>
            ) : selectedDayBookings.length === 0 ? (
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <CalendarCheck2 className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold">
                    {selectedDayAll.length > 0 ? 'Hidden by filters' : 'Courts open'}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedDayAll.length > 0
                      ? 'Reservations on this date are hidden by your status filters. Enable a status to view them.'
                      : 'No pickleball reservations on this date. All courts are open.'}
                  </p>
                </div>
              </div>
            ) : (
              selectedDayBookings.map((booking) => {
                const court = getCourt(booking.courtId)

                return (
                  <div key={booking.id} className="rounded-xl border bg-card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{booking.customerName}</p>
                        <p className="text-xs text-muted-foreground">{booking.reference}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <StatusBadge status={booking.status} />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openDetails(booking)}
                        >
                          <Eye className="h-4 w-4" />
                          Details
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                      <p className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5" />
                        {court?.name ?? 'Pickleball court'}
                      </p>
                      <p className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatTimeLabel(booking.startTime)} –{' '}
                          {formatTimeLabel(booking.endTime)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {booking.players} players
                        </span>
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                      <span className="font-display text-base font-semibold text-primary">
                        {formatCurrency(booking.totalAmount)}
                      </span>
                      <PickleballBookingActions
                        booking={booking}
                        onView={openDetails}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">This month</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-display text-4xl font-bold text-primary">
                {monthBookings.length}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">pickleball reservations</p>
            </div>
            <div className="flex items-center justify-between border-t pt-3 text-sm">
              <span className="text-muted-foreground">Reserved court hours</span>
              <span className="font-medium">{reservedHours}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Pending approvals</span>
              <span className="font-medium">{pendingCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Confirmed + completed</span>
              <span className="font-medium">{formatCurrency(revenue)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Trophy className="h-4 w-4 text-primary" /> Pickleball status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Courts can host multiple bookings a day</span>
            </div>
            {CALENDAR_STATUS_ORDER.map((status) => (
              <div key={status} className="flex items-center gap-2">
                <span className={cn('h-3 w-3 rounded-full', CALENDAR_STATUS_DOT[status])} />
                <span className="text-muted-foreground">{CALENDAR_STATUS_LABELS[status]}</span>
              </div>
            ))}
            <p className="border-t pt-3 text-xs text-muted-foreground">
              Pending, confirmed, and completed bookings hold their court time. Cancelled
              bookings do not.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
