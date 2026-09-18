import { addDays, format } from 'date-fns'
import {
  DEFAULT_ACCOMMODATION_ID,
  DEFAULT_ACCOMMODATION_NAME,
  DEFAULT_MAX_GUESTS,
  DEFAULT_PRICE_PER_NIGHT,
} from '@/lib/constants'
import { DEFAULT_ACCOMMODATION_IMAGES } from '@/lib/images'
import { uid } from '@/lib/utils'
import type { Accommodation, AdminBooking, AdminBookingStatus, AppSettings } from '@/types'

const dateOffset = (days: number) => format(addDays(new Date(), days), 'yyyy-MM-dd')
const nowIso = () => new Date().toISOString()

export function createSeedAccommodation(): Accommodation {
  const created = nowIso()
  return {
    id: DEFAULT_ACCOMMODATION_ID,
    name: DEFAULT_ACCOMMODATION_NAME,
    description:
      'The entire resort is yours. Our single private accommodation hosts one group at a time, with spacious rooms, a refreshing pool, lush gardens, and open-air dining — ideal for family reunions, team retreats, and intimate celebrations.',
    pricePerNight: DEFAULT_PRICE_PER_NIGHT,
    maxGuests: DEFAULT_MAX_GUESTS,
    amenities: [
      'Swimming Pool',
      'Air Conditioning',
      'Wi-Fi',
      'Parking',
      'Kitchen',
      'Videoke',
      'Outdoor / Nature',
    ],
    images: DEFAULT_ACCOMMODATION_IMAGES,
    status: 'available',
    createdAt: created,
    updatedAt: created,
  }
}

interface SeedBookingInput {
  ref: string
  name: string
  email: string
  contact: string
  checkInOffset: number
  checkOutOffset: number
  adults: number
  children: number
  status: AdminBookingStatus
  pricePerNight?: number
  specialRequests?: string
}

function buildBooking(seed: SeedBookingInput): AdminBooking {
  const checkIn = dateOffset(seed.checkInOffset)
  const checkOut = dateOffset(seed.checkOutOffset)
  const nights = Math.max(1, seed.checkOutOffset - seed.checkInOffset)
  const price = seed.pricePerNight ?? DEFAULT_PRICE_PER_NIGHT
  const created = addDays(new Date(), seed.checkInOffset - 14).toISOString()

  return {
    id: uid(),
    bookingReference: seed.ref,
    customerName: seed.name,
    email: seed.email,
    contactNumber: seed.contact,
    accommodationId: DEFAULT_ACCOMMODATION_ID,
    checkIn,
    checkOut,
    adults: seed.adults,
    children: seed.children,
    specialRequests: seed.specialRequests ?? '',
    numberOfNights: nights,
    pricePerNight: price,
    totalAmount: nights * price,
    status: seed.status,
    createdAt: created,
    updatedAt: created,
  }
}

export function createSeedBookings(): AdminBooking[] {
  const seeds: SeedBookingInput[] = [
    {
      ref: 'BK-DEMO-0001',
      name: 'Maria Santos',
      email: 'maria.santos@example.com',
      contact: '+63 917 555 0101',
      checkInOffset: -40,
      checkOutOffset: -38,
      adults: 8,
      children: 3,
      status: 'checked_out',
      specialRequests: 'Early check-in requested.',
    },
    {
      ref: 'BK-DEMO-0002',
      name: 'Jose Ramirez',
      email: 'jose.ramirez@example.com',
      contact: '+63 917 555 0102',
      checkInOffset: -30,
      checkOutOffset: -28,
      adults: 10,
      children: 0,
      status: 'checked_out',
      pricePerNight: 6500,
      specialRequests: 'Corporate team building.',
    },
    {
      ref: 'BK-DEMO-0003',
      name: 'Angela Cruz',
      email: 'angela.cruz@example.com',
      contact: '+63 917 555 0103',
      checkInOffset: -20,
      checkOutOffset: -18,
      adults: 6,
      children: 4,
      status: 'checked_out',
    },
    {
      ref: 'BK-DEMO-0004',
      name: 'Daniel Reyes',
      email: 'daniel.reyes@example.com',
      contact: '+63 917 555 0104',
      checkInOffset: -6,
      checkOutOffset: -4,
      adults: 5,
      children: 2,
      status: 'cancelled',
      specialRequests: 'Cancelled due to weather.',
    },
    {
      ref: 'BK-DEMO-0005',
      name: 'Sofia Mendoza',
      email: 'sofia.mendoza@example.com',
      contact: '+63 917 555 0105',
      checkInOffset: -1,
      checkOutOffset: 1,
      adults: 12,
      children: 5,
      status: 'checked_in',
      specialRequests: 'Celebrating a birthday — please prepare the videoke.',
    },
    {
      ref: 'BK-DEMO-0006',
      name: 'Marco Villanueva',
      email: 'marco.villanueva@example.com',
      contact: '+63 917 555 0106',
      checkInOffset: 4,
      checkOutOffset: 5,
      adults: 9,
      children: 3,
      status: 'confirmed',
    },
    {
      ref: 'BK-DEMO-0007',
      name: 'Bianca Torres',
      email: 'bianca.torres@example.com',
      contact: '+63 917 555 0107',
      checkInOffset: 7,
      checkOutOffset: 9,
      adults: 14,
      children: 6,
      status: 'confirmed',
      specialRequests: 'Family reunion — extra mattresses appreciated.',
    },
    {
      ref: 'BK-DEMO-0008',
      name: 'Paolo Garcia',
      email: 'paolo.garcia@example.com',
      contact: '+63 917 555 0108',
      checkInOffset: 14,
      checkOutOffset: 15,
      adults: 4,
      children: 0,
      status: 'confirmed',
    },
    {
      ref: 'BK-DEMO-0009',
      name: 'Isabel Navarro',
      email: 'isabel.navarro@example.com',
      contact: '+63 917 555 0109',
      checkInOffset: 21,
      checkOutOffset: 23,
      adults: 11,
      children: 4,
      status: 'confirmed',
    },
    {
      ref: 'BK-DEMO-0010',
      name: 'Rafael Lim',
      email: 'rafael.lim@example.com',
      contact: '+63 917 555 0110',
      checkInOffset: 30,
      checkOutOffset: 32,
      adults: 7,
      children: 2,
      status: 'pending',
      specialRequests: 'Awaiting confirmation of catering add-on.',
    },
    {
      ref: 'BK-DEMO-0011',
      name: 'Camille Aquino',
      email: 'camille.aquino@example.com',
      contact: '+63 917 555 0111',
      checkInOffset: 40,
      checkOutOffset: 41,
      adults: 15,
      children: 8,
      status: 'pending',
    },
    {
      ref: 'BK-DEMO-0012',
      name: 'Nico Domingo',
      email: 'nico.domingo@example.com',
      contact: '+63 917 555 0112',
      checkInOffset: 52,
      checkOutOffset: 54,
      adults: 6,
      children: 3,
      status: 'pending',
      specialRequests: 'Planning a small wedding reception.',
    },
  ]

  return seeds.map(buildBooking)
}

export function createSeedSettings(): AppSettings {
  return {
    id: 'settings-1',
    resortName: 'The Farm',
    email: 'stay@thefarm.ph',
    phone: '+63 912 345 6789',
    address: 'Brgy. San Isidro, Antipolo City, Rizal',
    description:
      'A private farm resort reserved for one group at a time. Spacious villas, lush gardens, and warm hospitality make every stay feel exclusive.',
    checkInTime: '14:00',
    checkOutTime: '12:00',
    cancellationPolicy:
      'Free cancellation up to 7 days before check-in. Cancellations made within 7 days are subject to a one-night charge.',
    bookingPolicy:
      'A reservation is confirmed once approved by our team. The full amount is payable on arrival. Check-in is from 2:00 PM and check-out is by 12:00 PM.',
    maxGuests: DEFAULT_MAX_GUESTS,
    updatedAt: nowIso(),
  }
}
