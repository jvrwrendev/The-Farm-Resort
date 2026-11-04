import { supabase } from '@/lib/supabase'
import { mapPostgrestError } from '@/lib/errors'
import { mapResortSettings } from '@/lib/mappers'
import type { AppSettings, ResortSettingsRow } from '@/types'

export async function getSettings(): Promise<AppSettings | null> {
  const { data, error } = await supabase
    .from('resort_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle()
  if (error) throw new Error(mapPostgrestError(error))
  if (!data) return null
  return mapResortSettings(data as ResortSettingsRow)
}

export async function updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (updates.resortName !== undefined) patch.resort_name = updates.resortName
  if (updates.email !== undefined) patch.email = updates.email
  if (updates.phone !== undefined) patch.phone = updates.phone
  if (updates.address !== undefined) patch.address = updates.address
  if (updates.description !== undefined) patch.description = updates.description
  if (updates.checkInTime !== undefined) patch.check_in_time = updates.checkInTime
  if (updates.checkOutTime !== undefined) patch.check_out_time = updates.checkOutTime
  if (updates.cancellationPolicy !== undefined) patch.cancellation_policy = updates.cancellationPolicy
  if (updates.bookingPolicy !== undefined) patch.booking_policy = updates.bookingPolicy
  if (updates.maxGuests !== undefined) patch.max_guests = updates.maxGuests

  const { data, error } = await supabase
    .from('resort_settings')
    .update(patch)
    .eq('id', 1)
    .select('*')
    .maybeSingle()

  if (error) throw new Error(mapPostgrestError(error))
  if (!data) throw new Error('Settings could not be updated.')
  return mapResortSettings(data as ResortSettingsRow)
}
