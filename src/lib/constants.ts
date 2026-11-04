import type { BookingTypeDb } from '@/types'

export const DEFAULT_PRICE_PER_NIGHT = 7000
export const DEFAULT_MAX_GUESTS = 25

/** Statuses that block a date from being booked by another guest. */
export const BLOCKING_STATUSES = ['pending', 'confirmed'] as const

/** Human-readable labels for each booking source. */
export const BOOKING_TYPE_LABELS: Record<BookingTypeDb, string> = {
  online_booking: 'Online booking',
  walk_in: 'Walk-in',
  contact_booking: 'Contact booking',
  other_manual: 'Other (manual)',
}

/** Short labels usable inside table pills / dense UI. */
export const BOOKING_TYPE_SHORT_LABELS: Record<BookingTypeDb, string> = {
  online_booking: 'Online',
  walk_in: 'Walk-in',
  contact_booking: 'Contact',
  other_manual: 'Manual',
}

/** Channel options for the booking-type filter. */
export const BOOKING_TYPE_OPTIONS: Array<{ value: BookingTypeDb | 'all'; label: string }> = [
  { value: 'all', label: 'All sources' },
  { value: 'online_booking', label: 'Online booking' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'contact_booking', label: 'Contact booking' },
  { value: 'other_manual', label: 'Other (manual)' },
]
