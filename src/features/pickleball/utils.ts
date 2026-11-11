import { format, parseISO } from 'date-fns'
import { PICKLEBALL_SETTINGS } from './mockData'
import type { PickleballCourt, PickleballSettings, PickleballTimeSlot } from './types'

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function formatTimeLabel(time?: string | null): string {
  if (!time) return '—'
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const hour = hours % 12 || 12
  return `${hour}:${String(minutes).padStart(2, '0')} ${period}`
}

export function formatTimeRange(start?: string | null, end?: string | null): string {
  if (!start || !end) return 'Select a time'
  return `${formatTimeLabel(start)} – ${formatTimeLabel(end)}`
}

export function getDurationHours(start?: string | null, end?: string | null): number {
  if (!start || !end) return 0
  return Math.max(0, (timeToMinutes(end) - timeToMinutes(start)) / 60)
}

export function rangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return timeToMinutes(startA) < timeToMinutes(endB) && timeToMinutes(endA) > timeToMinutes(startB)
}

export function generateTimeSlots(settings: PickleballSettings = PICKLEBALL_SETTINGS): PickleballTimeSlot[] {
  const open = timeToMinutes(settings.openTime)
  const close = timeToMinutes(settings.closeTime)
  const slots: PickleballTimeSlot[] = []

  for (let start = open; start + settings.slotMinutes <= close; start += settings.slotMinutes) {
    slots.push({
      startTime: minutesToTime(start),
      endTime: minutesToTime(start + settings.slotMinutes),
      status: 'available',
    })
  }

  return slots
}

export function isDatePast(date: string, now = new Date()): boolean {
  return date < format(now, 'yyyy-MM-dd')
}

export function isSlotPast(date: string, startTime: string, now = new Date()): boolean {
  const today = format(now, 'yyyy-MM-dd')
  if (date < today) return true
  if (date > today) return false
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  return timeToMinutes(startTime) <= currentMinutes
}

export function formatBookingDate(date?: string | null, pattern = 'EEE, MMM d, yyyy'): string {
  if (!date) return '—'
  try {
    return format(parseISO(date), pattern)
  } catch {
    return date
  }
}

/** Weekday/weekend rate for a court on a given date, matching the server. */
export function getPickleballRate(court?: PickleballCourt, date?: string): number {
  if (!court) return 0
  if (!date) return court.hourlyRate

  try {
    const day = parseISO(date).getDay()
    const rate = day === 0 || day === 6 ? court.weekendRate : court.weekdayRate
    return rate > 0 ? rate : court.hourlyRate
  } catch {
    return court.hourlyRate
  }
}

export function getAvailableEndTimes(
  slots: PickleballTimeSlot[],
  startTime: string,
  maxDurationHours = PICKLEBALL_SETTINGS.maxDurationHours,
): Array<{ value: string; label: string }> {
  const startIndex = slots.findIndex((slot) => slot.startTime === startTime)
  if (startIndex < 0) return []

  const options: Array<{ value: string; label: string }> = []

  for (let index = startIndex; index < slots.length; index += 1) {
    const slot = slots[index]
    const duration = index - startIndex + 1
    if (duration > maxDurationHours) break
    if (slot.status !== 'available') break

    options.push({
      value: slot.endTime,
      label: `${formatTimeLabel(slot.endTime)} · ${duration} hr${duration === 1 ? '' : 's'}`,
    })
  }

  return options
}
