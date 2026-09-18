import { createSeedAccommodation, createSeedAdminAccount, createSeedBookings, createSeedSettings } from './seed'
import { MOCK_DB_KEY } from '@/lib/constants'
import type { Accommodation, AdminBooking, AdminCredentials, AppSettings } from '@/types'

export interface MockDatabase {
  accommodation: Accommodation
  bookings: AdminBooking[]
  settings: AppSettings
  adminAccount: AdminCredentials
}

function freshDatabase(): MockDatabase {
  return {
    accommodation: createSeedAccommodation(),
    bookings: createSeedBookings(),
    settings: createSeedSettings(),
    adminAccount: createSeedAdminAccount(),
  }
}

function loadDatabase(): MockDatabase {
  if (typeof window === 'undefined') return freshDatabase()
  try {
    const raw = window.localStorage.getItem(MOCK_DB_KEY)
    if (!raw) return freshDatabase()
    const parsed = JSON.parse(raw) as Partial<MockDatabase>
    if (!parsed.accommodation || !Array.isArray(parsed.bookings) || !parsed.settings) {
      return freshDatabase()
    }
    return {
      ...parsed,
      adminAccount: parsed.adminAccount ?? createSeedAdminAccount(),
    } as MockDatabase
  } catch {
    return freshDatabase()
  }
}

export const db: MockDatabase = loadDatabase()

export function persistDatabase(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(MOCK_DB_KEY, JSON.stringify(db))
  } catch {
    // Ignore storage quota / privacy-mode errors — mock state stays in memory.
  }
}

export function resetMockData(): void {
  const fresh = freshDatabase()
  db.accommodation = fresh.accommodation
  db.bookings = fresh.bookings
  db.settings = fresh.settings
  persistDatabase()
}
