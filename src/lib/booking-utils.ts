import { BLOCKING_STATUSES } from '@/lib/constants'
import type { AdminBooking, AdminBookingStatus, BookingStatus } from '@/types'

/** True if a booking in this status reserves its room nights. */
export function isBlockingStatus(status: AdminBookingStatus): boolean {
  return (BLOCKING_STATUSES as readonly string[]).includes(status)
}

/** Half-open interval overlap: [checkIn, checkOut). Same-day turnover allowed. */
export function rangesOverlap(
  aCheckIn: string,
  aCheckOut: string,
  bCheckIn: string,
  bCheckOut: string,
): boolean {
  return aCheckIn < bCheckOut && bCheckIn < aCheckOut
}

/** True when the booking occupies the given yyyy-MM-dd date (checkout day is free). */
export function bookingCoversDate(booking: AdminBooking, date: string): boolean {
  return booking.checkIn <= date && date < booking.checkOut
}

/** Identity helper (kept for API parity with previous versions). */
export function toLegacyStatus(status: AdminBookingStatus): BookingStatus {
  return status as unknown as BookingStatus
}
