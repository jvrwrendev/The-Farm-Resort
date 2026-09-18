import { db, persistDatabase } from '@/mock/db'
import { sleep } from '@/lib/utils'
import type { AppSettings } from '@/types'

export async function getSettings(): Promise<AppSettings> {
  await sleep(120)
  return { ...db.settings }
}

export async function updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
  await sleep(250)
  db.settings = {
    ...db.settings,
    ...updates,
    id: db.settings.id,
    updatedAt: new Date().toISOString(),
  }
  persistDatabase()
  return { ...db.settings }
}
