import { DEFAULT_ACCOMMODATION_IMAGES } from '@/lib/images'
import type {
  Accommodation,
  AccommodationStatus,
  AdminBooking,
  AdminBookingStatus,
  AppSettings,
  BookingStatus,
  BookingRow,
  CalendarEvent,
  PaymentStatus,
  ProfileRow,
  Profile,
  ResortSettingsRow,
  RoomRow,
} from '@/types'

export function mapRoomToAccommodation(row: RoomRow): Accommodation {
  const fallbackImages = row.image_url ? [row.image_url] : DEFAULT_ACCOMMODATION_IMAGES
  const images = row.images && row.images.length > 0 ? row.images : fallbackImages
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    pricePerNight: Number(row.price_per_night),
    maxGuests: row.capacity,
    amenities: row.amenities ?? [],
    images,
    image_url: row.image_url,
    aboutImageUrl: row.about_image_url ?? null,
    roomImageUrl: row.room_image_url ?? null,
    status: row.status as AccommodationStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapBookingRowToAdmin(row: BookingRow): AdminBooking {
  return {
    id: row.id,
    bookingReference: row.booking_reference,
    customerName: row.customer_name,
    email: row.customer_email,
    contactNumber: row.customer_phone,
    accommodationId: row.room_id,
    checkIn: row.check_in,
    checkOut: row.check_out,
    checkInPeriod: row.check_in_period,
    checkOutPeriod: row.check_out_period,
    adults: row.adults,
    children: row.children,
    specialRequests: row.special_requests ?? '',
    numberOfNights: row.total_nights,
    pricePerNight: Number(row.price_per_night),
    totalAmount: Number(row.total_price),
    status: row.status as AdminBookingStatus,
    paymentStatus: row.payment_status as PaymentStatus,
    bookingType: row.booking_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapResortSettings(row: ResortSettingsRow): AppSettings {
  return {
    id: row.id,
    resortName: row.resort_name,
    email: row.email ?? '',
    phone: row.phone ?? '',
    address: row.address ?? '',
    description: row.description ?? '',
    checkInTime: row.check_in_time,
    checkOutTime: row.check_out_time,
    cancellationPolicy: row.cancellation_policy ?? '',
    bookingPolicy: row.booking_policy ?? '',
    maxGuests: row.max_guests,
    updatedAt: row.updated_at,
  }
}

export function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email ?? '',
    full_name: row.full_name ?? '',
    role: row.role,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export function mapCalendarEvent(input: {
  bookingId: string
  eventDate: string
  status: BookingStatus
  guestName: string
  numberOfGuests: number
  totalAmount: number
}): CalendarEvent {
  return {
    id: `${input.bookingId}-${input.eventDate}`,
    booking_id: input.bookingId,
    event_date: input.eventDate,
    title: input.guestName,
    status: input.status,
    guest_name: input.guestName,
    number_of_guests: input.numberOfGuests,
    total_amount: Number(input.totalAmount),
    created_at: new Date().toISOString(),
  }
}
