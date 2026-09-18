import { addDays, eachDayOfInterval, format, parseISO } from 'date-fns'
import { db } from '@/mock/db'
import { MOCK_GALLERY, MOCK_HERO } from '@/features/landing/mockContent'
import { isBlockingStatus, toLegacyStatus } from '@/lib/booking-utils'
import { sleep } from '@/lib/utils'
import type {
  CalendarEvent,
  GalleryItem,
  HeroImage,
  Policy,
  ResortSettings,
} from '@/types'

export async function getGallery(): Promise<GalleryItem[]> {
  await sleep(120)
  return MOCK_GALLERY
}

export async function getHeroImages(): Promise<HeroImage[]> {
  await sleep(120)
  return MOCK_HERO
}

const MOCK_POLICIES: Policy[] = [
  {
    id: 'policy-1',
    title: 'Exclusive Use',
    description:
      'The entire resort is reserved for one group at a time. Your booking guarantees private use of all facilities.',
    icon: 'home',
    sort_order: 1,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'policy-2',
    title: 'Check-in & Check-out',
    description:
      'Check-in is from 2:00 PM and check-out is by 12:00 PM. Early check-in and late check-out may be arranged in advance.',
    icon: 'clock',
    sort_order: 2,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'policy-3',
    title: 'Cancellation',
    description:
      'Free cancellation up to 7 days before check-in. Cancellations made within 7 days are subject to a one-night charge.',
    icon: 'calendar',
    sort_order: 3,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'policy-4',
    title: 'House Rules',
    description:
      'Please keep noise reasonable after the videoke curfew, dispose of trash properly, and respect the gardens and wildlife.',
    icon: 'shield',
    sort_order: 4,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export async function getPolicies(): Promise<Policy[]> {
  await sleep(120)
  return MOCK_POLICIES
}

export async function getCalendarEvents(
  startDate: string,
  endDate: string,
): Promise<CalendarEvent[]> {
  await sleep(150)
  const start = parseISO(startDate)
  const end = parseISO(endDate)
  if (end < start) return []

  const days = eachDayOfInterval({ start, end })
  const events: CalendarEvent[] = []

  for (const booking of db.bookings) {
    if (!isBlockingStatus(booking.status)) continue

    // Occupied nights: [checkIn, checkOut)
    const lastNight = addDays(parseISO(booking.checkOut), -1)
    if (lastNight < parseISO(booking.checkIn)) continue

    for (const day of days) {
      const key = format(day, 'yyyy-MM-dd')
      if (key >= booking.checkIn && key < booking.checkOut) {
        events.push({
          id: `${booking.id}-${key}`,
          booking_id: booking.id,
          event_date: key,
          title: booking.customerName,
          status: toLegacyStatus(booking.status),
          guest_name: booking.customerName,
          number_of_guests: booking.adults + booking.children,
          total_amount: booking.totalAmount,
          created_at: booking.createdAt,
        })
      }
    }
  }

  return events.sort((a, b) => a.event_date.localeCompare(b.event_date))
}

export async function getResortSettings(): Promise<ResortSettings | null> {
  await sleep(120)
  return {
    id: db.settings.id,
    resort_name: db.settings.resortName,
    description: db.settings.description,
    contact_number: db.settings.phone,
    facebook_page: '',
    google_map_url: '',
    address: db.settings.address,
    check_in_time: db.settings.checkInTime,
    check_out_time: db.settings.checkOutTime,
    max_parking_slots: 6,
    videoke_curfew: '10:00 PM',
    hero_video_url: null,
    meta_title: `${db.settings.resortName} — Exclusive Resort Accommodation`,
    meta_description: db.settings.description,
    created_at: new Date().toISOString(),
    updated_at: db.settings.updatedAt,
  }
}
