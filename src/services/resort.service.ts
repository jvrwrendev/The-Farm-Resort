import { supabase } from '@/lib/supabase'
import { mapPostgrestError } from '@/lib/errors'
import { mapCalendarEvent } from '@/lib/mappers'
import { MOCK_GALLERY, MOCK_HERO, MOCK_POLICIES } from '@/features/landing/mockContent'
import type { CalendarEvent, GalleryItem, HeroImage, Policy } from '@/types'

export async function getCalendarEvents(
  startDate: string,
  endDate: string,
): Promise<CalendarEvent[]> {
  if (!startDate || !endDate) return []
  const { data, error } = await supabase.rpc('get_calendar_occupancy', {
    p_from: startDate,
    p_to: endDate,
  })

  if (error) {
    throw new Error(mapPostgrestError(error))
  }

  type OccupancyRow = {
    event_date: string
    booking_id: string
    status: CalendarEvent['status']
    guest_name: string
    number_of_guests: number
    total_amount: number
  }

  const rows = (data ?? []) as unknown as OccupancyRow[]
  return rows.map((row) =>
    mapCalendarEvent({
      bookingId: row.booking_id,
      eventDate: row.event_date,
      status: row.status,
      guestName: row.guest_name,
      numberOfGuests: row.number_of_guests,
      totalAmount: row.total_amount,
    }),
  )
}

export async function getGallery(): Promise<GalleryItem[]> {
  return MOCK_GALLERY
}

export async function getHeroImages(): Promise<HeroImage[]> {
  return MOCK_HERO
}

export async function getPolicies(): Promise<Policy[]> {
  return MOCK_POLICIES
}
