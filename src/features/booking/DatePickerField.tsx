import { useState } from 'react'
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  addMonths,
  subMonths,
} from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { isDatePast } from '@/features/pricing/pricing-engine'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

interface DatePickerFieldProps {
  value?: string | null
  onChange: (date: string) => void
  occupied?: Set<string>
  disabledDate?: (date: Date) => boolean
  placeholder?: string
  ariaLabel?: string
}

export function DatePickerField({
  value,
  onChange,
  occupied = new Set<string>(),
  disabledDate,
  placeholder = 'Select a date',
  ariaLabel = 'Pick a date',
}: DatePickerFieldProps) {
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => startOfMonth(new Date()))

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) {
      setMonth(value ? startOfMonth(parseISO(value)) : startOfMonth(new Date()))
    }
  }

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month)),
    end: endOfWeek(endOfMonth(month)),
  })

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={ariaLabel}
          className={cn(
            'w-full justify-start gap-2 px-3 font-normal',
            !value && 'text-muted-foreground',
          )}
        >
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {value ? format(parseISO(value), 'EEE, MMM d, yyyy') : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[19rem] rounded-xl border bg-popover p-3 shadow-lg">
        <div className="flex items-center justify-between gap-2 px-1 pb-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Previous month"
            onClick={() => setMonth(subMonths(month, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="font-display text-sm font-semibold">{format(month, 'MMMM yyyy')}</p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Next month"
            onClick={() => setMonth(addMonths(month, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 pb-1">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="py-1 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {days.map((day) => {
            const inMonth = isSameMonth(day, month)
            const key = format(day, 'yyyy-MM-dd')
            const selected = value === key
            const today = isToday(day)
            const isPast = isDatePast(day)
            const isOccupied = occupied.has(key)
            const disabled = !inMonth || isPast || isOccupied || disabledDate?.(day) === true

            return (
              <button
                key={key}
                type="button"
                disabled={disabled}
                onClick={() => {
                  onChange(key)
                  setOpen(false)
                }}
                aria-label={format(day, 'PPP')}
                aria-pressed={selected}
                className={cn(
                  'relative flex aspect-square items-center justify-center rounded-lg text-sm font-medium transition-colors',
                  !inMonth && 'opacity-40',
                  selected && 'bg-primary font-semibold text-primary-foreground shadow-sm',
                  !selected && !disabled && 'text-foreground hover:bg-primary/10',
                  !selected &&
                    disabled &&
                    !isOccupied &&
                    'cursor-not-allowed text-muted-foreground/50',
                  isOccupied && 'cursor-not-allowed bg-muted text-muted-foreground line-through',
                  today && !selected && !isOccupied && 'ring-1 ring-inset ring-primary/50',
                )}
              >
                {format(day, 'd')}
                {isOccupied && selected === false && (
                  <Lock
                    className="absolute right-1 top-1 h-2.5 w-2.5"
                    aria-hidden="true"
                  />
                )}
              </button>
            )
          })}
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 border-t pt-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm border border-border bg-card" />
            Available
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-muted" />
            Occupied
          </span>
        </div>
      </PopoverContent>
    </Popover>
  )
}