import { supabase } from '@/lib/supabase'
import { mapPostgrestError } from '@/lib/errors'
import type {
  PickleballBooking,
  PickleballBookingInput,
  PickleballBookingStatus,
} from '@/features/pickleball/types'

interface PickleballBookingRow {
  id: string
  reference: string
  customer_name: string
  email: string
  contact_number: string
  court_id: string
  booking_date: string
  start_time: string
  end_time: string
  duration_hours: number
  players: number
  hourly_rate: number
  total_amount: number
  status: PickleballBookingStatus
  payment_status?: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PickleballBookedSlot {
  startTime: string
  endTime: string
  status: PickleballBookingStatus
}

export interface PickleballOccupancyRow {
  bookingDate: string
  courtId: string
  startTime: string
  endTime: string
  status: PickleballBookingStatus
}

function rowToBooking(row: PickleballBookingRow): PickleballBooking {
  return {
    id: row.id,
    reference: row.reference,
    customerName: row.customer_name,
    email: row.email,
    contactNumber: row.contact_number,
    courtId: row.court_id,
    bookingDate: row.booking_date,
    startTime: row.start_time,
    endTime: row.end_time,
    players: row.players,
    notes: row.notes ?? '',
    hourlyRate: Number(row.hourly_rate),
    durationHours: Number(row.duration_hours),
    totalAmount: Number(row.total_amount),
    status: row.status,
    paymentStatus: (row.payment_status as PickleballBooking['paymentStatus']) ?? 'unpaid',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listPickleballBookings(): Promise<PickleballBooking[]> {
  const { data, error } = await supabase
    .from('pickleball_bookings')
    .select('*')
    .order('booking_date', { ascending: true })
    .order('start_time', { ascending: true })
  if (error) throw new Error(mapPostgrestError(error))
  return (data ?? []).map((row) => rowToBooking(row as PickleballBookingRow))
}

export async function listPickleballBookingsForRange(
  startDate: string,
  endDate: string,
): Promise<PickleballBooking[]> {
  const { data, error } = await supabase
    .from('pickleball_bookings')
    .select('*')
    .gte('booking_date', startDate)
    .lte('booking_date', endDate)
    .order('booking_date', { ascending: true })
    .order('start_time', { ascending: true })
  if (error) throw new Error(mapPostgrestError(error))
  return (data ?? []).map((row) => rowToBooking(row as PickleballBookingRow))
}

export async function getPickleballBookingByReference(
  reference: string,
): Promise<PickleballBooking | null> {
  if (!reference) return null
  const { data, error } = await supabase.rpc('get_pickleball_booking', {
    p_reference: reference,
  })
  if (error) throw new Error(mapPostgrestError(error))
  if (!data) return null
  return rowToBooking(data as PickleballBookingRow)
}

export async function createPickleballBooking(
  input: PickleballBookingInput,
): Promise<PickleballBooking> {
  const { data, error } = await supabase.rpc('create_pickleball_booking', {
    p_court_id: input.courtId,
    p_customer_name: input.customerName.trim(),
    p_email: input.email.trim(),
    p_contact_number: input.contactNumber.trim(),
    p_booking_date: input.bookingDate,
    p_start_time: input.startTime,
    p_end_time: input.endTime,
    p_players: Number(input.players),
    p_notes: input.notes?.trim() || null,
  })
  if (error) throw new Error(mapPostgrestError(error))
  if (!data) throw new Error('Unable to retrieve the new reservation.')
  return rowToBooking(data as PickleballBookingRow)
}

export async function updatePickleballBookingStatus(
  reference: string,
  status: PickleballBookingStatus,
): Promise<PickleballBooking> {
  const { data, error } = await supabase
    .from('pickleball_bookings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('reference', reference)
    .select('*')
    .single()
  if (error) throw new Error(mapPostgrestError(error))
  return rowToBooking(data as PickleballBookingRow)
}

export async function getPickleballBookedSlots(
  courtId: string,
  bookingDate: string,
): Promise<PickleballBookedSlot[]> {
  if (!courtId || !bookingDate) return []
  const { data, error } = await supabase.rpc('get_pickleball_booked_slots', {
    p_court_id: courtId,
    p_date: bookingDate,
  })
  if (error) throw new Error(mapPostgrestError(error))

  type SlotRow = { start_time: string; end_time: string; status: PickleballBookingStatus }
  return ((data ?? []) as SlotRow[]).map((row) => ({
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status,
  }))
}

export async function getPickleballOccupancy(
  startDate: string,
  endDate: string,
): Promise<PickleballOccupancyRow[]> {
  const { data, error } = await supabase.rpc('get_pickleball_occupancy', {
    p_from: startDate,
    p_to: endDate,
  })
  if (error) throw new Error(mapPostgrestError(error))

  type Occupancy = {
    booking_date: string
    court_id: string
    start_time: string
    end_time: string
    status: PickleballBookingStatus
  }
  return ((data ?? []) as Occupancy[]).map((row) => ({
    bookingDate: row.booking_date,
    courtId: row.court_id,
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status,
  }))
}
