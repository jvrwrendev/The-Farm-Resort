import { supabase } from '@/lib/supabase'
import { mapSupabaseError, mapPostgrestError } from '@/lib/errors'
import { mapBookingRowToAdmin } from '@/lib/mappers'
import type { AdminBooking, BookingRow, CreateBookingInput } from '@/types'

export async function isRangeAvailable(
  checkIn: string,
  checkOut: string,
  roomId?: string,
): Promise<boolean> {
  if (!checkIn || !checkOut || !roomId) return true
  const { data, error } = await supabase.rpc('is_range_available', {
    p_room_id: roomId,
    p_check_in: checkIn,
    p_check_out: checkOut,
  })
  if (error) {
    throw new Error(mapPostgrestError(error))
  }
  return Boolean(data)
}

export async function createBooking(
  input: CreateBookingInput,
  roomId: string,
): Promise<AdminBooking> {
  const guests = (input.adults ?? 0) + (input.children ?? 0)
  const { data, error } = await supabase.rpc('create_booking', {
    p_room_id: roomId,
    p_customer_name: input.customerName,
    p_customer_email: input.email,
    p_customer_phone: input.contactNumber,
    p_check_in: input.checkIn,
    p_check_out: input.checkOut,
    p_check_in_period: input.checkInPeriod ?? 'PM',
    p_check_out_period: input.checkOutPeriod ?? 'PM',
    p_guests: guests,
    p_adults: input.adults,
    p_children: input.children,
    p_special_requests: input.specialRequests ?? '',
  })

  if (error) {
    throw new Error(mapSupabaseError(error))
  }
  const row = data as unknown as BookingRow
  if (!row) throw new Error('Booking creation failed. Please try again.')
  return mapBookingRowToAdmin(row)
}

export async function getBookingByReference(reference: string): Promise<AdminBooking | null> {
  if (!reference) return null
  const { data, error } = await supabase.rpc('get_booking_by_reference', {
    p_reference: reference,
  })
  if (error) {
    throw new Error(mapSupabaseError(error))
  }
  const row = data as unknown as BookingRow | null
  if (!row) return null
  return mapBookingRowToAdmin(row)
}
