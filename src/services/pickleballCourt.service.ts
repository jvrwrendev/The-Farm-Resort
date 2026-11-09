import { supabase } from '@/lib/supabase'
import { mapPostgrestError } from '@/lib/errors'
import type { PickleballCourt } from '@/features/pickleball/types'

interface CourtRow {
  id: string
  name: string
  tagline: string | null
  description: string | null
  image_url: string | null
  hourly_rate: number
  weekday_rate: number
  weekend_rate: number
  max_players: number
  surface: string | null
  is_covered: boolean
  amenities: string[] | null
  is_available: boolean
  is_active: boolean
  open_time: string
  close_time: string
  created_at: string
  updated_at: string
}

function rowToCourt(row: CourtRow): PickleballCourt {
  return {
    id: row.id,
    name: row.name,
    tagline: row.tagline ?? '',
    description: row.description ?? '',
    imageUrl: row.image_url ?? '',
    hourlyRate: Number(row.hourly_rate),
    weekdayRate: Number(row.weekday_rate),
    weekendRate: Number(row.weekend_rate),
    maxPlayers: row.max_players,
    surface: row.surface ?? '',
    isCovered: row.is_covered,
    amenities: row.amenities ?? [],
    isAvailable: row.is_available,
    isActive: row.is_active,
    openTime: row.open_time,
    closeTime: row.close_time,
  }
}

export async function listPickleballCourts(): Promise<PickleballCourt[]> {
  const { data, error } = await supabase
    .from('pickleball_courts')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })
  if (error) throw new Error(mapPostgrestError(error))
  return (data ?? []).map((r) => rowToCourt(r as CourtRow))
}

export async function listAllPickleballCourts(): Promise<PickleballCourt[]> {
  const { data, error } = await supabase
    .from('pickleball_courts')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw new Error(mapPostgrestError(error))
  return (data ?? []).map((r) => rowToCourt(r as CourtRow))
}

export interface CourtInput {
  name: string
  tagline?: string
  description?: string
  imageUrl?: string
  hourlyRate: number
  weekdayRate: number
  weekendRate: number
  maxPlayers: number
  surface?: string
  isCovered: boolean
  amenities?: string[]
  isAvailable: boolean
  isActive: boolean
  openTime: string
  closeTime: string
}

export async function createPickleballCourt(input: CourtInput): Promise<PickleballCourt> {
  const { data, error } = await supabase
    .from('pickleball_courts')
    .insert({
      name: input.name,
      tagline: input.tagline ?? null,
      description: input.description ?? null,
      image_url: input.imageUrl ?? null,
      hourly_rate: input.hourlyRate,
      weekday_rate: input.weekdayRate,
      weekend_rate: input.weekendRate,
      max_players: input.maxPlayers,
      surface: input.surface ?? null,
      is_covered: input.isCovered,
      amenities: input.amenities ?? [],
      is_available: input.isAvailable,
      is_active: input.isActive,
      open_time: input.openTime,
      close_time: input.closeTime,
    })
    .select('*')
    .single()
  if (error) throw new Error(mapPostgrestError(error))
  return rowToCourt(data as CourtRow)
}

export async function updatePickleballCourt(id: string, input: Partial<CourtInput>): Promise<PickleballCourt> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.name !== undefined) patch.name = input.name
  if (input.tagline !== undefined) patch.tagline = input.tagline
  if (input.description !== undefined) patch.description = input.description
  if (input.imageUrl !== undefined) patch.image_url = input.imageUrl
  if (input.hourlyRate !== undefined) patch.hourly_rate = input.hourlyRate
  if (input.weekdayRate !== undefined) patch.weekday_rate = input.weekdayRate
  if (input.weekendRate !== undefined) patch.weekend_rate = input.weekendRate
  if (input.maxPlayers !== undefined) patch.max_players = input.maxPlayers
  if (input.surface !== undefined) patch.surface = input.surface
  if (input.isCovered !== undefined) patch.is_covered = input.isCovered
  if (input.amenities !== undefined) patch.amenities = input.amenities
  if (input.isAvailable !== undefined) patch.is_available = input.isAvailable
  if (input.isActive !== undefined) patch.is_active = input.isActive
  if (input.openTime !== undefined) patch.open_time = input.openTime
  if (input.closeTime !== undefined) patch.close_time = input.closeTime

  const { data, error } = await supabase
    .from('pickleball_courts')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(mapPostgrestError(error))
  return rowToCourt(data as CourtRow)
}

export async function deletePickleballCourt(id: string): Promise<void> {
  const { error } = await supabase.from('pickleball_courts').delete().eq('id', id)
  if (error) throw new Error(mapPostgrestError(error))
}

export async function togglePickleballCourtStatus(id: string, isActive: boolean): Promise<PickleballCourt> {
  return updatePickleballCourt(id, { isActive })
}
