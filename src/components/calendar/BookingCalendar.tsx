import { useState, useMemo } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
} from 'date-fns'
import { ChevronLeft, ChevronRight, CalendarCheck2, CalendarClock, Lock, Check, Sparkles, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { isDatePast } from '@/features/pricing/pricing-engine'
import type { CalendarEvent } from '@/types'

interface BookingCalendarProps {
  events: CalendarEvent[]
  onDateSelect?: (date: Date, event?: CalendarEvent) => void
  selectedDate?: Date | null
  showGuestInfo?: boolean
  className?: string
}

type DayState = 'available' | 'pending' | 'occupied' | 'past' | 'selected'

function getDayState(
  event: CalendarEvent | undefined,
  isPast: boolean,
  isSelected: boolean,
): DayState {
  if (isPast) return 'past'
  if (isSelected) return 'selected'
  if (!event) return 'available'
  if (event.status === 'confirmed' || event.status === 'completed') return 'occupied'
  if (event.status === 'pending') return 'pending'
  return 'available'
}

const DAY_STATE_STYLES: Record<DayState, string> = {
  available:
    'bg-card text-foreground border border-border hover:border-primary hover:bg-primary/5 hover:-translate-y-0.5 hover:shadow-sm cursor-pointer',
  pending:
    'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 cursor-pointer dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-800/50 dark:hover:bg-amber-950/50',
  occupied:
    'bg-muted text-muted-foreground border border-border cursor-not-allowed',
  past:
    'bg-transparent text-muted-foreground/50 border border-transparent cursor-not-allowed line-through decoration-muted-foreground/30',
  selected:
    'bg-primary text-primary-foreground border-2 border-primary shadow-md ring-2 ring-primary/30 ring-offset-2 ring-offset-background cursor-pointer',
}

const DAY_STATE_ICON: Partial<Record<DayState, React.ComponentType<{ className?: string }>>> = {
  pending: CalendarClock,
  occupied: Lock,
}

export function BookingCalendar({
  events,
  onDateSelect,
  selectedDate,
  showGuestInfo = false,
  className,
}: BookingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart)
    const calEnd = endOfWeek(monthEnd)
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentMonth])

  const eventMap = useMemo(() => {
    const map = new Map<string, CalendarEvent>()
    events.forEach((e) => map.set(e.event_date, e))
    return map
  }, [events])

  const getEventForDate = (date: Date) => {
    const key = format(date, 'yyyy-MM-dd')
    return eventMap.get(key)
  }

  const handleDateClick = (date: Date) => {
    const isPast = isDatePast(date)
    const event = getEventForDate(date)
    const isOccupied = event && ['confirmed', 'completed'].includes(event.status)

    if (isPast || isOccupied) return
    onDateSelect?.(date, event)
  }

  const monthLabel = format(currentMonth, 'MMMM yyyy')
  const yearLabel = format(currentMonth, 'yyyy')

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border bg-card shadow-sm',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b bg-secondary/50 px-5 py-4 sm:px-6">
        <div>
          <p className="font-display text-lg font-semibold text-foreground sm:text-xl">
            {monthLabel}
          </p>
          <p className="text-xs text-muted-foreground">{yearLabel}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-primary hover:text-primary-foreground hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-primary hover:text-primary-foreground hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Weekday header */}
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

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1.5 p-2 sm:gap-2 sm:p-4">
        {days.map((day) => {
          const event = getEventForDate(day)
          const isPast = isDatePast(day)
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const isSelected = !!selectedDate && isSameDay(day, selectedDate)
          const today = isToday(day)
          const state = getDayState(event, isPast, isSelected)
          const StateIcon = DAY_STATE_ICON[state]
          const interactive = !isPast && state !== 'occupied'

          return (
            <motion.button
              key={day.toISOString()}
              type="button"
              whileHover={interactive ? { y: -1 } : undefined}
              whileTap={interactive ? { scale: 0.96 } : undefined}
              transition={{ duration: 0.15 }}
              onClick={() => handleDateClick(day)}
              disabled={!interactive}
              aria-label={format(day, 'PPP')}
              aria-current={today ? 'date' : undefined}
              aria-pressed={isSelected}
              className={cn(
                'relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm font-medium transition-all duration-150',
                DAY_STATE_STYLES[state],
                !isCurrentMonth && !isSelected && 'opacity-50',
              )}
            >
              <span className={cn('leading-none', isSelected && 'font-bold')}>
                {format(day, 'd')}
              </span>

              {today && state !== 'selected' && (
                <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
              )}

              {StateIcon && !isSelected && (
                <StateIcon
                  className={cn(
                    'absolute right-1 top-1 h-3 w-3',
                    state === 'occupied' ? 'text-muted-foreground' : 'text-amber-600 dark:text-amber-400',
                  )}
                />
              )}

              {isSelected && (
                <Check className="absolute right-1 top-1 h-3 w-3 text-primary-foreground" />
              )}

              {event && showGuestInfo && (
                <span className="mt-0.5 max-w-full truncate text-[9px] font-normal opacity-80">
                  {event.guest_name.split(' ')[0]}
                </span>
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="border-t bg-secondary/30 px-4 py-3 sm:px-6 sm:py-4">
        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Legend
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs sm:flex sm:flex-wrap sm:gap-4">
          <LegendItem state="available" label="Available" />
          <LegendItem state="pending" label="Pending" />
          <LegendItem state="occupied" label="Occupied" />
          <LegendItem state="past" label="Past" />
        </div>
      </div>
    </div>
  )
}

function LegendItem({ state, label }: { state: DayState; label: string }) {
  const StateIcon = DAY_STATE_ICON[state]
  return (
    <div className="inline-flex items-center gap-2">
      <span
        className={cn(
          'relative flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-semibold',
          state === 'available' && 'bg-card border border-border text-foreground',
          state === 'pending' && 'bg-amber-50 border border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800/50 dark:text-amber-200',
          state === 'occupied' && 'bg-muted border border-border text-muted-foreground',
          state === 'past' && 'bg-transparent border border-border/50 text-muted-foreground/60 line-through decoration-muted-foreground/40',
        )}
      >
        <span className="leading-none">12</span>
        {StateIcon && (
          <StateIcon
            className={cn(
              'absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-card p-0.5',
              state === 'occupied' ? 'text-muted-foreground' : 'text-amber-600 dark:text-amber-400',
            )}
          />
        )}
      </span>
      <span className="font-medium text-foreground">{label}</span>
    </div>
  )
}

interface AvailabilityDetailsProps {
  selectedDate: Date | null | undefined
  selectedEvent: CalendarEvent | undefined
  onClear?: () => void
}

export function AvailabilityDetails({
  selectedDate,
  selectedEvent,
  onClear,
}: AvailabilityDetailsProps) {
  return (
    <AnimatePresence mode="wait">
      {selectedDate && (
        <motion.div
          key={selectedDate.toISOString()}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="mt-4 overflow-hidden rounded-2xl border bg-card shadow-sm"
        >
          <div className="flex items-start justify-between gap-4 border-b bg-secondary/40 px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Selected date
              </p>
              <p className="font-display mt-1 text-lg font-semibold text-foreground">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
            {onClear && (
              <button
                type="button"
                onClick={onClear}
                aria-label="Clear selection"
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="px-5 py-4">
            {selectedEvent ? (
              <SelectedEventDetails event={selectedEvent} />
            ) : (
              <AvailableDetails date={selectedDate} />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function AvailableDetails({ date }: { date: Date }) {
  const isPast = isDatePast(date)
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Sparkles className="h-5 w-5" />
      </span>
      <div className="flex-1">
        <p className="font-semibold text-foreground">Available for booking</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {isPast
            ? 'This date has already passed. Please choose a future date.'
            : 'This date is open. Reserve the entire resort for your group.'}
        </p>
      </div>
    </div>
  )
}

function SelectedEventDetails({ event }: { event: CalendarEvent }) {
  const statusConfig: Record<
    CalendarEvent['status'],
    { label: string; className: string; message: string; Icon: React.ComponentType<{ className?: string }> }
  > = {
    pending: {
      label: 'Pending review',
      className: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-800/50',
      message: 'A reservation is awaiting admin approval. This date may still become available.',
      Icon: CalendarClock,
    },
    confirmed: {
      label: 'Confirmed',
      className: 'bg-primary text-primary-foreground border-primary',
      message: 'This date is fully booked. Please choose another date.',
      Icon: Lock,
    },
    completed: {
      label: 'Completed',
      className: 'bg-muted text-muted-foreground border-border',
      message: 'This date has passed and the booking is complete.',
      Icon: Check,
    },
    cancelled: {
      label: 'Cancelled',
      className: 'bg-secondary text-secondary-foreground border-border',
      message: 'The previous reservation was cancelled. This date may be available.',
      Icon: Check,
    },
    rejected: {
      label: 'Rejected',
      className: 'bg-secondary text-secondary-foreground border-border',
      message: 'The previous reservation was rejected. This date may be available.',
      Icon: Check,
    },
  }

  const cfg = statusConfig[event.status]

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CalendarCheck2 className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">{event.title}</p>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
                cfg.className,
              )}
            >
              <cfg.Icon className="h-3 w-3" />
              {cfg.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{cfg.message}</p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 rounded-xl border bg-secondary/30 px-4 py-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Guest</dt>
          <dd className="mt-1 font-medium text-foreground">{event.guest_name}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Group size</dt>
          <dd className="mt-1 font-medium text-foreground">{event.number_of_guests} guests</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total</dt>
          <dd className="mt-1 font-medium text-foreground">
            ₱{event.total_amount.toLocaleString('en-PH')}
          </dd>
        </div>
      </dl>
    </div>
  )
}
