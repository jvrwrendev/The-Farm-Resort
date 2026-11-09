import { supabase } from '@/lib/supabase'
import { mapPostgrestError } from '@/lib/errors'
import type {
  Activity,
  ActivityBooking,
  ActivityBookingInput,
  ActivityBookingStatus,
  ActivityInput,
  ActivityType,
} from '@/features/activities/types'

const IMAGE_BUCKET = 'activity-images'

interface ActivityRow {
  id: string
  type: ActivityType
  name: string
  description: string | null
  image_url: string | null
  hourly_rate: number
  weekday_rate: number
  weekend_rate: number
  max_players: number
  is_available: boolean
  is_active: boolean
  open_time: string
  close_time: string
  created_at: string
  updated_at: string
}

interface ActivityBookingRow {
  id: string
  reference: string
  customer_name: string
  email: string
  contact_number: string
  activity_id: string
  booking_date: string
  start_time: string
  end_time: string
  duration_hours: number
  players: number
  total_amount: number
  status: ActivityBookingStatus
  notes: string | null
  created_at: string
  updated_at: string
  activity: ActivityRow | ActivityRow[] | null
}

function rowToActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    description: row.description ?? '',
    imageUrl: row.image_url ?? '',
    hourlyRate: Number(row.hourly_rate),
    weekdayRate: Number(row.weekday_rate),
    weekendRate: Number(row.weekend_rate),
    maxPlayers: row.max_players,
    isAvailable: row.is_available,
    isActive: row.is_active,
    openTime: row.open_time,
    closeTime: row.close_time,
  }
}

function rowToBooking(row: ActivityBookingRow): ActivityBooking {
  const activity = Array.isArray(row.activity) ? row.activity[0] : row.activity
  const activityRate = activity ? Number(activity.weekday_rate) : 0
  const duration = Number(row.duration_hours) || 1
  return {
    id: row.id,
    reference: row.reference,
    customerName: row.customer_name,
    email: row.email,
    contactNumber: row.contact_number,
    activityId: row.activity_id,
    activityType: activity?.type ?? 'billiards',
    activityName: activity?.name ?? 'Activity',
    bookingDate: row.booking_date,
    startTime: row.start_time,
    endTime: row.end_time,
    durationHours: duration,
    players: row.players,
    hourlyRate: duration > 0 ? Number(row.total_amount) / duration : activityRate,
    totalAmount: Number(row.total_amount),
    status: row.status,
    notes: row.notes ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listActivities(type?: ActivityType): Promise<Activity[]> {
  let query = supabase.from('activities').select('*').eq('is_active', true)
  if (type) query = query.eq('type', type)
  const { data, error } = await query.order('type', { ascending: true })
  if (error) throw new Error(mapPostgrestError(error))
  return (data ?? []).map((r) => rowToActivity(r as ActivityRow))
}

export async function listAllActivities(): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .order('type', { ascending: true })
  if (error) throw new Error(mapPostgrestError(error))
  return (data ?? []).map((r) => rowToActivity(r as ActivityRow))
}

export async function getActivity(id: string): Promise<Activity | null> {
  const { data, error } = await supabase.from('activities').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(mapPostgrestError(error))
  return data ? rowToActivity(data as ActivityRow) : null
}

export async function createActivity(input: ActivityInput): Promise<Activity> {
  const { data, error } = await supabase
    .from('activities')
    .insert({
      type: input.type,
      name: input.name,
      description: input.description ?? null,
      image_url: input.imageUrl || null,
      hourly_rate: input.hourlyRate,
      weekday_rate: input.weekdayRate,
      weekend_rate: input.weekendRate,
      max_players: input.maxPlayers,
      is_available: input.isAvailable,
      is_active: input.isActive,
      open_time: input.openTime,
      close_time: input.closeTime,
    })
    .select('*')
    .single()
  if (error) throw new Error(mapPostgrestError(error))
  return rowToActivity(data as ActivityRow)
}

export async function updateActivity(
  id: string,
  input: Partial<ActivityInput>,
): Promise<Activity> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.type !== undefined) patch.type = input.type
  if (input.name !== undefined) patch.name = input.name
  if (input.description !== undefined) patch.description = input.description
  if (input.imageUrl !== undefined) patch.image_url = input.imageUrl || null
  if (input.hourlyRate !== undefined) patch.hourly_rate = input.hourlyRate
  if (input.weekdayRate !== undefined) patch.weekday_rate = input.weekdayRate
  if (input.weekendRate !== undefined) patch.weekend_rate = input.weekendRate
  if (input.maxPlayers !== undefined) patch.max_players = input.maxPlayers
  if (input.isAvailable !== undefined) patch.is_available = input.isAvailable
  if (input.isActive !== undefined) patch.is_active = input.isActive
  if (input.openTime !== undefined) patch.open_time = input.openTime
  if (input.closeTime !== undefined) patch.close_time = input.closeTime

  const { data, error } = await supabase
    .from('activities')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(mapPostgrestError(error))
  return rowToActivity(data as ActivityRow)
}

export async function deleteActivity(id: string): Promise<void> {
  const { error } = await supabase.from('activities').delete().eq('id', id)
  if (error) throw new Error(mapPostgrestError(error))
}

export async function uploadActivityImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, file, { upsert: false })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function listActivityBookings(type?: ActivityType): Promise<ActivityBooking[]> {
  let query = supabase
    .from('activity_bookings')
    .select('*, activity:activities(*)')
    .order('booking_date', { ascending: true })
    .order('start_time', { ascending: true })
  if (type) {
    const { data: activities, error: activityError } = await supabase
      .from('activities')
      .select('id')
      .eq('type', type)
    if (activityError) throw new Error(mapPostgrestError(activityError))
    const ids = (activities ?? []).map((a) => (a as { id: string }).id)
    if (ids.length === 0) return []
    query = query.in('activity_id', ids)
  }
  const { data, error } = await query
  if (error) throw new Error(mapPostgrestError(error))
  return (data ?? []).map((r) => rowToBooking(r as ActivityBookingRow))
}

export async function listBookingsForActivityDate(
  activityId: string,
  bookingDate: string,
): Promise<ActivityBooking[]> {
  const { data, error } = await supabase
    .from('activity_bookings')
    .select('*, activity:activities(*)')
    .eq('activity_id', activityId)
    .eq('booking_date', bookingDate)
    .in('status', ['pending', 'confirmed', 'completed'])
  if (error) throw new Error(mapPostgrestError(error))
  return (data ?? []).map((r) => rowToBooking(r as ActivityBookingRow))
}

export async function isActivityRangeAvailable(
  activityId: string,
  bookingDate: string,
  startTime: string,
  endTime: string,
): Promise<boolean> {
  const bookings = await listBookingsForActivityDate(activityId, bookingDate)
  return !bookings.some(
    (booking) => startTime < booking.endTime && endTime > booking.startTime,
  )
}

function generateReference(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return `ACT-${code}`
}

export async function createActivityBooking(
  input: ActivityBookingInput,
): Promise<ActivityBooking> {
  const activity = await getActivity(input.activityId)
  if (!activity) throw new Error('Please select a valid activity.')
  if (!activity.isActive || !activity.isAvailable) {
    throw new Error('This activity is not currently available for booking.')
  }
  if (input.endTime <= input.startTime) {
    throw new Error('End time must be after start time.')
  }
  if (input.startTime < activity.openTime || input.endTime > activity.closeTime) {
    throw new Error(
      `Bookings are available from ${activity.openTime} to ${activity.closeTime}.`,
    )
  }
  if (input.players < 1 || input.players > activity.maxPlayers) {
    throw new Error(`This activity hosts up to ${activity.maxPlayers} participants.`)
  }

  const available = await isActivityRangeAvailable(
    input.activityId,
    input.bookingDate,
    input.startTime,
    input.endTime,
  )
  if (!available) {
    throw new Error('That time slot is no longer available. Please choose another time.')
  }

  const date = new Date(`${input.bookingDate}T00:00:00`)
  const isWeekend = date.getDay() === 0 || date.getDay() === 6
  const rate = isWeekend ? activity.weekendRate : activity.weekdayRate
  const total = rate * input.durationHours
  const reference = generateReference()

  const { data, error } = await supabase
    .from('activity_bookings')
    .insert({
      reference,
      customer_name: input.customerName.trim(),
      email: input.email.trim(),
      contact_number: input.contactNumber.trim(),
      activity_id: input.activityId,
      booking_date: input.bookingDate,
      start_time: input.startTime,
      end_time: input.endTime,
      duration_hours: input.durationHours,
      players: input.players,
      total_amount: total,
      status: 'pending',
      notes: input.notes?.trim() || null,
    })
    .select('*, activity:activities(*)')
    .single()
  if (error) throw new Error(mapPostgrestError(error))
  return rowToBooking(data as ActivityBookingRow)
}

export async function getActivityBookingByReference(
  reference: string,
): Promise<ActivityBooking | null> {
  const { data, error } = await supabase
    .from('activity_bookings')
    .select('*, activity:activities(*)')
    .eq('reference', reference)
    .maybeSingle()
  if (error) throw new Error(mapPostgrestError(error))
  return data ? rowToBooking(data as ActivityBookingRow) : null
}

export async function updateActivityBookingStatus(
  id: string,
  status: ActivityBookingStatus,
): Promise<ActivityBooking> {
  const { data, error } = await supabase
    .from('activity_bookings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, activity:activities(*)')
    .single()
  if (error) throw new Error(mapPostgrestError(error))
  return rowToBooking(data as ActivityBookingRow)
}
