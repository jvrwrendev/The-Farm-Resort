import type { PostgrestError, AuthError } from '@supabase/supabase-js'

/**
 * Friendly user-facing error strings.
 * The Supabase error object exposes many internal fields we don't want to
 * leak to end users (Postgres error codes, table names, SQL fragments, etc.).
 */

const FRIENDLY_RPC_MESSAGES: Record<string, string> = {
  ROOM_NOT_FOUND: 'The selected accommodation could not be found.',
  ROOM_UNAVAILABLE: 'This accommodation is currently unavailable for booking.',
  DATES_REQUIRED: 'Please select both a check-in and a check-out date.',
  INVALID_DATE_RANGE: 'Check-out must be after check-in.',
  PAST_CHECK_IN: 'Check-in date cannot be in the past.',
  ADULTS_REQUIRED: 'At least one adult is required.',
  INVALID_CHILDREN: 'Children count is invalid.',
  GUESTS_REQUIRED: 'Please specify the number of guests.',
  DATES_UNAVAILABLE: 'Those dates are already reserved. Please choose a different range.',
  BOOKING_REFERENCE_CONFLICT: 'We could not generate a unique booking reference. Please retry.',
  BOOKING_NOT_FOUND: 'Booking not found.',
  CANNOT_REOPEN_COMPLETED: 'Completed bookings cannot be reopened.',
  NOT_AUTHORIZED: 'You are not authorized to perform that action.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  ACTIVITY_NOT_FOUND: 'The selected activity could not be found.',
  ACTIVITY_UNAVAILABLE: 'This activity is not currently available for booking.',
  ACTIVITY_PAST_DATE: 'Please choose a future booking date.',
  ACTIVITY_INVALID_TIME: 'End time must be after start time.',
  ACTIVITY_OUTSIDE_HOURS: 'The selected time is outside operating hours.',
  ACTIVITY_INVALID_QUANTITY: 'Duration and quantity must be at least one.',
  ACTIVITY_INVENTORY_EXCEEDED: 'The requested quantity exceeds available inventory.',
  ACTIVITY_PARTICIPANT_CAPACITY:
    'The participant count exceeds capacity for the selected quantity.',
  ACTIVITY_INSUFFICIENT_INVENTORY:
    'Not enough units are available for that time slot. Please choose another time or quantity.',
  ACTIVITY_UNIT_NOT_FOUND: 'The selected unit or table could not be found.',
  ACTIVITY_UNIT_MISMATCH: 'The selected unit does not match this activity.',
  ACTIVITY_UNIT_UNAVAILABLE:
    'The selected unit or table is not available. Please choose another one.',
  ACTIVITY_UNIT_CONFLICT:
    'That unit or table is already booked for the selected time. Please choose another option.',
  PICKLEBALL_COURT_NOT_FOUND: 'The selected pickleball court could not be found.',
  PICKLEBALL_UNAVAILABLE: 'This court is currently unavailable for booking.',
  PICKLEBALL_PAST_DATE: 'Please choose a future booking date.',
  PICKLEBALL_INVALID_TIME: 'End time must be after start time.',
  PICKLEBALL_OUTSIDE_HOURS: 'The selected time is outside court operating hours.',
  PICKLEBALL_MAX_DURATION: 'A single court reservation can be up to 3 hours.',
  PICKLEBALL_CAPACITY: 'The player count exceeds this court’s capacity.',
  PICKLEBALL_SLOT_CONFLICT:
    'That court is already reserved for the selected time. Please choose another slot.',
  PICKLEBALL_WINDOW_EXCEEDED: 'Court bookings can be made up to 90 days ahead.',
  INVALID_BOOKING_TYPE: 'Invalid booking type for payment.',
  BOOKING_REFERENCE_REQUIRED: 'A booking reference is required.',
  RECEIPT_REQUIRED: 'Please upload a payment receipt.',
  PAYMENT_RECORD_NOT_FOUND: 'Payment record not found.',
}

export function mapSupabaseError(error: unknown): string {
  if (!error) return 'Something went wrong. Please try again.'
  if (error instanceof Error) {
    const raw = error.message ?? ''
    const mapped = mapRaw(raw)
    if (mapped) return mapped
    // Generic friendly strings for common cases.
    if (/network|fetch|failed to fetch/i.test(raw))
      return 'Network error. Please check your connection and try again.'
    if (raw.toLowerCase().includes('invalid login credentials'))
      return 'Invalid email or password.'
    return 'Something went wrong. Please try again.'
  }
  return 'Something went wrong. Please try again.'
}

function mapRaw(message: string): string | null {
  for (const [code, friendly] of Object.entries(FRIENDLY_RPC_MESSAGES)) {
    if (message.includes(code)) return friendly
  }
  return null
}

/** Used for PostgREST-shaped errors (table SELECT/INSERT exceptions). */
export function mapPostgrestError(err: PostgrestError | null | undefined): string {
  if (!err) return 'Something went wrong. Please try again.'
  if (err.code === 'PGRST116' || err.code === 'PGRST301') {
    return 'Service temporarily unavailable. Please retry.'
  }
  if (err.code === '23505') return 'This record already exists.'
  if (err.code === '23503') {
    const msg = err.message ?? ''
    if (/pickleball_bookings/i.test(msg)) {
      return 'This court has existing reservations and cannot be deleted. Deactivate it instead.'
    }
    if (/activity_bookings/i.test(msg)) {
      return 'This unit has existing reservations and cannot be deleted. Deactivate it instead.'
    }
    return 'This record is referenced by other data and cannot be deleted.'
  }
  if (err.code === '42501') return "You don't have permission to do that."
  return mapSupabaseError(new Error(err.message))
}

/** Used for Auth-shaped errors (sign-in, update). */
export function mapAuthError(err: AuthError | null | undefined): string {
  if (!err) return 'Something went wrong. Please try again.'
  const msg = (err.message ?? '').toLowerCase()
  if (msg.includes('invalid login') || msg.includes('invalid credentials'))
    return 'Invalid email or password.'
  if (msg.includes('email not confirmed'))
    return 'Please confirm your email before signing in.'
  if (msg.includes('user already registered'))
    return 'An account already exists for that email.'
  if (msg.includes('rate limit'))
    return 'Too many attempts. Please wait a moment and try again.'
  if (msg.includes('password'))
    return 'Password does not meet the strength requirements.'
  return 'Unable to complete authentication. Please try again.'
}
