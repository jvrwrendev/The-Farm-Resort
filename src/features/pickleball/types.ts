export type PickleballBookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'

export type PickleballSlotStatus = 'available' | 'reserved' | 'past'

export interface PickleballCourt {
  id: string
  name: string
  tagline: string
  description: string
  imageUrl: string
  hourlyRate: number
  maxPlayers: number
  surface: string
  isCovered: boolean
  amenities: string[]
}

export type PickleballGalleryCategory =
  | 'Court overview'
  | 'Playing area'
  | 'Net & markings'
  | 'Players'
  | 'Surroundings'
  | 'Facilities'

export interface PickleballGalleryImage {
  id: string
  src: string
  alt: string
  title: string
  category: PickleballGalleryCategory
}

export interface PickleballFacility {
  id: string
  name: string
  description: string
  icon: string
}

export interface PickleballBooking {
  id: string
  reference: string
  customerName: string
  email: string
  contactNumber: string
  courtId: string
  bookingDate: string
  startTime: string
  endTime: string
  players: number
  notes: string
  hourlyRate: number
  durationHours: number
  totalAmount: number
  status: PickleballBookingStatus
  createdAt: string
  updatedAt: string
}

export interface PickleballBookingInput {
  customerName: string
  email: string
  contactNumber: string
  courtId: string
  bookingDate: string
  startTime: string
  endTime: string
  players: number
  notes?: string
}

export interface PickleballTimeSlot {
  startTime: string
  endTime: string
  status: PickleballSlotStatus
  bookingStatus?: PickleballBookingStatus
}

export interface PickleballSettings {
  openTime: string
  closeTime: string
  slotMinutes: number
  maxDurationHours: number
  bookingWindowDays: number
  maxPlayers: number
}

export interface PickleballBookingFilters {
  search?: string
  status?: PickleballBookingStatus | 'all'
  date?: string
  courtId?: string | 'all'
}

export interface PickleballStats {
  total: number
  pending: number
  confirmed: number
  completed: number
  cancelled: number
  revenue: number
  today: number
}
