import { format, isBefore, parseISO, startOfDay } from 'date-fns'
import { db, persistDatabase } from '@/mock/db'
import { DEFAULT_PRICE_PER_NIGHT } from '@/lib/constants'
import { isBlockingStatus, rangesOverlap } from '@/lib/booking-utils'
import { nightsBetween, sleep, uid } from '@/lib/utils'
import type { AdminBooking, CreateBookingInput } from '@/types'

export function generateBookingReference(): string {
  const dateStr = format(new Date(), 'yyyyMMdd')
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const random = Math.random().toString(36).slice(2, 7).toUpperCase()
    const reference = `BK-${dateStr}-${random}`
    if (!db.bookings.some((booking) => booking.bookingReference === reference)) {
      return reference
    }
  }
  return `BK-${dateStr}-${Date.now().toString(36).toUpperCase()}`
}

export async function isRangeAvailable(
  checkIn: string,
  checkOut: string,
  excludeBookingId?: string,
): Promise<boolean> {
  await sleep(120)
  return !db.bookings.some(
    (booking) =>
      booking.id !== excludeBookingId &&
      isBlockingStatus(booking.status) &&
      rangesOverlap(checkIn, checkOut, booking.checkIn, booking.checkOut),
  )
}

export async function createBooking(input: CreateBookingInput): Promise<AdminBooking> {
  await sleep(350)

  const checkIn = input.checkIn
  const checkOut = input.checkOut

  if (!checkIn || !checkOut) {
    throw new Error('Please select both check-in and check-out dates.')
  }
  if (isBefore(parseISO(checkIn), startOfDay(new Date()))) {
    throw new Error('Check-in date cannot be in the past.')
  }

  const numberOfNights = nightsBetween(checkIn, checkOut)
  if (numberOfNights <= 0) {
    throw new Error('Check-out must be after check-in.')
  }

  if (db.accommodation.status === 'unavailable') {
    throw new Error('The accommodation is currently unavailable for booking.')
  }

  const available = await isRangeAvailable(checkIn, checkOut)
  if (!available) {
    throw new Error('Those dates are already reserved. Please choose another date range.')
  }

  const pricePerNight = db.accommodation.pricePerNight || DEFAULT_PRICE_PER_NIGHT
  const timestamp = new Date().toISOString()

  const booking: AdminBooking = {
    id: uid(),
    bookingReference: generateBookingReference(),
    customerName: input.customerName.trim(),
    email: input.email.trim().toLowerCase(),
    contactNumber: input.contactNumber.trim(),
    accommodationId: db.accommodation.id,
    checkIn,
    checkOut,
    checkInPeriod: input.checkInPeriod ?? 'PM',
    checkOutPeriod: input.checkOutPeriod ?? 'PM',
    adults: input.adults,
    children: input.children,
    specialRequests: (input.specialRequests ?? '').trim(),
    numberOfNights,
    pricePerNight,
    totalAmount: numberOfNights * pricePerNight,
    status: 'pending',
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  db.bookings.unshift(booking)
  persistDatabase()
  return { ...booking }
}

export async function getBookingByReference(reference: string): Promise<AdminBooking | null> {
  await sleep(150)
  const booking = db.bookings.find((item) => item.bookingReference === reference)
  return booking ? { ...booking } : null
}
