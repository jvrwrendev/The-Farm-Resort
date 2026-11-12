import { supabase } from '@/lib/supabase'
import { mapPostgrestError } from '@/lib/errors'

export type NotificationType = 'info' | 'success' | 'warning' | 'error'

export interface Notification {
  id: string
  title: string
  message: string
  type: NotificationType
  bookingType: 'accommodation' | 'pickleball' | 'billiards' | 'atv' | null
  bookingReference: string | null
  isRead: boolean
  createdAt: string
}

interface NotificationRow {
  id: string
  title: string
  message: string
  type: NotificationType
  booking_type: 'accommodation' | 'pickleball' | 'billiards' | 'atv' | null
  booking_reference: string | null
  is_read: boolean
  created_at: string
}

function rowToNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    type: row.type,
    bookingType: row.booking_type,
    bookingReference: row.booking_reference,
    isRead: row.is_read,
    createdAt: row.created_at,
  }
}

export async function listNotifications(limit = 50): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(mapPostgrestError(error))
  return (data ?? []).map((r) => rowToNotification(r as NotificationRow))
}

export async function getUnreadCount(): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false)
  if (error) throw new Error(mapPostgrestError(error))
  return count ?? 0
}

export async function markAsRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
  if (error) throw new Error(mapPostgrestError(error))
}

export async function markAllAsRead(): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('is_read', false)
  if (error) throw new Error(mapPostgrestError(error))
}

export async function createNotification(input: {
  title: string
  message: string
  type?: NotificationType
  bookingType?: 'accommodation' | 'pickleball' | 'billiards' | 'atv'
  bookingReference?: string
}): Promise<void> {
  const { error } = await supabase.from('notifications').insert({
    title: input.title,
    message: input.message,
    type: input.type ?? 'info',
    booking_type: input.bookingType ?? null,
    booking_reference: input.bookingReference ?? null,
  })
  if (error) throw new Error(mapPostgrestError(error))
}