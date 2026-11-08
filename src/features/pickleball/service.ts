import { addDays, format, startOfDay } from 'date-fns'
import { PICKLEBALL_COURTS, PICKLEBALL_SETTINGS } from './mockData'
import { readPickleballBookings, writePickleballBookings } from './storage'
import type {
  PickleballBooking,
  PickleballBookingFilters,
  PickleballBookingInput,
  PickleballBookingStatus,
  PickleballStats,
  PickleballTimeSlot,
} from './types'
import {
  generateBookingReference,
  generateTimeSlots,
  getCourt,
  isDatePast,
  isSlotPast,
  rangesOverlap,
  timeToMinutes,
} from './utils'

export const PICKLEBALL_BLOCKING_STATUSES: PickleballBookingStatus[] = [
  'pending',
  'confirmed',
  'completed',
]

const ALL_STATUSES: PickleballBookingStatus[] = ['pending', 'confirmed', 'completed', 'cancelled']

function sortBookings(bookings: PickleballBooking[]): PickleballBooking[] {
  return [...bookings].sort((a, b) => {
    const dateCompare = a.bookingDate.localeCompare(b.bookingDate)
    if (dateCompare !== 0) return dateCompare
    return a.startTime.localeCompare(b.startTime)
  })
}

export function getPickleballBookings(filters: PickleballBookingFilters = {}): PickleballBooking[] {
  const search = filters.search?.trim().toLowerCase() ?? ''
  const status = filters.status ?? 'all'
  const date = filters.date?.trim() ?? ''
  const courtId = filters.courtId ?? 'all'

  return sortBookings(readPickleballBookings()).filter((booking) => {
    if (status !== 'all' && booking.status !== status) return false
    if (date && booking.bookingDate !== date) return false
    if (courtId !== 'all' && booking.courtId !== courtId) return false

    if (!search) return true

    return [booking.reference, booking.customerName, booking.email, booking.contactNumber]
      .join(' ')
      .toLowerCase()
      .includes(search)
  })
}

export function getPickleballBookingByReference(reference: string): PickleballBooking | undefined {
  if (!reference) return undefined
  return readPickleballBookings().find(
    (booking) => booking.reference.toLowerCase() === reference.toLowerCase(),
  )
}

function hasConflict(
  bookings: PickleballBooking[],
  courtId: string,
  bookingDate: string,
  startTime: string,
  endTime: string,
  excludeReference?: string,
): boolean {
  return bookings.some(
    (booking) =>
      booking.courtId === courtId &&
      booking.bookingDate === bookingDate &&
      booking.reference !== excludeReference &&
      PICKLEBALL_BLOCKING_STATUSES.includes(booking.status) &&
      rangesOverlap(startTime, endTime, booking.startTime, booking.endTime),
  )
}

export function getPickleballAvailability(
  courtId: string,
  bookingDate: string,
  now = new Date(),
): PickleballTimeSlot[] {
  if (!courtId || !bookingDate) return []

  const bookings = readPickleballBookings().filter(
    (booking) =>
      booking.courtId === courtId &&
      booking.bookingDate === bookingDate &&
      PICKLEBALL_BLOCKING_STATUSES.includes(booking.status),
  )

  return generateTimeSlots().map((slot) => {
    const conflict = bookings.find((booking) =>
      rangesOverlap(slot.startTime, slot.endTime, booking.startTime, booking.endTime),
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

export function isPickleballRangeAvailable(
  courtId: string,
  bookingDate: string,
  startTime: string,
  endTime: string,
  excludeReference?: string,
): boolean {
  if (!courtId || !bookingDate || !startTime || !endTime) return false
  if (isDatePast(bookingDate)) return false
  if (timeToMinutes(endTime) <= timeToMinutes(startTime)) return false

  return !hasConflict(
    readPickleballBookings(),
    courtId,
    bookingDate,
    startTime,
    endTime,
    excludeReference,
  )
}

function validateBookingInput(input: PickleballBookingInput): {
  court: NonNullable<ReturnType<typeof getCourt>>
} {
  const court = getCourt(input.courtId)
  if (!court) throw new Error('Please select a valid pickleball court.')

  if (!input.customerName.trim()) throw new Error('Please enter your full name.')
  if (!input.email.trim()) throw new Error('Please enter your email address.')
  if (!input.contactNumber.trim()) throw new Error('Please enter your contact number.')
  if (!input.bookingDate) throw new Error('Please select a booking date.')
  if (isDatePast(input.bookingDate)) throw new Error('Please choose a future booking date.')

  const latestDate = format(
    addDays(startOfDay(new Date()), PICKLEBALL_SETTINGS.bookingWindowDays),
    'yyyy-MM-dd',
  )
  if (input.bookingDate > latestDate) {
    throw new Error(`Bookings can be made up to ${PICKLEBALL_SETTINGS.bookingWindowDays} days ahead.`)
  }

  const start = timeToMinutes(input.startTime)
  const end = timeToMinutes(input.endTime)
  const open = timeToMinutes(PICKLEBALL_SETTINGS.openTime)
  const close = timeToMinutes(PICKLEBALL_SETTINGS.closeTime)

  if (!input.startTime || !input.endTime) throw new Error('Please select a start and end time.')
  if (end <= start) throw new Error('End time must be after start time.')
  if (start < open || end > close) {
    throw new Error(
      `Court bookings are available from ${PICKLEBALL_SETTINGS.openTime} to ${PICKLEBALL_SETTINGS.closeTime}.`,
    )
  }

  const duration = (end - start) / 60
  if (duration > PICKLEBALL_SETTINGS.maxDurationHours) {
    throw new Error(`A single reservation can be up to ${PICKLEBALL_SETTINGS.maxDurationHours} hours.`)
  }

  const players = Number(input.players)
  if (!Number.isFinite(players) || players < 1 || players > court.maxPlayers) {
    throw new Error(`This court hosts up to ${court.maxPlayers} players.`)
  }

  return { court }
}

export function createPickleballBooking(input: PickleballBookingInput): PickleballBooking {
  const { court } = validateBookingInput(input)
  const bookings = readPickleballBookings()

  if (
    hasConflict(bookings, input.courtId, input.bookingDate, input.startTime, input.endTime)
  ) {
    throw new Error('That time slot is no longer available. Please choose another time.')
  }

  const reference = generateBookingReference(new Set(bookings.map((booking) => booking.reference)))
  const now = new Date().toISOString()
  const durationHours = (timeToMinutes(input.endTime) - timeToMinutes(input.startTime)) / 60

  const booking: PickleballBooking = {
    id: `pickleball-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    reference,
    customerName: input.customerName.trim(),
    email: input.email.trim(),
    contactNumber: input.contactNumber.trim(),
    courtId: input.courtId,
    bookingDate: input.bookingDate,
    startTime: input.startTime,
    endTime: input.endTime,
    players: Number(input.players),
    notes: input.notes?.trim() ?? '',
    hourlyRate: court.hourlyRate,
    durationHours,
    totalAmount: court.hourlyRate * durationHours,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  }

  writePickleballBookings([...bookings, booking])
  return booking
}

export function updatePickleballBookingStatus(
  reference: string,
  status: PickleballBookingStatus,
): PickleballBooking {
  if (!ALL_STATUSES.includes(status)) throw new Error('Unsupported booking status.')

  const bookings = readPickleballBookings()
  const index = bookings.findIndex(
    (booking) => booking.reference.toLowerCase() === reference.toLowerCase(),
  )

  if (index < 0) throw new Error('Pickleball booking not found.')

  const updated: PickleballBooking = {
    ...bookings[index],
    status,
    updatedAt: new Date().toISOString(),
  }

  const next = [...bookings]
  next[index] = updated
  writePickleballBookings(next)
  return updated
}

export function getPickleballStats(bookings = readPickleballBookings()): PickleballStats {
  const today = format(new Date(), 'yyyy-MM-dd')

  return bookings.reduce<PickleballStats>(
    (stats, booking) => {
      stats.total += 1
      stats[booking.status] += 1
      if (booking.status === 'confirmed' || booking.status === 'completed') {
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
      completed: 0,
      cancelled: 0,
      revenue: 0,
      today: 0,
    },
  )
}

export function getPickleballCourtOptions(): Array<{ value: string; label: string }> {
  return PICKLEBALL_COURTS.map((court) => ({ value: court.id, label: court.name }))
}
