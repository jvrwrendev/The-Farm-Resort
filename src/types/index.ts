/**
 * Application-level types and Supabase Database schema.
 *
 * The booking-system domain types (`AdminBooking`, `Accommodation`, etc.)
 * live BELOW the Supabase types so existing imports continue to work
 * and so the Supabase layer can map cleanly onto the existing UI shape.
 */

// ---------------------------------------------------------------------
// Supabase Database definition (mirrors supabase/migrations/*.sql)
// ---------------------------------------------------------------------

export type AppRole = 'admin' | 'customer'
export type BookingStatusDb = 'pending' | 'confirmed' | 'checked_in' | 'cancelled' | 'completed' | 'rejected'
export type PaymentStatusDb = 'unpaid' | 'pending_verification' | 'partially_paid' | 'paid' | 'rejected'
export type DayPeriodDb = 'AM' | 'PM'
/** How a reservation was created (channel / source). Mirrors the `booking_type` enum. */
export type BookingTypeDb = 'online_booking' | 'walk_in' | 'contact_booking' | 'other_manual'

export type BookingSearchType = 'accommodation' | 'pickleball' | 'billiards' | 'atv'

export interface BookingSearchResult {
  reference: string
  customerName: string
  bookingType: BookingSearchType
  itemName: string
  bookingDate: string
  status: string
}

/** Alias kept for backwards compatibility with existing UI helpers. */
export type BookingStatus = BookingStatusDb

export interface ProfileRow {
  id: string
  full_name: string
  email: string
  role: AppRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface RoomRow {
  id: string
  name: string
  description: string
  price_per_night: number
  capacity: number
  image_url: string | null
  images: string[]
  about_image_url: string | null
  room_image_url: string | null
  amenities: string[]
  status: 'available' | 'unavailable'
  created_at: string
  updated_at: string
}

export interface ResortSettingsRow {
  id: number
  resort_name: string
  email: string
  phone: string
  address: string
  latitude: number | null
  longitude: number | null
  description: string
  check_in_time: string
  check_out_time: string
  max_guests: number
  cancellation_policy: string
  booking_policy: string
  updated_at: string
}

export interface BookingRow {
  id: string
  booking_reference: string
  customer_name: string
  customer_email: string
  customer_phone: string
  check_in: string
  check_out: string
  check_in_period: DayPeriodDb
  check_out_period: DayPeriodDb
  guests: number
  adults: number
  children: number
  room_id: string
  total_nights: number
  price_per_night: number
  total_price: number
  status: BookingStatusDb
  payment_status: PaymentStatusDb
  special_requests: string
  user_id: string | null
  booking_type: BookingTypeDb
  created_at: string
  updated_at: string
}

export interface CalendarOccupancyRow {
  event_date: string
  booking_id: string
  status: BookingStatusDb
  guest_name: string
  number_of_guests: number
  total_amount: number
}

export interface DashboardStatsJson {
  total_bookings: number
  pending: number
  confirmed: number
  completed: number
  cancelled: number
  total_revenue: number
  upcoming_check_ins: number
  upcoming_check_outs: number
  current_guests: number
  accommodation_available: boolean
}

export interface ReportDataJson {
  total_bookings: number
  confirmed: number
  completed: number
  cancelled: number
  revenue: number
  occupied_nights: number
  total_nights: number
  trend: unknown[]
}

type TableRow<T> = {
  Row: T
  Insert: Record<string, unknown>
  Update: Record<string, unknown>
  Relationships: []
}
type FunctionArg<R = unknown> = { Args: Record<string, unknown>; Returns: R }

export interface Database {
  public: {
    Tables: {
      profiles: TableRow<ProfileRow>
      rooms: TableRow<RoomRow>
      bookings: TableRow<BookingRow>
      resort_settings: TableRow<ResortSettingsRow>
    }
    Views: Record<string, never>
    Functions: {
      create_booking: FunctionArg<{
        p_room_id: string
        p_customer_name: string
        p_customer_email: string
        p_customer_phone: string
        p_check_in: string
        p_check_out: string
        p_guests: number
        p_check_in_period?: DayPeriodDb
        p_check_out_period?: DayPeriodDb
        p_special_requests?: string | null
        p_adults?: number
        p_children?: number
        p_user_id?: string | null
      }>
      get_booking_by_reference: FunctionArg<{ p_reference: string }>
      is_range_available: FunctionArg<{ p_room_id: string; p_check_in: string; p_check_out: string }>
      get_calendar_occupancy: FunctionArg<{
        p_from: string
        p_to: string
        p_room_id?: string | null
      }>
      list_admin_bookings: FunctionArg<{
        p_search?: string | null
        p_status?: BookingStatusDb | null
        p_from?: string | null
        p_to?: string | null
        p_booking_type?: BookingTypeDb | null
      }>
      admin_create_booking: FunctionArg<{
        p_room_id: string
        p_customer_name: string
        p_customer_email: string
        p_customer_phone: string
        p_check_in: string
        p_check_out: string
        p_guests: number
        p_check_in_period?: DayPeriodDb
        p_check_out_period?: DayPeriodDb
        p_adults?: number | null
        p_children?: number | null
        p_booking_type?: BookingTypeDb | null
        p_status?: BookingStatusDb | null
        p_payment_status?: PaymentStatusDb | null
        p_special_requests?: string | null
        p_user_id?: string | null
      }>
      admin_update_booking_status: FunctionArg<{
        p_booking_id: string
        p_status: BookingStatusDb
      }>
      admin_update_payment_status: FunctionArg<{
        p_booking_id: string
        p_payment_status: PaymentStatusDb
      }>
      dashboard_stats: FunctionArg<Record<string, never>>
      report_data: FunctionArg<{ p_from: string; p_to: string }>
    }
    Enums: {
      app_role: AppRole
      booking_status: BookingStatusDb
      payment_status: PaymentStatusDb
      day_period: DayPeriodDb
      booking_type: BookingTypeDb
    }
  }
}

// ---------------------------------------------------------------------
// Application domain types — exported for use by UI + services.
// These mirror the Supabase rows but apply UI-friendly naming so most
// existing imports continue to work without changes.
// ---------------------------------------------------------------------

export type AdminBookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'rejected'
export type PaymentStatus = 'unpaid' | 'pending_verification' | 'partially_paid' | 'paid' | 'rejected'
export type AccommodationStatus = 'available' | 'unavailable'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: AppRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Accommodation {
  id: string
  name: string
  description: string
  pricePerNight: number
  maxGuests: number
  amenities: string[]
  images: string[]
  image_url: string | null
  aboutImageUrl: string | null
  roomImageUrl: string | null
  status: AccommodationStatus
  createdAt: string
  updatedAt: string
}

export interface AdminBooking {
  id: string
  bookingReference: string
  customerName: string
  email: string
  contactNumber: string
  accommodationId: string
  checkIn: string
  checkOut: string
  checkInPeriod?: 'AM' | 'PM'
  checkOutPeriod?: 'AM' | 'PM'
  adults: number
  children: number
  specialRequests: string
  numberOfNights: number
  pricePerNight: number
  totalAmount: number
  status: AdminBookingStatus
  paymentStatus: PaymentStatus
  bookingType: BookingTypeDb
  createdAt: string
  updatedAt: string
}

export interface Customer {
  id: string
  name: string
  email: string
  contactNumber: string
  bookingCount: number
  lastBooking: string | null
  totalSpending: number
}

export interface AdminStats {
  totalBookings: number
  pending: number
  confirmed: number
  completed: number
  cancelled: number
  totalRevenue: number
  upcomingReservations: number
  upcomingCheckIns: number
  upcomingCheckOuts: number
  currentGuests: number
  accommodationAvailable: boolean
}

export interface ReportTrendPoint {
  label: string
  bookings: number
  revenue: number
}

export interface ReportData {
  range: { from: string; to: string }
  totalBookings: number
  confirmed: number
  completed: number
  cancelled: number
  revenue: number
  occupancyRate: number
  occupiedNights: number
  totalNights: number
  trend: ReportTrendPoint[]
  upcoming: AdminBooking[]
}

export interface ReportRange {
  label: string
  from: string
  to: string
}

export interface AppSettings {
  id: number
  resortName: string
  email: string
  phone: string
  address: string
  latitude: number | null
  longitude: number | null
  description: string
  checkInTime: string
  checkOutTime: string
  cancellationPolicy: string
  bookingPolicy: string
  maxGuests: number
  updatedAt: string
}

export interface CreateBookingInput {
  customerName: string
  email: string
  contactNumber: string
  checkIn: string
  checkOut: string
  checkInPeriod?: 'AM' | 'PM'
  checkOutPeriod?: 'AM' | 'PM'
  adults: number
  children: number
  specialRequests?: string
}

export interface AdminCreateBookingInput {
  accommodationId: string
  customerName: string
  email: string
  contactNumber: string
  checkIn: string
  checkOut: string
  checkInPeriod?: 'AM' | 'PM'
  checkOutPeriod?: 'AM' | 'PM'
  guests: number
  adults: number
  children: number
  specialRequests?: string
  bookingType: BookingTypeDb
  status: AdminBookingStatus
  paymentStatus: PaymentStatus
  userId?: string | null
}

export interface CalendarEvent {
  id: string
  booking_id: string
  event_date: string
  title: string
  status: BookingStatusDb
  guest_name: string
  number_of_guests: number
  total_amount: number
  created_at: string
}

// ---------------------------------------------------------------------
// Static-content types (kept because the landing page renders a hard-coded
// gallery, hero set and policies list — not part of the spec but preserved
// to honour requirement #14 ("Keep the existing UI").
// ---------------------------------------------------------------------

export interface GalleryItem {
  id: string
  image_url: string
  storage_path: string
  title: string
  alt_text: string
  is_cover: boolean
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface HeroImage {
  id: string
  image_url: string
  storage_path: string
  title: string
  subtitle: string
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface Policy {
  id: string
  title: string
  description: string
  icon: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------
// Pricing-engine support types (kept for the optional pricing utilities).
// These aren't tied to the database but are referenced by pricing helpers.
// ---------------------------------------------------------------------

export type DayType = 'weekday' | 'weekend' | 'holiday'
export type PackageType = 'basic' | 'premium_ac'

export interface AdditionalFee {
  id: string
  name: string
  slug: string
  description: string
  price: number
  is_per_unit: boolean
  max_quantity: number | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Rate {
  id: string
  package_type: PackageType
  guest_count: number
  weekday_price: number
  weekend_price: number
  holiday_price: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Holiday {
  id: string
  name: string
  date: string
  description: string
  is_active: boolean
  created_at: string
}

export interface PricingBreakdown {
  baseRate: number
  addonsTotal: number
  extraGuestsFee: number
  discountAmount: number
  totalAmount: number
  dayType: DayType
  packageType: PackageType
  guestCount: number
  addons: Array<{
    fee: AdditionalFee
    quantity: number
    totalPrice: number
  }>
}
