import { supabase } from '@/lib/supabase'
import { mapPostgrestError } from '@/lib/errors'
import type {
  Activity,
  ActivityBooking,
  ActivityBookingInput,
  ActivityBookingStatus,
  ActivityInput,
  ActivityType,
  ActivityUnit,
  ActivityUnitInput,
  ActivityUnitStatus,
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
  inventory_count: number
  max_players: number
  is_available: boolean
  is_active: boolean
  open_time: string
  close_time: string
  created_at: string
  updated_at: string
}

interface ActivityUnitRow {
  id: string
  activity_type: ActivityType
  name: string
  identifier: string | null
  description: string | null
  image_url: string | null
  hourly_rate: number
  weekday_rate: number
  weekend_rate: number
  max_players: number
  status: ActivityUnitStatus
  is_active: boolean
  sort_order: number
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
  unit_id: string | null
  booking_date: string
  start_time: string
  end_time: string
  duration_hours: number
  quantity: number
  players: number
  hourly_rate: number
  total_amount: number
  status: ActivityBookingStatus
  notes: string | null
  created_at: string
  updated_at: string
  activity: ActivityRow | ActivityRow[] | null
  unit: ActivityUnitRow | ActivityUnitRow[] | null
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
    inventoryCount: row.inventory_count,
    maxPlayers: row.max_players,
    isAvailable: row.is_available,
    isActive: row.is_active,
    openTime: row.open_time,
    closeTime: row.close_time,
  }
}

function rowToUnit(row: ActivityUnitRow): ActivityUnit {
  return {
    id: row.id,
    activityType: row.activity_type,
    name: row.name,
    identifier: row.identifier ?? '',
    description: row.description ?? '',
    imageUrl: row.image_url ?? '',
    hourlyRate: Number(row.hourly_rate),
    weekdayRate: Number(row.weekday_rate),
    weekendRate: Number(row.weekend_rate),
    maxPlayers: row.max_players,
    status: row.status,
    isActive: row.is_active,
    sortOrder: row.sort_order ?? 0,
  }
}

function rowToBooking(row: ActivityBookingRow): ActivityBooking {
  const activity = Array.isArray(row.activity) ? row.activity[0] : row.activity
  const unit = Array.isArray(row.unit) ? row.unit[0] : row.unit
  const activityRate = activity ? Number(activity.weekday_rate) : 0
  const duration = Number(row.duration_hours) || 1
  const quantity = Number(row.quantity) || 1
  return {
    id: row.id,
    reference: row.reference,
    customerName: row.customer_name,
    email: row.email,
    contactNumber: row.contact_number,
    activityId: row.activity_id,
    activityType: activity?.type ?? 'billiards',
    activityName: activity?.name ?? 'Activity',
    unitId: row.unit_id ?? null,
    unitName: unit?.name ?? (quantity > 1 ? `${quantity} units` : '—'),
    bookingDate: row.booking_date,
    startTime: row.start_time,
    endTime: row.end_time,
    durationHours: duration,
    quantity,
    players: row.players,
    hourlyRate:
      Number(row.hourly_rate) ||
      (duration > 0 && quantity > 0
        ? Number(row.total_amount) / duration / quantity
        : activityRate),
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
      inventory_count: input.inventoryCount,
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
  if (input.inventoryCount !== undefined) patch.inventory_count = input.inventoryCount
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

// ---- Units / tables ----

export async function listActivityUnits(
  type: ActivityType,
  options: { includeInactive?: boolean } = {},
): Promise<ActivityUnit[]> {
  let query = supabase
    .from('activity_units')
    .select('*')
    .eq('activity_type', type)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  if (!options.includeInactive) {
    query = query.eq('is_active', true)
  }
  const { data, error } = await query
  if (error) throw new Error(mapPostgrestError(error))
  return (data ?? []).map((r) => rowToUnit(r as ActivityUnitRow))
}

export async function createActivityUnit(input: ActivityUnitInput): Promise<ActivityUnit> {
  const { data, error } = await supabase
    .from('activity_units')
    .insert({
      activity_type: input.activityType,
      name: input.name.trim(),
      identifier: input.identifier?.trim() || null,
      description: input.description?.trim() || null,
      image_url: input.imageUrl || null,
      hourly_rate: input.hourlyRate,
      weekday_rate: input.weekdayRate,
      weekend_rate: input.weekendRate,
      max_players: input.maxPlayers,
      status: input.status,
      is_active: input.isActive,
      sort_order: input.sortOrder ?? 0,
    })
    .select('*')
    .single()
  if (error) throw new Error(mapPostgrestError(error))
  return rowToUnit(data as ActivityUnitRow)
}

export async function updateActivityUnit(
  id: string,
  input: Partial<ActivityUnitInput>,
): Promise<ActivityUnit> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.activityType !== undefined) patch.activity_type = input.activityType
  if (input.name !== undefined) patch.name = input.name.trim()
  if (input.identifier !== undefined) patch.identifier = input.identifier?.trim() || null
  if (input.description !== undefined) patch.description = input.description?.trim() || null
  if (input.imageUrl !== undefined) patch.image_url = input.imageUrl || null
  if (input.hourlyRate !== undefined) patch.hourly_rate = input.hourlyRate
  if (input.weekdayRate !== undefined) patch.weekday_rate = input.weekdayRate
  if (input.weekendRate !== undefined) patch.weekend_rate = input.weekendRate
  if (input.maxPlayers !== undefined) patch.max_players = input.maxPlayers
  if (input.status !== undefined) patch.status = input.status
  if (input.isActive !== undefined) patch.is_active = input.isActive
  if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder

  const { data, error } = await supabase
    .from('activity_units')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(mapPostgrestError(error))
  return rowToUnit(data as ActivityUnitRow)
}

export async function deleteActivityUnit(id: string): Promise<void> {
  const { error } = await supabase.from('activity_units').delete().eq('id', id)
  if (error) throw new Error(mapPostgrestError(error))
}

export async function listUnitBookingsForDate(
  unitId: string,
  bookingDate: string,
): Promise<ActivityBooking[]> {
  const { data, error } = await supabase
    .from('activity_bookings')
    .select('*, activity:activities(*), unit:activity_units(*)')
    .eq('unit_id', unitId)
    .eq('booking_date', bookingDate)
    .in('status', ['pending', 'confirmed', 'completed'])
  if (error) throw new Error(mapPostgrestError(error))
  return (data ?? []).map((r) => rowToBooking(r as ActivityBookingRow))
}

export async function isUnitRangeAvailable(
  unitId: string,
  bookingDate: string,
  startTime: string,
  endTime: string,
): Promise<boolean> {
  const bookings = await listUnitBookingsForDate(unitId, bookingDate)
  return !bookings.some(
    (booking) => startTime < booking.endTime && endTime > booking.startTime,
  )
}

// ---- Bookings ----

export async function listActivityBookings(type?: ActivityType): Promise<ActivityBooking[]> {
  let query = supabase
    .from('activity_bookings')
    .select('*, activity:activities(*), unit:activity_units(*)')
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
    .select('*, activity:activities(*), unit:activity_units(*)')
    .eq('activity_id', activityId)
    .eq('booking_date', bookingDate)
    .in('status', ['pending', 'confirmed', 'completed'])
  if (error) throw new Error(mapPostgrestError(error))
  return (data ?? []).map((r) => rowToBooking(r as ActivityBookingRow))
}

export function getPeakActivityInventory(
  bookings: ActivityBooking[],
  startTime: string,
  endTime: string,
): number {
  const overlapping = bookings.filter(
    (booking) => startTime < booking.endTime && endTime > booking.startTime,
  )
  const points = [
    startTime,
    ...overlapping
      .map((booking) => booking.startTime)
      .filter((time) => time > startTime && time < endTime),
  ]

  return points.reduce((peak, point) => {
    const occupied = overlapping
      .filter((booking) => booking.startTime <= point && booking.endTime > point)
      .reduce((total, booking) => total + booking.quantity, 0)
    return Math.max(peak, occupied)
  }, 0)
}

export async function getAvailableActivityInventory(
  activityId: string,
  bookingDate: string,
  startTime: string,
  endTime: string,
): Promise<number> {
  const [activity, bookings] = await Promise.all([
    getActivity(activityId),
    listBookingsForActivityDate(activityId, bookingDate),
  ])
  if (!activity) return 0
  return Math.max(
    0,
    activity.inventoryCount - getPeakActivityInventory(bookings, startTime, endTime),
  )
}

export async function isActivityRangeAvailable(
  activityId: string,
  bookingDate: string,
  startTime: string,
  endTime: string,
  quantity = 1,
): Promise<boolean> {
  const available = await getAvailableActivityInventory(
    activityId,
    bookingDate,
    startTime,
    endTime,
  )
  return available >= quantity
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

  if (input.unitId) {
    const available = await isUnitRangeAvailable(
      input.unitId,
      input.bookingDate,
      input.startTime,
      input.endTime,
    )
    if (!available) {
      throw new Error('That unit or table is already booked for the selected time.')
    }
  } else {
    if (input.quantity < 1 || input.quantity > activity.inventoryCount) {
      throw new Error(`You can reserve up to ${activity.inventoryCount} at a time.`)
    }
    const participantCapacity = activity.maxPlayers * input.quantity
    if (input.players < 1 || input.players > participantCapacity) {
      throw new Error(`The selected quantity hosts up to ${participantCapacity} participants.`)
    }
    const available = await isActivityRangeAvailable(
      input.activityId,
      input.bookingDate,
      input.startTime,
      input.endTime,
      input.quantity,
    )
    if (!available) {
      throw new Error('Not enough units are available for that time slot.')
    }
  }

  const { data, error } = await supabase.rpc('create_activity_booking', {
    p_activity_id: input.activityId,
    p_customer_name: input.customerName.trim(),
    p_email: input.email.trim(),
    p_contact_number: input.contactNumber.trim(),
    p_booking_date: input.bookingDate,
    p_start_time: input.startTime,
    p_end_time: input.endTime,
    p_duration_hours: input.durationHours,
    p_players: input.players,
    p_quantity: input.quantity || 1,
    p_notes: input.notes?.trim() || null,
    p_unit_id: input.unitId ?? null,
  })
  if (error) throw new Error(mapPostgrestError(error))

  const result = Array.isArray(data) ? data[0] : data
  const reference = (result as { reference?: string } | null)?.reference
  if (!reference) throw new Error('Unable to retrieve the new booking.')

  const booking = await getActivityBookingByReference(reference)
  if (!booking) throw new Error('Unable to retrieve the new booking.')
  return booking
}

export async function getActivityBookingByReference(
  reference: string,
): Promise<ActivityBooking | null> {
  const { data, error } = await supabase
    .from('activity_bookings')
    .select('*, activity:activities(*), unit:activity_units(*)')
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
    .select('*, activity:activities(*), unit:activity_units(*)')
    .single()
  if (error) throw new Error(mapPostgrestError(error))
  return rowToBooking(data as ActivityBookingRow)
}
