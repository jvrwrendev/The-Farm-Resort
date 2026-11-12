import { getPickleballBookedSlots } from '@/services/pickleballBooking.service'
import { PICKLEBALL_SETTINGS } from './mockData'
import type {
  PickleballBooking,
  PickleballBookingStatus,
  PickleballCourt,
  PickleballStats,
  PickleballTimeSlot,
} from './types'
import { generateTimeSlots, isDatePast, isSlotPast, rangesOverlap, timeToMinutes } from './utils'

export const PICKLEBALL_BLOCKING_STATUSES: PickleballBookingStatus[] = [
  'pending',
  'confirmed',
  'completed',
]

/**
 * Builds the hourly schedule for a court by merging court opening hours with
 * the reservations stored in Supabase.
 */
export async function getPickleballAvailability(
  court: PickleballCourt | undefined,
  bookingDate: string,
  now = new Date(),
): Promise<PickleballTimeSlot[]> {
  if (!court || !bookingDate) return []

  const booked = await getPickleballBookedSlots(court.id, bookingDate)
  const settings = {
    ...PICKLEBALL_SETTINGS,
    openTime: court.openTime,
    closeTime: court.closeTime,
    maxPlayers: court.maxPlayers,
  }

  return generateTimeSlots(settings).map((slot) => {
    const conflict = booked.find((entry) =>
      rangesOverlap(slot.startTime, slot.endTime, entry.startTime, entry.endTime),
    )

    if (conflict) {
      return {
        ...slot,
        status: 'reserved',
        bookingStatus: conflict.status,
      }
    }

    if (isSlotPast(bookingDate, slot.startTime, now)) {
      return { ...slot, status: 'past' }
    }

    return slot
  })
}

export async function isPickleballRangeAvailable(
  courtId: string,
  bookingDate: string,
  startTime: string,
  endTime: string,
): Promise<boolean> {
  if (!courtId || !bookingDate || !startTime || !endTime) return false
  if (isDatePast(bookingDate)) return false
  if (timeToMinutes(endTime) <= timeToMinutes(startTime)) return false

  const booked = await getPickleballBookedSlots(courtId, bookingDate)
  return !booked.some((entry) =>
    rangesOverlap(startTime, endTime, entry.startTime, entry.endTime),
  )
}

export function getPickleballStats(
  bookings: PickleballBooking[] = [],
): PickleballStats {
  const today = new Date().toISOString().slice(0, 10)

  return bookings.reduce<PickleballStats>(
    (stats, booking) => {
      stats.total += 1
      stats[booking.status] += 1
      if (booking.status === 'confirmed' || booking.status === 'checked_in' || booking.status === 'completed') {
        stats.revenue += booking.totalAmount
      }
      if (booking.bookingDate === today && booking.status !== 'cancelled') {
        stats.today += 1
      }
      return stats
    },
    {
      total: 0,
      pending: 0,
      confirmed: 0,
      checked_in: 0,
      completed: 0,
      cancelled: 0,
      rejected: 0,
      revenue: 0,
      today: 0,
    },
  )
}
