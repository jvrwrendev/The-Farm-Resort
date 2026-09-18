import {
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfDay,
  endOfMonth,
  format,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  endOfWeek,
} from 'date-fns'
import { db, persistDatabase } from '@/mock/db'
import { isBlockingStatus } from '@/lib/booking-utils'
import { sleep } from '@/lib/utils'
import type {
  AdminBooking,
  AdminBookingStatus,
  AdminStats,
  Customer,
  ReportData,
  ReportRange,
} from '@/types'

export interface BookingFilters {
  search?: string
  status?: AdminBookingStatus | 'all'
  from?: string
  to?: string
}

function clone(booking: AdminBooking): AdminBooking {
  return { ...booking }
}

export async function getBookings(filters: BookingFilters = {}): Promise<AdminBooking[]> {
  await sleep(150)
  let list = [...db.bookings]

  if (filters.status && filters.status !== 'all') {
    list = list.filter((booking) => booking.status === filters.status)
  }

  if (filters.search) {
    const query = filters.search.trim().toLowerCase()
    if (query) {
      list = list.filter((booking) =>
        [booking.bookingReference, booking.customerName, booking.email, booking.contactNumber].some(
          (value) => value.toLowerCase().includes(query),
        ),
      )
    }
  }

  if (filters.from) list = list.filter((booking) => booking.checkIn >= filters.from!)
  if (filters.to) list = list.filter((booking) => booking.checkIn <= filters.to!)

  return list
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(clone)
}

export async function getBookingById(id: string): Promise<AdminBooking | null> {
  await sleep(100)
  const booking = db.bookings.find((item) => item.id === id)
  return booking ? clone(booking) : null
}

export async function updateBookingStatus(
  id: string,
  status: AdminBookingStatus,
): Promise<AdminBooking> {
  await sleep(200)
  const booking = db.bookings.find((item) => item.id === id)
  if (!booking) throw new Error('Booking not found.')
  booking.status = status
  booking.updatedAt = new Date().toISOString()
  persistDatabase()
  return clone(booking)
}

export async function getCustomers(): Promise<Customer[]> {
  await sleep(150)
  const map = new Map<string, Customer>()

  for (const booking of db.bookings) {
    const key = booking.email.toLowerCase()
    const existing = map.get(key)
    const isCancelled = booking.status === 'cancelled'
    const spending = isCancelled ? 0 : booking.totalAmount

    if (!existing) {
      map.set(key, {
        id: key,
        name: booking.customerName,
        email: booking.email,
        contactNumber: booking.contactNumber,
        bookingCount: 1,
        lastBooking: booking.checkIn,
        totalSpending: spending,
      })
      continue
    }

    existing.bookingCount += 1
    existing.totalSpending += spending
    if (!existing.lastBooking || booking.checkIn > existing.lastBooking) {
      existing.lastBooking = booking.checkIn
      existing.name = booking.customerName
      existing.contactNumber = booking.contactNumber
    }
  }

  return Array.from(map.values()).sort((a, b) => b.totalSpending - a.totalSpending)
}

function coversToday(booking: AdminBooking, today: string): boolean {
  return booking.checkIn <= today && today < booking.checkOut
}

export async function getAdminStats(): Promise<AdminStats> {
  await sleep(150)
  const today = format(new Date(), 'yyyy-MM-dd')
  const bookings = db.bookings

  const pending = bookings.filter((booking) => booking.status === 'pending').length
  const confirmed = bookings.filter((booking) => booking.status === 'confirmed').length
  const cancelled = bookings.filter((booking) => booking.status === 'cancelled').length

  const upcomingReservations = bookings.filter(
    (booking) => booking.checkIn >= today && ['pending', 'confirmed'].includes(booking.status),
  ).length

  const currentGuests = bookings
    .filter((booking) => booking.status === 'checked_in')
    .reduce((sum, booking) => sum + booking.adults + booking.children, 0)

  const totalRevenue = bookings
    .filter((booking) => ['confirmed', 'checked_in', 'checked_out'].includes(booking.status))
    .reduce((sum, booking) => sum + booking.totalAmount, 0)

  const accommodationAvailable = !bookings.some(
    (booking) => isBlockingStatus(booking.status) && coversToday(booking, today),
  )

  return {
    totalBookings: bookings.length,
    pending,
    confirmed,
    cancelled,
    upcomingReservations,
    currentGuests,
    totalRevenue,
    accommodationAvailable,
  }
}

export async function getReportData(range: ReportRange): Promise<ReportData> {
  await sleep(200)
  const from = parseISO(range.from)
  const to = parseISO(range.to)
  const interval = { start: startOfDay(from), end: endOfDay(to) }
  const today = format(new Date(), 'yyyy-MM-dd')

  const inRange = db.bookings.filter((booking) => {
    const checkIn = parseISO(booking.checkIn)
    return isWithinInterval(checkIn, interval)
  })

  const confirmed = inRange.filter((booking) =>
    ['confirmed', 'checked_in', 'checked_out'].includes(booking.status),
  ).length
  const cancelled = inRange.filter((booking) => booking.status === 'cancelled').length
  const revenue = inRange
    .filter((booking) => ['confirmed', 'checked_in', 'checked_out'].includes(booking.status))
    .reduce((sum, booking) => sum + booking.totalAmount, 0)

  const allDays = eachDayOfInterval(interval)
  const occupiedNights = allDays.filter((day) => {
    const key = format(day, 'yyyy-MM-dd')
    return db.bookings.some(
      (booking) => isBlockingStatus(booking.status) && booking.checkIn <= key && key < booking.checkOut,
    )
  }).length
  const totalNights = allDays.length
  const occupancyRate = totalNights > 0 ? Math.round((occupiedNights / totalNights) * 100) : 0

  const useMonthly = totalNights > 62
  const buckets = useMonthly ? eachMonthOfInterval(interval) : allDays
  const bucketKey = (date: Date) => (useMonthly ? format(date, 'yyyy-MM') : format(date, 'yyyy-MM-dd'))
  const labelFor = (date: Date) => (useMonthly ? format(date, 'MMM yyyy') : format(date, 'MMM d'))

  const trend = buckets.map((bucket) => {
    const key = bucketKey(bucket)
    const bucketBookings = inRange.filter((booking) =>
      useMonthly ? booking.checkIn.startsWith(key) : booking.checkIn === key,
    )
    return {
      label: labelFor(bucket),
      bookings: bucketBookings.length,
      revenue: bucketBookings
        .filter((booking) => ['confirmed', 'checked_in', 'checked_out'].includes(booking.status))
        .reduce((sum, booking) => sum + booking.totalAmount, 0),
    }
  })

  const upcoming = db.bookings
    .filter((booking) => booking.checkIn >= today && ['pending', 'confirmed'].includes(booking.status))
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn))
    .slice(0, 8)
    .map(clone)

  return {
    range: { from: range.from, to: range.to },
    totalBookings: inRange.length,
    confirmed,
    cancelled,
    revenue,
    occupancyRate,
    occupiedNights,
    totalNights,
    trend,
    upcoming,
  }
}

export function getRangePresets(reference = new Date()): Record<string, ReportRange> {
  const to = format(reference, 'yyyy-MM-dd')
  return {
    today: { label: 'Today', from: to, to },
    week: {
      label: 'This Week',
      from: format(startOfWeek(reference), 'yyyy-MM-dd'),
      to: format(endOfWeek(reference), 'yyyy-MM-dd'),
    },
    month: {
      label: 'This Month',
      from: format(startOfMonth(reference), 'yyyy-MM-dd'),
      to: format(endOfMonth(reference), 'yyyy-MM-dd'),
    },
    year: {
      label: 'This Year',
      from: format(new Date(reference.getFullYear(), 0, 1), 'yyyy-MM-dd'),
      to: format(new Date(reference.getFullYear(), 11, 31), 'yyyy-MM-dd'),
    },
  }
}
