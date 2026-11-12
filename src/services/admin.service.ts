import {
  eachDayOfInterval,
  eachMonthOfInterval,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
} from 'date-fns'
import { supabase } from '@/lib/supabase'
import { mapPostgrestError, mapSupabaseError } from '@/lib/errors'
import { mapBookingRowToAdmin, mapRoomToAccommodation } from '@/lib/mappers'
import type {
  Accommodation,
  AdminBooking,
  AdminBookingStatus,
  AdminCreateBookingInput,
  AdminStats,
  BookingRow,
  BookingTypeDb,
  Customer,
  DashboardStatsJson,
  PaymentStatus,
  ReportData,
  ReportDataJson,
  ReportRange,
  ReportTrendPoint,
  RoomRow,
} from '@/types'

export interface BookingFilters {
  search?: string
  status?: AdminBookingStatus | 'all'
  bookingType?: BookingTypeDb | 'all'
  from?: string
  to?: string
}

function statusToDbStatus(status: AdminBookingStatus | 'all') {
  if (status === 'all') return null
  return status
}

function bookingTypeToDb(type: BookingTypeDb | 'all') {
  if (type === 'all') return null
  return type
}

export async function getBookings(filters: BookingFilters = {}): Promise<AdminBooking[]> {
  const { data, error } = await supabase.rpc('list_admin_bookings', {
    p_search: filters.search?.trim() ? filters.search.trim() : null,
    p_status: statusToDbStatus(filters.status ?? 'all'),
    p_from: filters.from ?? null,
    p_to: filters.to ?? null,
    p_booking_type: bookingTypeToDb(filters.bookingType ?? 'all'),
  })
  if (error) {
    throw new Error(mapSupabaseError(error))
  }
  const rows = (data ?? []) as unknown as BookingRow[]
  return rows.map(mapBookingRowToAdmin)
}

export async function getBookingById(id: string): Promise<AdminBooking | null> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(mapPostgrestError(error))
  if (!data) return null
  return mapBookingRowToAdmin(data as BookingRow)
}

export async function updateBookingTimes(
  id: string,
  checkInTime: string | null,
  checkOutTime: string | null,
): Promise<AdminBooking> {
  const { data, error } = await supabase
    .from('bookings')
    .update({ check_in_time: checkInTime, check_out_time: checkOutTime, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .maybeSingle()
  if (error) throw new Error(mapSupabaseError(error))
  if (!data) throw new Error('Booking not found.')
  return mapBookingRowToAdmin(data as BookingRow)
}

export async function updateBookingStatus(
  id: string,
  status: AdminBookingStatus,
): Promise<AdminBooking> {
  const { data, error } = await supabase.rpc('admin_update_booking_status', {
    p_booking_id: id,
    p_status: status,
  })
  if (error) throw new Error(mapSupabaseError(error))
  const row = data as unknown as BookingRow | null
  if (!row) throw new Error('Booking not found.')
  return mapBookingRowToAdmin(row)
}

export async function updatePaymentStatus(
  id: string,
  paymentStatus: PaymentStatus,
): Promise<AdminBooking> {
  const { data, error } = await supabase.rpc('admin_update_payment_status', {
    p_booking_id: id,
    p_payment_status: paymentStatus,
  })
  if (error) throw new Error(mapSupabaseError(error))
  const row = data as unknown as BookingRow | null
  if (!row) throw new Error('Booking not found.')
  return mapBookingRowToAdmin(row)
}

export async function getCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(mapPostgrestError(error))
  const rows = (data ?? []) as unknown as BookingRow[]
  return aggregateCustomers(rows.map(mapBookingRowToAdmin))
}

function aggregateCustomers(bookings: AdminBooking[]): Customer[] {
  const map = new Map<string, Customer>()
  for (const booking of bookings) {
    const key = booking.email.toLowerCase()
    const isCancelled = booking.status === 'cancelled'
    const spending = isCancelled ? 0 : booking.totalAmount
    const existing = map.get(key)
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

export async function getAdminStats(): Promise<AdminStats> {
  const { data, error } = await supabase.rpc('dashboard_stats')
  if (error) throw new Error(mapSupabaseError(error))
  const stats = (data ?? {}) as DashboardStatsJson
  return {
    totalBookings: stats.total_bookings ?? 0,
    pending: stats.pending ?? 0,
    confirmed: stats.confirmed ?? 0,
    completed: stats.completed ?? 0,
    cancelled: stats.cancelled ?? 0,
    totalRevenue: Number(stats.total_revenue ?? 0),
    upcomingReservations: (stats.upcoming_check_ins ?? 0) + (stats.upcoming_check_outs ?? 0),
    upcomingCheckIns: stats.upcoming_check_ins ?? 0,
    upcomingCheckOuts: stats.upcoming_check_outs ?? 0,
    currentGuests: stats.current_guests ?? 0,
    accommodationAvailable: Boolean(stats.accommodation_available),
  }
}

export async function getReportData(range: ReportRange): Promise<ReportData> {
  const { data, error } = await supabase.rpc('report_data', {
    p_from: range.from,
    p_to: range.to,
  })
  if (error) throw new Error(mapSupabaseError(error))
  const stats = (data ?? {}) as ReportDataJson

  const { data: upcomingRaw, error: upErr } = await supabase
    .from('bookings')
    .select('*')
    .in('status', ['pending', 'confirmed'])
    .gte('check_in', format(new Date(), 'yyyy-MM-dd'))
    .order('check_in', { ascending: true })
    .limit(8)
  if (upErr) throw new Error(mapPostgrestError(upErr))
  const upcoming = (upcomingRaw ?? []) as unknown as BookingRow[]

  // Build trend buckets client-side; use day granularity for short ranges,
  // month for spans longer than ~62 days.
  const from = parseISO(range.from)
  const to = parseISO(range.to)
  const days = eachDayOfInterval({ start: startOfDay(from), end: startOfDay(to) })
  const useMonthly = days.length > 62
  const buckets = useMonthly ? eachMonthOfInterval({ start: from, end: to }) : days
  const bucketKey = (d: Date) =>
    useMonthly ? format(d, 'yyyy-MM') : format(d, 'yyyy-MM-dd')
  const labelFor = (d: Date) =>
    useMonthly ? format(d, 'MMM yyyy') : format(d, 'MMM d')

  const allBookingsResp = await supabase
    .from('bookings')
    .select('*')
    .gte('check_in', range.from)
    .lte('check_in', range.to)
  if (allBookingsResp.error) throw new Error(mapPostgrestError(allBookingsResp.error))
  const allBookings = (allBookingsResp.data ?? []) as unknown as BookingRow[]

  const trend: ReportTrendPoint[] = buckets.map((bucket) => {
    const key = bucketKey(bucket)
    const inBucket = allBookings.filter((b) =>
      useMonthly ? b.check_in.startsWith(key) : b.check_in === key,
    )
    const revenue = inBucket
      .filter((b) => b.status === 'confirmed' || b.status === 'completed')
      .reduce((sum, b) => sum + Number(b.total_price), 0)
    return {
      label: labelFor(bucket),
      bookings: inBucket.length,
      revenue,
    }
  })

  const occupiedNights = Number(stats.occupied_nights ?? 0)
  const totalNights = Number(stats.total_nights ?? 1) || 1
  return {
    range: { from: range.from, to: range.to },
    totalBookings: stats.total_bookings ?? 0,
    confirmed: stats.confirmed ?? 0,
    completed: stats.completed ?? 0,
    cancelled: stats.cancelled ?? 0,
    revenue: Number(stats.revenue ?? 0),
    occupancyRate: Math.round((occupiedNights / totalNights) * 100),
    occupiedNights,
    totalNights,
    trend,
    upcoming: upcoming.map(mapBookingRowToAdmin),
  }
}

export async function getAllRooms(): Promise<Accommodation[]> {
  const { data, error } = await supabase.from('rooms').select('*').order('name')
  if (error) throw new Error(mapPostgrestError(error))
  const rows = (data ?? []) as unknown as RoomRow[]
  return rows.map(mapRoomToAccommodation)
}

/** Admin channel booking — SECURITY DEFINER RPC, backdating allowed. */
export async function adminCreateBooking(
  input: AdminCreateBookingInput,
): Promise<AdminBooking> {
  const { data, error } = await supabase.rpc('admin_create_booking', {
    p_room_id: input.accommodationId,
    p_customer_name: input.customerName,
    p_customer_email: input.email,
    p_customer_phone: input.contactNumber,
    p_check_in: input.checkIn,
    p_check_out: input.checkOut,
    p_guests: input.guests,
    p_check_in_period: input.checkInPeriod,
    p_check_out_period: input.checkOutPeriod,
    p_check_in_time: input.checkInTime ?? null,
    p_check_out_time: input.checkOutTime ?? null,
    p_adults: input.adults,
    p_children: input.children,
    p_booking_type: input.bookingType,
    p_status: input.status,
    p_payment_status: input.paymentStatus,
    p_special_requests: input.specialRequests,
    p_user_id: input.userId ?? null,
  })
  if (error) throw new Error(mapSupabaseError(error))
  const row = data as unknown as BookingRow | null
  if (!row) throw new Error('Booking creation failed.')
  return mapBookingRowToAdmin(row)
}

export function getRangePresets(reference = new Date()): Record<string, ReportRange> {
  const to = format(reference, 'yyyy-MM-dd')
  const startOfWeek = (d: Date) => {
    const x = new Date(d)
    const day = x.getDay()
    x.setDate(x.getDate() - day)
    return x
  }
  const endOfWeek = (d: Date) => {
    const x = new Date(d)
    const day = x.getDay()
    x.setDate(x.getDate() + (6 - day))
    return x
  }

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
      to: format(reference, 'yyyy-MM-dd'),
    },
    year: {
      label: 'This Year',
      from: format(new Date(reference.getFullYear(), 0, 1), 'yyyy-MM-dd'),
      to: format(new Date(reference.getFullYear(), 11, 31), 'yyyy-MM-dd'),
    },
  }
}
