import { supabase } from '@/lib/supabase'
import { mapPostgrestError } from '@/lib/errors'
import { mapRoomToAccommodation } from '@/lib/mappers'
import type { Accommodation, RoomRow } from '@/types'

let cachedRoomId: string | null = null

export async function getAccommodation(): Promise<Accommodation | null> {
  // Cache the room id so callers don't need to plumb it everywhere.
  const id =
    cachedRoomId ??
    (await (async () => {
      const { data: first, error: firstErr } = await supabase
        .from('rooms')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (firstErr) throw new Error(mapPostgrestError(firstErr))
      const found = (first as { id: string } | null)?.id ?? null
      cachedRoomId = found
      return found
    })())

  if (!id) return null

  const { data, error } = await supabase.from('rooms').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(mapPostgrestError(error))
  if (!data) return null
  return mapRoomToAccommodation(data as RoomRow)
}

export async function getRoomId(): Promise<string | null> {
  if (cachedRoomId) return cachedRoomId
  const { data, error } = await supabase
    .from('rooms')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(mapPostgrestError(error))
  cachedRoomId = (data as { id: string } | null)?.id ?? null
  return cachedRoomId
}

export async function updateAccommodation(
  updates: Partial<Accommodation>,
): Promise<Accommodation> {
  const id = await getRoomId()
  if (!id) throw new Error('Accommodation not found.')

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (updates.name !== undefined) patch.name = updates.name
  if (updates.description !== undefined) patch.description = updates.description
  if (updates.pricePerNight !== undefined) patch.price_per_night = updates.pricePerNight
  if (updates.maxGuests !== undefined) patch.capacity = updates.maxGuests
  if (updates.status !== undefined) patch.status = updates.status
  if (updates.amenities !== undefined) patch.amenities = updates.amenities
  if (updates.images !== undefined) {
    patch.images = updates.images
    patch.image_url = updates.images[0] ?? null
  }

  const { data, error } = await supabase
    .from('rooms')
    .update(patch)
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) throw new Error(mapPostgrestError(error))
  if (!data) throw new Error('Accommodation could not be updated.')
  return mapRoomToAccommodation(data as RoomRow)
}
