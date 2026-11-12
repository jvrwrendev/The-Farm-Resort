export type ActivityType = 'billiards' | 'atv'

export type ActivityBookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'rejected'

export type ActivityUnitStatus = 'available' | 'maintenance'

export type PaymentStatus = 'unpaid' | 'pending_verification' | 'partially_paid' | 'paid' | 'rejected'

export interface Activity {
  id: string
  type: ActivityType
  name: string
  description: string
  imageUrl: string
  hourlyRate: number
  weekdayRate: number
  weekendRate: number
  inventoryCount: number
  maxPlayers: number
  isAvailable: boolean
  isActive: boolean
  openTime: string
  closeTime: string
}

export interface ActivityUnit {
  id: string
  activityType: ActivityType
  name: string
  identifier: string
  description: string
  imageUrl: string
  hourlyRate: number
  weekdayRate: number
  weekendRate: number
  maxPlayers: number
  status: ActivityUnitStatus
  isActive: boolean
  sortOrder: number
}

export interface ActivityBooking {
  id: string
  reference: string
  customerName: string
  email: string
  contactNumber: string
  activityId: string
  activityType: ActivityType
  activityName: string
  unitId: string | null
  unitName: string
  bookingDate: string
  startTime: string
  endTime: string
  durationHours: number
  quantity: number
  players: number
  hourlyRate: number
  totalAmount: number
  status: ActivityBookingStatus
  paymentStatus: PaymentStatus
  bookingSource: 'online' | 'manual'
  checkInAt: string | null
  checkOutAt: string | null
  notes: string
  createdAt: string
  updatedAt: string
}

export interface ActivityBookingInput {
  activityId: string
  unitId?: string
  customerName: string
  email: string
  contactNumber: string
  bookingDate: string
  startTime: string
  endTime: string
  durationHours: number
  quantity: number
  players: number
  notes?: string
}

export interface ActivityInput {
  type: ActivityType
  name: string
  description?: string
  imageUrl?: string
  hourlyRate: number
  weekdayRate: number
  weekendRate: number
  inventoryCount: number
  maxPlayers: number
  isAvailable: boolean
  isActive: boolean
  openTime: string
  closeTime: string
}

export interface ActivityUnitInput {
  activityType: ActivityType
  name: string
  identifier?: string
  description?: string
  imageUrl?: string
  hourlyRate: number
  weekdayRate: number
  weekendRate: number
  maxPlayers: number
  status: ActivityUnitStatus
  isActive: boolean
  sortOrder?: number
}

export interface ActivityStats {
  total: number
  pending: number
  confirmed: number
  completed: number
  cancelled: number
  revenue: number
}
