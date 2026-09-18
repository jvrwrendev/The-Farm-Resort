import { BLOCKING_STATUSES } from '@/lib/constants'
import type { AdminBooking, AdminBookingStatus, BookingStatus } from '@/types'

export function isBlockingStatus(status: AdminBookingStatus): boolean {
  return (BLOCKING_STATUSES as readonly string[]).includes(status)
}

/** Half-open interval overlap: [checkIn, checkOut). Same-day turnover is allowed. */
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

/** Maps the management statuses onto the legacy landing-calendar statuses. */
export function toLegacyStatus(status: AdminBookingStatus): BookingStatus {
  switch (status) {
    case 'pending':
      return 'pending'
    case 'confirmed':
    case 'checked_in':
      return 'confirmed'
    case 'checked_out':
      return 'completed'
    case 'cancelled':
      return 'cancelled'
    default:
      return 'pending'
  }
}
