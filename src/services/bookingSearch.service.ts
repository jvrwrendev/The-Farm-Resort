import { supabase } from '@/lib/supabase'
import { mapPostgrestError } from '@/lib/errors'

export type BookingSearchType = 'accommodation' | 'pickleball' | 'billiards' | 'atv'

export interface BookingSearchResult {
  reference: string
  customerName: string
  bookingType: BookingSearchType
  itemName: string
  bookingDate: string
  status: string
}

interface SearchRow {
  reference: string
  customer_name: string
  booking_type: BookingSearchType
  item_name: string | null
  booking_date: string | null
  status: string
}

export async function searchBookings(query: string): Promise<BookingSearchResult[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const { data, error } = await supabase.rpc('search_bookings', {
    p_query: trimmed,
  })
  if (error) throw new Error(mapPostgrestError(error))

  return ((data ?? []) as SearchRow[]).map((row) => ({
    reference: row.reference,
    customerName: row.customer_name,
    bookingType: row.booking_type,
    itemName: row.item_name ?? '—',
    bookingDate: row.booking_date ?? '',
    status: row.status,
  }))
}
