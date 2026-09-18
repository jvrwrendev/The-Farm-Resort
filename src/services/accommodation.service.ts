import { db, persistDatabase } from '@/mock/db'
import { sleep } from '@/lib/utils'
import type { Accommodation } from '@/types'

export async function getAccommodation(): Promise<Accommodation> {
  await sleep(120)
  return { ...db.accommodation }
}

export async function updateAccommodation(
  updates: Partial<Accommodation>,
): Promise<Accommodation> {
  await sleep(250)
  db.accommodation = {
    ...db.accommodation,
    ...updates,
    id: db.accommodation.id,
    updatedAt: new Date().toISOString(),
  }
  persistDatabase()
  return { ...db.accommodation }
}
