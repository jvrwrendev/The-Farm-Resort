import { format, parseISO } from 'date-fns'
import type { Activity } from './types'

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

export function formatBookingDate(date: string, pattern = 'EEEE, MMMM d, yyyy'): string {
  if (!date) return '—'
  try {
    return format(parseISO(date), pattern)
  } catch {
    return date
  }
}

export function isWeekendDate(date: string): boolean {
  if (!date) return false
  const day = new Date(`${date}T00:00:00`).getDay()
  return day === 0 || day === 6
}

export function getActivityRate(activity: Activity | undefined, date: string): number {
  if (!activity) return 0
  return isWeekendDate(date) ? activity.weekendRate : activity.weekdayRate
}

export function generateTimeOptions(openTime: string, closeTime: string, stepMinutes = 30): string[] {
  const open = timeToMinutes(openTime)
  const close = timeToMinutes(closeTime)
  const options: string[] = []
  for (let minute = open; minute < close; minute += stepMinutes) {
    options.push(minutesToTime(minute))
  }
  return options
}

export function getEndTime(startTime: string, durationHours: number): string {
  return minutesToTime(timeToMinutes(startTime) + durationHours * 60)
}

export function getDurationHours(start?: string | null, end?: string | null): number {
  if (!start || !end) return 0
  return Math.max(0, (timeToMinutes(end) - timeToMinutes(start)) / 60)
}
