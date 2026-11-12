import { supabase } from '@/lib/supabase'
import { mapPostgrestError } from '@/lib/errors'

export type EmailLogStatus = 'pending' | 'sending' | 'sent' | 'failed'

export interface EmailLog {
  id: string
  bookingType: 'accommodation' | 'pickleball' | 'billiards' | 'atv'
  bookingReference: string
  emailType: string
  recipient: string
  status: EmailLogStatus
  attempts: number
  messageId: string | null
  lastError: string | null
  sentAt: string | null
  createdAt: string
  updatedAt: string
}

interface LogRow {
  id: string
  booking_type: string
  booking_reference: string
  email_type: string
  recipient: string
  status: EmailLogStatus
  attempts: number
  message_id: string | null
  last_error: string | null
  sent_at: string | null
  created_at: string
  updated_at: string
}

function rowToLog(r: LogRow): EmailLog {
  return {
    id: r.id,
    bookingType: r.booking_type as EmailLog['bookingType'],
    bookingReference: r.booking_reference,
    emailType: r.email_type,
    recipient: r.recipient,
    status: r.status,
    attempts: r.attempts,
    messageId: r.message_id,
    lastError: r.last_error,
    sentAt: r.sent_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export async function sendBookingConfirmation(
  bookingType: 'accommodation' | 'pickleball' | 'billiards' | 'atv',
  reference: string,
): Promise<{ status: string; messageId?: string | null; error?: string }> {
  const { data, error } = await supabase.functions.invoke('send-booking-confirmation', {
    body: { bookingType, reference },
  })
  if (error) throw new Error(error.message ?? 'Failed to invoke email function.')
  return data as { status: string; messageId?: string | null; error?: string }
}

export async function getEmailLog(
  bookingType: 'accommodation' | 'pickleball' | 'billiards' | 'atv',
  reference: string,
): Promise<EmailLog | null> {
  const { data, error } = await supabase
    .from('booking_email_logs')
    .select('*')
    .eq('booking_type', bookingType)
    .eq('booking_reference', reference)
    .eq('email_type', 'confirmation')
    .maybeSingle()
  if (error) throw new Error(mapPostgrestError(error))
  return data ? rowToLog(data as LogRow) : null
}