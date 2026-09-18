import { useMemo } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { CalendarDays, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { isBlockingStatus } from '@/lib/booking-utils'
import { cn, formatStatus } from '@/lib/utils'
import type { AdminBooking, AdminBookingStatus } from '@/types'

const STATUS_VARIANTS: Record<AdminBookingStatus, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
  pending: 'warning',
  confirmed: 'success',
  checked_in: 'default',
  checked_out: 'outline',
  cancelled: 'destructive',
}

export function StatusBadge({ status }: { status: AdminBookingStatus }) {
  return <Badge variant={STATUS_VARIANTS[status]}>{formatStatus(status)}</Badge>
}

export function StatCard({
  title,
  value,
  icon: Icon,
  hint,
}: {
  title: string
  value: string | number
  icon: ComponentType<{ className?: string }>
  hint?: string
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="font-display mt-2 text-2xl font-bold text-foreground">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
      </CardContent>
    </Card>
  )
}

export function PageHeading({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="font-display text-2xl font-bold">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}

const CALENDAR_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function UpcomingCalendarCard({ bookings }: { bookings: AdminBooking[] }) {
  const navigate = useNavigate()
  const today = useMemo(() => new Date(), [])
  const currentMonth = today

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
    return map
  }, [bookings])

  const days = useMemo(() => {
    const calStart = startOfWeek(startOfMonth(currentMonth))
    const calEnd = endOfWeek(endOfMonth(currentMonth))
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentMonth])

  const monthBookingCount = useMemo(() => {
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd')
    return bookings.filter((booking) => booking.checkIn <= end && booking.checkOut > start).length
  }, [bookings, currentMonth])

  return (
    <Card className="lg:w-[22rem] lg:shrink-0">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <CalendarDays className="h-5 w-5 text-primary" />
          {format(currentMonth, 'MMMM yyyy')}
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/calendar">
            Open <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-2 grid grid-cols-7 border-b pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {CALENDAR_WEEKDAYS.map((day) => (
            <div key={day} className="text-center">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd')
            const dayBookings = bookingsByDate.get(key) ?? []
            const blocking = dayBookings.some((booking) => isBlockingStatus(booking.status))
            const booked = dayBookings.length > 0
            const inMonth = isSameMonth(day, currentMonth)
            const isDayToday = isToday(day)

            return (
              <button
                key={key}
                type="button"
                onClick={() => navigate(`/admin/calendar?date=${key}`)}
                aria-label={`${format(day, 'EEEE, MMMM d')} – ${dayBookings.length} booking${
                  dayBookings.length === 1 ? '' : 's'
                }`}
                className={cn(
                  'flex h-10 items-center justify-center rounded-md border text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  !inMonth && 'opacity-40',
                  blocking
                    ? 'border-primary/40 bg-primary/10 hover:bg-primary/20'
                    : booked
                      ? 'border-border bg-muted/40 hover:border-primary/40 hover:bg-primary/5'
                      : 'border-border bg-card hover:border-primary/40 hover:bg-primary/5',
                  isDayToday && 'ring-2 ring-primary',
                )}
              >
                <span
                  className={cn(
                    'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                    isDayToday && 'bg-primary text-primary-foreground',
                  )}
                >
                  {format(day, 'd')}
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {monthBookingCount} booking{monthBookingCount === 1 ? '' : 's'} this month
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-primary" />
              Occupied
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/40" />
              Booked
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-full border-2 border-primary" />
              Today
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
