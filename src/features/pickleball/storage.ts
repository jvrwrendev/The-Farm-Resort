import { PICKLEBALL_STORAGE_KEY, buildSeedPickleballBookings } from './mockData'
import type { PickleballBooking } from './types'

let memoryFallback: PickleballBooking[] | null = null

function seedBookings(): PickleballBooking[] {
  const seed = buildSeedPickleballBookings()
  memoryFallback = seed
  return seed
}

export function readPickleballBookings(): PickleballBooking[] {
  try {
    if (typeof window === 'undefined') return memoryFallback ?? seedBookings()

    const raw = window.localStorage.getItem(PICKLEBALL_STORAGE_KEY)
    if (!raw) {
      const seed = memoryFallback ?? seedBookings()
      window.localStorage.setItem(PICKLEBALL_STORAGE_KEY, JSON.stringify(seed))
      return seed
    }

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error('Invalid pickleball booking data')

    memoryFallback = parsed as PickleballBooking[]
    return memoryFallback
  } catch {
    if (memoryFallback) return memoryFallback

    const seed = seedBookings()
    try {
      window.localStorage.setItem(PICKLEBALL_STORAGE_KEY, JSON.stringify(seed))
    } catch {
      // localStorage can be unavailable in restricted browsing modes.
    }
    return seed
  }
}

export function writePickleballBookings(bookings: PickleballBooking[]): void {
  memoryFallback = bookings

  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PICKLEBALL_STORAGE_KEY, JSON.stringify(bookings))
      window.dispatchEvent(new Event('pickleball:updated'))
    }
  } catch {
    // Fall back to the in-memory copy when persistence is unavailable.
  }
}
