import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
import { CalendarCheck2, CheckCircle2, Clock, Users, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard, StatusBadge } from '@/features/admin/components'
import {
  CALENDAR_STATUS_CHIP,
  CALENDAR_STATUS_DOT,
  CALENDAR_STATUS_LABELS,
  CALENDAR_STATUS_ORDER,
  type CalendarStatus,
} from '@/features/admin/calendarStatus'
import type { ActivityBookingStatus, ActivityType } from '@/features/activities/types'
import {
  listActivityBookings,
  updateActivityBookingStatus,
} from '@/services/activity.service'
import { formatTimeLabel } from '@/features/activities/utils'
import { cn, formatCurrency } from '@/lib/utils'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const BLOCKING_STATUSES: ActivityBookingStatus[] = ['pending', 'confirmed', 'completed']

function compactTime(time: string): string {
  return formatTimeLabel(time).replace(':00 ', ' ')
}

interface ActivityCalendarPanelProps {
  type: ActivityType
  label: string
  currentMonth: Date
  selectedDate: Date | null
  visible: Record<CalendarStatus, boolean>
  onSelectDate: (date: Date) => void
}

export function ActivityCalendarPanel({
  type,
  label,
  currentMonth,
  selectedDate,
  visible,
  onSelectDate,
}: ActivityCalendarPanelProps) {
  const queryClient = useQueryClient()

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['activity-bookings', type],
    queryFn: () => listActivityBookings(type),
    staleTime: 0,
  })

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, typeof bookings>()
    for (const booking of bookings) {
      const list = map.get(booking.bookingDate)
      if (list) list.push(booking)
      else map.set(booking.bookingDate, [booking])
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.startTime.localeCompare(b.startTime))
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
        .filter((booking) => BLOCKING_STATUSES.includes(booking.status))
        .reduce((total, booking) => total + booking.durationHours * booking.quantity, 0),
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

  const handleStatus = async (id: string, status: ActivityBookingStatus) => {
    try {
      await updateActivityBookingStatus(id, status)
      toast.success(
        status === 'confirmed'
          ? 'Booking approved.'
          : status === 'cancelled'
            ? 'Booking rejected.'
            : 'Booking marked completed.',
      )
      queryClient.invalidateQueries({ queryKey: ['activity-bookings'] })
    } catch {
      toast.error('Failed to update the booking.')
    }
  }

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
                Loading {label.toLowerCase()} calendar…
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
                      isSelected ? 'border-primary ring-2 ring-primary/30' : 'border-border',
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
                        <span
                          key={booking.id}
                          title={`${booking.customerName} · ${booking.unitName} · ${formatTimeLabel(
                            booking.startTime,
                          )}–${formatTimeLabel(booking.endTime)}`}
                          className={cn(
                            'flex items-center gap-1 truncate rounded border px-1 py-0.5 text-[10px] font-medium sm:text-[11px]',
                            CALENDAR_STATUS_CHIP[booking.status],
                          )}
                        >
                          <span className="font-semibold">{compactTime(booking.startTime)}</span>
                          <span className="truncate">{booking.unitName}</span>
                        </span>
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
                Pick a day to see {label.toLowerCase()} reservations and manage their status.
              </p>
            ) : selectedDayBookings.length === 0 ? (
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <CalendarCheck2 className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold">
                    {selectedDayAll.length > 0 ? 'Hidden by filters' : 'Open for bookings'}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedDayAll.length > 0
                      ? 'Reservations on this date are hidden by your status filters.'
                      : `No ${label.toLowerCase()} reservations on this date.`}
                  </p>
                </div>
              </div>
            ) : (
              selectedDayBookings.map((booking) => (
                <div key={booking.id} className="rounded-xl border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{booking.customerName}</p>
                      <p className="text-xs text-muted-foreground">
                        {booking.reference} · {booking.unitName}
                      </p>
                    </div>
                    <StatusBadge status={booking.status} />
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                    <p className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatTimeLabel(booking.startTime)} – {formatTimeLabel(booking.endTime)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {booking.quantity} {type === 'atv' ? 'ATV' : 'table'}
                        {booking.quantity === 1 ? '' : 's'} · {booking.players} guests
                      </span>
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                    <span className="font-display text-base font-semibold text-primary">
                      {formatCurrency(booking.totalAmount)}
                    </span>
                    <div className="flex gap-1">
                      {booking.status === 'pending' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatus(booking.id, 'confirmed')}
                          >
                            <CheckCircle2 className="h-4 w-4" /> Approve
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatus(booking.id, 'cancelled')}
                          >
                            <XCircle className="h-4 w-4" /> Reject
                          </Button>
                        </>
                      )}
                      {booking.status === 'confirmed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatus(booking.id, 'completed')}
                        >
                          <CheckCircle2 className="h-4 w-4" /> Complete
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <StatCard title="Bookings" value={monthBookings.length} icon={CalendarCheck2} />
          <StatCard title="Pending" value={pendingCount} icon={Clock} />
          <StatCard title="Unit hours" value={reservedHours} icon={Clock} />
          <StatCard title="Revenue" value={formatCurrency(revenue)} icon={CheckCircle2} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">{label} status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {CALENDAR_STATUS_ORDER.map((status) => (
              <div key={status} className="flex items-center gap-2">
                <span className={cn('h-3 w-3 rounded-full', CALENDAR_STATUS_DOT[status])} />
                <span className="text-muted-foreground">{CALENDAR_STATUS_LABELS[status]}</span>
              </div>
            ))}
            <p className="border-t pt-3 text-xs text-muted-foreground">
              Pending, confirmed, and completed bookings hold their time slot. Cancelled bookings do
              not.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
