export type UserRole = 'admin' | 'client'
export type BookingStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed'
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'refunded'
export type PackageType = 'basic' | 'premium_ac'
export type DayType = 'weekday' | 'weekend' | 'holiday'
export type NotificationType =
  | 'booking_submitted'
  | 'booking_approved'
  | 'booking_rejected'
  | 'booking_cancelled'
  | 'booking_completed'
  | 'payment_received'
  | 'system'

export interface Profile {
  id: string
  email: string
  full_name: string
  phone: string
  address: string
  avatar_url: string | null
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ResortSettings {
  id: string
  resort_name: string
  description: string
  contact_number: string
  facebook_page: string
  google_map_url: string
  address: string
  check_in_time: string
  check_out_time: string
  max_parking_slots: number
  videoke_curfew: string
  hero_video_url: string | null
  meta_title: string
  meta_description: string
  created_at: string
  updated_at: string
}

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

export interface Amenity {
  id: string
  name: string
  description: string
  icon: string
  category: string
  is_included: boolean
  additional_fee: number
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
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

export interface Inclusion {
  id: string
  name: string
  description: string
  icon: string
  sort_order: number
  is_active: boolean
  created_at: string
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

export interface Holiday {
  id: string
  name: string
  date: string
  description: string
  is_active: boolean
  created_at: string
}

export interface PromoCode {
  id: string
  code: string
  description: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_amount: number
  max_uses: number | null
  current_uses: number
  valid_from: string
  valid_until: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Booking {
  id: string
  booking_reference: string
  user_id: string | null
  guest_name: string
  guest_email: string
  guest_phone: string
  guest_address: string
  check_in_date: string
  check_out_date: string
  number_of_guests: number
  package_type: PackageType
  status: BookingStatus
  base_rate: number
  addons_total: number
  extra_guests_fee: number
  discount_amount: number
  promo_code_id: string | null
  total_amount: number
  day_type: DayType
  special_requests: string
  valid_id_url: string | null
  valid_id_path: string | null
  admin_notes: string
  qr_code_data: string | null
  is_pwd_discount: boolean
  cancelled_at: string | null
  cancelled_reason: string | null
  approved_at: string | null
  approved_by: string | null
  rejected_at: string | null
  rejected_reason: string | null
  created_at: string
  updated_at: string
  booking_addons?: BookingAddon[]
  payments?: Payment[]
}

export interface BookingAddon {
  id: string
  booking_id: string
  additional_fee_id: string
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
  additional_fee?: AdditionalFee
}

export interface Payment {
  id: string
  booking_id: string
  amount: number
  status: PaymentStatus
  payment_method: string
  transaction_reference: string
  notes: string
  paid_at: string | null
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  data: Record<string, unknown>
  is_read: boolean
  created_at: string
}

export interface ActivityLog {
  id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  details: Record<string, unknown>
  ip_address: string | null
  created_at: string
}

export interface CalendarEvent {
  id: string
  booking_id: string
  event_date: string
  title: string
  status: BookingStatus
  guest_name: string
  number_of_guests: number
  total_amount: number
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

export interface BookingFormData {
  guest_name: string
  guest_email: string
  guest_phone: string
  guest_address: string
  check_in_date: string
  number_of_guests: number
  package_type: PackageType
  special_requests?: string
  is_pwd_discount?: boolean
  promo_code?: string
  addons: Array<{ fee_id: string; quantity: number }>
}

export interface DashboardStats {
  totalClients: number
  totalBookings: number
  pendingBookings: number
  confirmedBookings: number
  cancelledBookings: number
  todayCheckIns: number
  monthlySales: number
  annualSales: number
  occupancyRate: number
}

interface TableType<T> {
  Row: { [K in keyof T]: T[K] }
  Insert: Partial<T>
  Update: Partial<T>
  Relationships: []
}

export interface Database {
  public: {
    Tables: {
      profiles: TableType<Profile>
      resort_settings: TableType<ResortSettings>
      gallery: TableType<GalleryItem>
      hero_images: TableType<HeroImage>
      amenities: TableType<Amenity>
      policies: TableType<Policy>
      inclusions: TableType<Inclusion>
      rates: TableType<Rate>
      additional_fees: TableType<AdditionalFee>
      holidays: TableType<Holiday>
      promo_codes: TableType<PromoCode>
      bookings: TableType<Booking>
      booking_addons: TableType<BookingAddon>
      payments: TableType<Payment>
      notifications: TableType<Notification>
      activity_logs: TableType<ActivityLog>
      calendar_events: TableType<CalendarEvent>
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}

/**
 * Mock domain model for the Exclusive Resort Booking Management System.
 * These types mirror the shape a real API would return so the mock service
 * layer can later be swapped for a backend without UI changes.
 */

export type AdminBookingStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'checked_out'
  | 'cancelled'

export type AccommodationStatus = 'available' | 'unavailable'

export interface Accommodation {
  id: string
  name: string
  description: string
  pricePerNight: number
  maxGuests: number
  amenities: string[]
  images: string[]
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
  adults: number
  children: number
  specialRequests: string
  numberOfNights: number
  pricePerNight: number
  totalAmount: number
  status: AdminBookingStatus
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
  cancelled: number
  upcomingReservations: number
  currentGuests: number
  totalRevenue: number
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
  id: string
  resortName: string
  email: string
  phone: string
  address: string
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
  adults: number
  children: number
  specialRequests?: string
}
