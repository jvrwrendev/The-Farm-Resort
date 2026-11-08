import { AlertCircle, Clock, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import type { PickleballTimeSlot } from './types'
import { cn } from '@/lib/utils'
import { formatTimeLabel, getAvailableEndTimes } from './utils'

interface PickleballAvailabilityProps {
  slots: PickleballTimeSlot[]
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  startTime?: string
  endTime?: string
  onStartTimeChange: (value: string) => void
  onEndTimeChange: (value: string) => void
  onSlotSelect: (slot: PickleballTimeSlot) => void
}

function slotInRange(slot: PickleballTimeSlot, startTime?: string, endTime?: string): boolean {
  if (!startTime || !endTime) return false
  return slot.startTime >= startTime && slot.endTime <= endTime
}

export function PickleballAvailability({
  slots,
  isLoading,
  isError,
  onRetry,
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  onSlotSelect,
}: PickleballAvailabilityProps) {
  const startOptions = slots.filter((slot) => slot.status === 'available')
  const endOptions = startTime ? getAvailableEndTimes(slots, startTime) : []
  const openSlots = slots.filter((slot) => slot.status === 'available').length

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-36" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        <span className="inline-flex items-center gap-2 font-medium">
          <AlertCircle className="h-4 w-4" />
          We couldn’t load the court schedule.
        </span>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      </div>
    )
  }

  if (slots.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/30 p-5 text-center text-sm text-muted-foreground">
        Select a court and date to view available time slots.
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">Available time slots</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {openSlots > 0
              ? `${openSlots} open slot${openSlots === 1 ? '' : 's'} · click a slot to select it`
              : 'No open slots for this date. Try another court or date.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm border border-border bg-card" />
            Open
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-muted-foreground/30" />
            Reserved
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
            Selected
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {slots.map((slot) => {
          const selected = slotInRange(slot, startTime, endTime)
          const disabled = slot.status !== 'available'

          return (
            <button
              key={slot.startTime}
              type="button"
              disabled={disabled}
              onClick={() => onSlotSelect(slot)}
              aria-pressed={selected}
              aria-label={`${formatTimeLabel(slot.startTime)} to ${formatTimeLabel(slot.endTime)} — ${slot.status}`}
              className={cn(
                'flex flex-col items-start rounded-xl border px-3 py-2.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                selected && 'border-primary bg-primary text-primary-foreground shadow-sm',
                !selected &&
                  slot.status === 'available' &&
                  'border-border bg-card text-foreground hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/5',
                !selected &&
                  slot.status === 'reserved' &&
                  'cursor-not-allowed border-border bg-muted text-muted-foreground',
                !selected &&
                  slot.status === 'past' &&
                  'cursor-not-allowed border-transparent bg-transparent text-muted-foreground/50',
              )}
            >
              <span className={cn('inline-flex items-center gap-1.5 text-sm font-semibold', slot.status === 'past' && 'line-through')}>
                <Clock className="h-3.5 w-3.5" />
                {formatTimeLabel(slot.startTime)}
              </span>
              <span className="mt-0.5 text-[10px] uppercase tracking-wider opacity-70">
                {selected
                  ? 'Selected'
                  : slot.status === 'available'
                    ? 'Available'
                    : slot.status === 'reserved'
                      ? 'Reserved'
                      : 'Past'}
              </span>
            </button>
          )
        })}
      </div>

      {openSlots > 0 && (
        <div className="grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Start time</Label>
            <Select value={startTime ?? ''} onValueChange={onStartTimeChange}>
              <SelectTrigger disabled={startOptions.length === 0}>
                <SelectValue placeholder="Select start time" />
              </SelectTrigger>
              <SelectContent>
                {startOptions.map((slot) => (
                  <SelectItem key={slot.startTime} value={slot.startTime}>
                    {formatTimeLabel(slot.startTime)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>End time</Label>
            <Select value={endTime ?? ''} onValueChange={onEndTimeChange}>
              <SelectTrigger disabled={!startTime || endOptions.length === 0}>
                <SelectValue placeholder={startTime ? 'Select end time' : 'Select a start time first'} />
              </SelectTrigger>
              <SelectContent>
                {endOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  )
}
