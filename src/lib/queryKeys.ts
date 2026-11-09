export const queryKeys = {
  accommodation: ['accommodation'] as const,
  settings: ['app-settings'] as const,
  adminBookings: (filters?: unknown) => ['admin-bookings', filters ?? {}] as const,
  adminBooking: (id: string) => ['admin-booking', id] as const,
  bookingByReference: (reference: string) => ['booking', reference] as const,
  availability: (roomId: string | null, checkIn: string, checkOut: string) =>
    ['availability', roomId, checkIn, checkOut] as const,
  customers: ['customers'] as const,
  adminStats: ['admin-stats'] as const,
  reports: (from: string, to: string) => ['reports', from, to] as const,
  gallery: ['gallery'] as const,
  policies: ['policies'] as const,
  calendarEvents: (from: string, to: string) => ['calendar-events', from, to] as const,
  resortSettings: ['resort-settings'] as const,
  pickleballBookings: (filters?: unknown) => ['pickleball', 'bookings', filters ?? {}] as const,
  pickleballBooking: (reference: string) => ['pickleball', 'booking', reference] as const,
  pickleballAvailability: (courtId: string, date: string) =>
    ['pickleball', 'availability', courtId, date] as const,
  pickleballStats: ['pickleball', 'stats'] as const,
  activities: (type?: string) => ['activities', type ?? 'all'] as const,
  activityBookings: (type?: string) => ['activity-bookings', type ?? 'all'] as const,
  activityBooking: (reference: string) => ['activity-booking', reference] as const,
}
