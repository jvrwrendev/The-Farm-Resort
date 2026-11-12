import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Gauge,
  Lock,
  Sparkles,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  listActivityBookingsForRange,
  listActivityUnits,
  listAllActivities,
} from '@/services/activity.service'
import type { Activity, ActivityBooking, ActivityType, ActivityUnit } from './types'
import { formatTimeLabel, generateTimeOptions, getEndTime } from './utils'
import { isDatePast } from '@/features/pricing/pricing-engine'
import { cn } from '@/lib/utils'

const ACTIVITY_TYPES: ActivityType[] = ['billiards', 'atv']

const TYPE_META: Record<
  ActivityType,
  { label: string; noun: string; icon: typeof CircleDot }
> = {
  billiards: { label: 'Billiards', noun: 'table', icon: CircleDot },
  atv: { label: 'ATV Rental', noun: 'ATV', icon: Gauge },
}

type DayState = 'available' | 'limited' | 'full' | 'past'

interface SlotInfo {
  startTime: string
  endTime: string
  booked: boolean
}

interface UnitAvailability {
  unit: ActivityUnit
  slots: SlotInfo[]
}

interface TypeAvailability {
  activity?: Activity
  units: UnitAvailability[]
  total: number
  free: number
}

type AvailabilityMap = Record<ActivityType, TypeAvailability>

const EMPTY_TYPE: TypeAvailability = { units: [], total: 0, free: 0 }

function buildDayAvailability(
  date: string,
  activities: Activity[],
  units: Record<ActivityType, ActivityUnit[]>,
  bookings: ActivityBooking[],
): AvailabilityMap {
  const result = {} as AvailabilityMap

  for (const type of ACTIVITY_TYPES) {
    const activity = activities.find((item) => item.type === type)
    if (!activity) {
      result[type] = { ...EMPTY_TYPE }
      continue
    }

    const dayBookings = bookings.filter((booking) => booking.bookingDate === date)
    const startTimes = generateTimeOptions(activity.openTime, activity.closeTime, 60)
    const activeUnits = units[type].filter(
      (unit) => unit.isActive && unit.status === 'available',
    )

    const unitAvailability: UnitAvailability[] = activeUnits.map((unit) => ({
      unit,
      slots: startTimes.map((startTime) => {
        const endTime = getEndTime(startTime, 1)

        const booked = dayBookings.some(
          (booking) =>
            booking.unitId === unit.id &&
            booking.startTime < endTime &&
            booking.endTime > startTime,
        )

        return { startTime, endTime, booked }
      }),
    }))

    const total = unitAvailability.reduce((sum, item) => sum + item.slots.length, 0)
    const free = unitAvailability.reduce(
      (sum, item) => sum + item.slots.filter((slot) => !slot.booked).length,
      0,
    )

    result[type] = { activity, units: unitAvailability, total, free }
  }

  return result
}

function getDayState(availability: AvailabilityMap | undefined, past: boolean): DayState {
  if (past) return 'past'
  if (!availability) return 'available'

  const total = ACTIVITY_TYPES.reduce((sum, type) => sum + availability[type].total, 0)
  const free = ACTIVITY_TYPES.reduce((sum, type) => sum + availability[type].free, 0)

  if (total === 0) return 'available'
  if (free === 0) return 'full'
  if (free < total) return 'limited'
  return 'available'
}

const DAY_STYLES: Record<DayState, string> = {
  available:
    'bg-card text-foreground border border-border hover:border-primary hover:bg-primary/5 hover:-translate-y-0.5 hover:shadow-sm cursor-pointer',
  limited:
    'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 cursor-pointer dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-800/50 dark:hover:bg-amber-950/50',
  full:
    'bg-muted text-muted-foreground border border-border cursor-pointer hover:bg-muted/70',
  past:
    'bg-transparent text-muted-foreground/50 border border-transparent cursor-not-allowed line-through decoration-muted-foreground/30',
}

export function ActivityAvailabilityCalendar({ onDateSelect, compact = false }: { onDateSelect?: (date: Date) => void; compact?: boolean } = {}) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const gridStart = startOfWeek(startOfMonth(currentMonth))
  const gridEnd = endOfWeek(endOfMonth(currentMonth))
  const rangeStart = format(gridStart, 'yyyy-MM-dd')
  const rangeEnd = format(gridEnd, 'yyyy-MM-dd')

  const { data: activities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ['activities', 'all'],
    queryFn: listAllActivities,
  })

  const { data: units = { billiards: [], atv: [] }, isLoading: unitsLoading } = useQuery({
    queryKey: ['activity-units', 'availability', 'all'],
    queryFn: async () => {
      const [billiards, atv] = await Promise.all([
        listActivityUnits('billiards'),
        listActivityUnits('atv'),
      ])
      return { billiards, atv }
    },
  })

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['activity-bookings', 'range', rangeStart, rangeEnd],
    queryFn: () => listActivityBookingsForRange(rangeStart, rangeEnd),
  })

  const activeActivities = useMemo(
    () => activities.filter((activity) => activity.isActive && activity.isAvailable),
    [activities],
  )

  const days = useMemo(
    () => eachDayOfInterval({ start: gridStart, end: gridEnd }),
    [gridStart, gridEnd],
  )

  const availabilityByDate = useMemo(() => {
    const map = new Map<string, AvailabilityMap>()
    for (const day of days) {
      map.set(
        format(day, 'yyyy-MM-dd'),
        buildDayAvailability(format(day, 'yyyy-MM-dd'), activeActivities, units, bookings),
      )
    }
    return map
  }, [days, activeActivities, units, bookings])

  const selectedKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null
  const selectedAvailability = selectedKey
    ? (availabilityByDate.get(selectedKey) ??
      buildDayAvailability(selectedKey, activeActivities, units, bookings))
    : null

  const isLoading = activitiesLoading || unitsLoading || bookingsLoading

  const changeMonth = (offset: number) => {
    setCurrentMonth((month) => (offset > 0 ? addMonths(month, 1) : subMonths(month, 1)))
    setSelectedDate(null)
  }

  return (
    <div className={compact ? '' : 'grid grid-cols-1 gap-6 lg:grid-cols-2'}>
      <div className="overflow-hidden rounded-2xl border bg-card lg:sticky lg:top-24 lg:self-start">
        <div className="flex items-center justify-between gap-3 border-b bg-secondary/50 px-5 py-4 sm:px-6">
          <div>
            <p className="font-display text-lg font-semibold text-foreground sm:text-xl">
              {format(currentMonth, 'MMMM yyyy')}
            </p>
            <p className="text-xs text-muted-foreground">
              Billiards &amp; ATV availability
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => changeMonth(-1)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => changeMonth(1)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b bg-card px-2 pt-3 sm:px-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="px-1 pb-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5 p-2 sm:gap-2 sm:p-4">
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd')
            const past = isDatePast(day)
            const state = getDayState(availabilityByDate.get(key), past)
            const isSelected = !!selectedDate && isSameDay(day, selectedDate)
            const isCurrentMonth = isSameMonth(day, currentMonth)

            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  if (past || state === 'full') return
                  setSelectedDate(day)
                  onDateSelect?.(day)
                }}
                disabled={past || state === 'full'}
                aria-label={format(day, 'PPP')}
                aria-current={isToday(day) ? 'date' : undefined}
                aria-pressed={isSelected}
                className={cn(
                  'relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isSelected
                    ? 'border-2 border-primary bg-primary text-primary-foreground shadow-md ring-2 ring-primary/30 ring-offset-2 ring-offset-background'
                    : DAY_STYLES[state],
                  !isCurrentMonth && !isSelected && 'opacity-50',
                )}
              >
                <span className={cn('leading-none', isSelected && 'font-bold')}>
                  {format(day, 'd')}
                </span>

                {isToday(day) && !isSelected && (
                  <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
                )}

                {state === 'full' && !isSelected && (
                  <Lock className="absolute right-1 top-1 h-3 w-3 text-muted-foreground" />
                )}

                {state === 'limited' && !isSelected && (
                  <Sparkles className="absolute right-1 top-1 h-3 w-3 text-amber-600 dark:text-amber-400" />
                )}
              </button>
            )
          })}
        </div>

        {!compact && (
        <div className="border-t bg-secondary/30 px-4 py-3 sm:px-6 sm:py-4">
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Legend
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs sm:flex sm:flex-wrap sm:gap-4">
            <LegendDot className="border border-border bg-card" label="Available" />
            <LegendDot
              className="border border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/30"
              label="Limited slots"
            />
            <LegendDot className="border border-border bg-muted" label="Fully booked" />
            <LegendDot
              className="border border-border/50 bg-transparent"
              label="Past"
            />
          </div>
        </div>
        )}
      </div>

      {!compact && (
      <div className="overflow-hidden rounded-2xl border bg-card lg:sticky lg:top-24 lg:self-start">
        {selectedDate && selectedAvailability ? (
          <>
          <div className="flex items-start justify-between gap-4 border-b bg-secondary/40 px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Selected date
              </p>
              <p className="font-display mt-1 text-lg font-semibold text-foreground">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </p>
              {isLoading && (
                <p className="mt-1 text-xs text-muted-foreground">Updating availability…</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              aria-label="Clear selection"
              className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-5 px-5 py-4">
            {ACTIVITY_TYPES.map((type) => {
              const availability = selectedAvailability[type]
              const meta = TYPE_META[type]

              if (!availability.activity) return null

              return (
                <div key={type} className="rounded-xl border bg-secondary/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {availability.activity.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {availability.total > 0
                            ? `${availability.free} of ${availability.total} hourly slots free`
                            : 'No bookable units yet'}
                        </p>
                      </div>
                    </div>
                    {availability.free > 0 && (
                      <Button asChild size="sm" variant="outline" className="rounded-full">
                        <Link to={`/${type}/book`}>
                          <CalendarDays className="h-3.5 w-3.5" />
                          Book a {meta.noun}
                        </Link>
                      </Button>
                    )}
                  </div>

                  {availability.units.length === 0 ? (
                    <p className="mt-3 text-xs text-muted-foreground">
                      No {meta.noun}s are listed for booking right now.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {availability.units.map(({ unit, slots }) => (
                        <div
                          key={unit.id}
                          className="flex flex-col gap-1.5 rounded-lg border bg-card px-3 py-2 sm:flex-row sm:items-start sm:gap-3"
                        >
                          <span className="min-w-24 text-xs font-semibold text-foreground">
                            {unit.name}
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {slots.map((slot) => (
                              <span
                                key={slot.startTime}
                                title={
                                  slot.booked
                                    ? `Reserved ${formatTimeLabel(slot.startTime)} – ${formatTimeLabel(slot.endTime)}`
                                    : `Available ${formatTimeLabel(slot.startTime)} – ${formatTimeLabel(slot.endTime)}`
                                }
                                className={cn(
                                  'rounded border px-1.5 py-0.5 text-[10px] font-medium',
                                  slot.booked
                                    ? 'border-border bg-muted text-muted-foreground line-through'
                                    : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300',
                                )}
                              >
                                {formatTimeLabel(slot.startTime)}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            <p className="text-xs text-muted-foreground">
              Times shown use each unit&apos;s configured operating hours.
            </p>
          </div>
          </>
        ) : (
          <div className="flex h-full min-h-[16rem] flex-col items-center justify-center gap-3 px-6 py-10 text-center">
            <CalendarDays className="h-8 w-8 text-muted-foreground/60" />
            <div>
              <p className="font-medium text-foreground">No date selected</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Select a date on the calendar to view Billiards &amp; ATV schedules.
              </p>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  )
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className={cn('flex h-6 w-6 items-center justify-center rounded-md', className)}>
        <span className="text-[10px] font-semibold leading-none">12</span>
      </span>
      <span className="font-medium text-foreground">{label}</span>
    </div>
  )
}
