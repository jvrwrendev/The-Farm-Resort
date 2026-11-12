import { supabase } from '@/lib/supabase'
import { mapPostgrestError } from '@/lib/errors'

export type PaymentBookingType = 'accommodation' | 'pickleball' | 'billiards' | 'atv'
export type PaymentRecordStatus = 'pending_verification' | 'verified' | 'rejected' | 'paid'

export interface PaymentSettings {
  gcashAccountName: string
  gcashNumber: string
  gcashQrUrl: string
  instructions: string
}

export interface PaymentRecord {
  id: string
  bookingType: PaymentBookingType
  bookingReference: string
  originalAmount: number
  discountType: 'none' | 'fixed' | 'percent'
  discountValue: number
  totalAmount: number
  downPaymentAmount: number
  remainingBalance: number
  amountPaid: number
  receiptUrl: string
  status: PaymentRecordStatus
  rejectionReason: string
  verifiedAt: string | null
  createdAt: string
  updatedAt: string
}

interface SettingsRow {
  gcash_account_name: string | null
  gcash_number: string | null
  gcash_qr_url: string | null
  instructions: string | null
}

interface RecordRow {
  id: string
  booking_type: PaymentBookingType
  booking_reference: string
  original_amount: number | null
  discount_type: 'none' | 'fixed' | 'percent' | null
  discount_value: number | null
  total_amount: number
  down_payment_amount: number
  remaining_balance: number
  amount_paid: number | null
  receipt_url: string | null
  status: PaymentRecordStatus
  rejection_reason: string | null
  verified_at: string | null
  created_at: string
  updated_at: string
}

function rowToSettings(row: SettingsRow | null): PaymentSettings {
  return {
    gcashAccountName: row?.gcash_account_name ?? '',
    gcashNumber: row?.gcash_number ?? '',
    gcashQrUrl: row?.gcash_qr_url ?? '',
    instructions:
      row?.instructions ??
      'Scan the QR code and pay 50% of your total booking amount via GCash, then upload a screenshot of your receipt.',
  }
}

function rowToRecord(row: RecordRow): PaymentRecord {
  return {
    id: row.id,
    bookingType: row.booking_type,
    bookingReference: row.booking_reference,
    originalAmount: Number(row.original_amount ?? row.total_amount),
    discountType: row.discount_type ?? 'none',
    discountValue: Number(row.discount_value ?? 0),
    totalAmount: Number(row.total_amount),
    downPaymentAmount: Number(row.down_payment_amount),
    remainingBalance: Number(row.remaining_balance),
    amountPaid: Number(row.amount_paid ?? 0),
    receiptUrl: row.receipt_url ?? '',
    status: row.status,
    rejectionReason: row.rejection_reason ?? '',
    verifiedAt: row.verified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getPaymentSettings(): Promise<PaymentSettings> {
  const { data, error } = await supabase.rpc('get_payment_settings')
  if (error) throw new Error(mapPostgrestError(error))
  return rowToSettings(data as SettingsRow | null)
}

export async function updatePaymentSettings(input: {
  gcashAccountName: string
  gcashNumber: string
  gcashQrUrl: string
  instructions: string
}): Promise<PaymentSettings> {
  const { data, error } = await supabase
    .from('payment_settings')
    .update({
      gcash_account_name: input.gcashAccountName,
      gcash_number: input.gcashNumber,
      gcash_qr_url: input.gcashQrUrl || null,
      instructions: input.instructions,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)
    .select('*')
    .single()
  if (error) throw new Error(mapPostgrestError(error))
  return rowToSettings(data as SettingsRow)
}

export async function uploadPaymentQr(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'png'
  const path = `qr-${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from('payment-settings')
    .upload(path, file, { upsert: false })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from('payment-settings').getPublicUrl(path)
  return data.publicUrl
}

export async function uploadPaymentReceipt(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from('payment-receipts')
    .upload(path, file, { upsert: false })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from('payment-receipts').getPublicUrl(path)
  return data.publicUrl
}

export async function submitPayment(input: {
  bookingType: PaymentBookingType
  bookingReference: string
  totalAmount: number
  receiptUrl: string
}): Promise<PaymentRecord> {
  const { data, error } = await supabase.rpc('submit_payment', {
    p_booking_type: input.bookingType,
    p_reference: input.bookingReference,
    p_total_amount: input.totalAmount,
    p_receipt_url: input.receiptUrl,
  })
  if (error) throw new Error(mapPostgrestError(error))
  return rowToRecord(data as RecordRow)
}

export async function getPaymentForBooking(
  bookingType: PaymentBookingType,
  reference: string,
): Promise<PaymentRecord | null> {
  const { data, error } = await supabase.rpc('get_payment_for_booking', {
    p_booking_type: bookingType,
    p_reference: reference,
  })
  if (error) throw new Error(mapPostgrestError(error))
  // A SQL function returning a composite type yields a row of NULLs when no
  // record matches, so treat a missing id as "no payment record".
  if (!data || !(data as RecordRow).id) return null
  return rowToRecord(data as RecordRow)
}

export async function listPaymentRecords(
  status?: PaymentRecordStatus | 'all',
): Promise<PaymentRecord[]> {
  const { data, error } = await supabase.rpc('list_payment_records', {
    p_status: status && status !== 'all' ? status : null,
  })
  if (error) throw new Error(mapPostgrestError(error))
  return ((data ?? []) as RecordRow[]).map(rowToRecord)
}

export async function verifyPayment(
  recordId: string,
  approve: boolean,
  reason?: string,
): Promise<PaymentRecord> {
  const { data, error } = await supabase.rpc('verify_payment', {
    p_record_id: recordId,
    p_approve: approve,
    p_reason: reason ?? null,
  })
  if (error) throw new Error(mapPostgrestError(error))
  return rowToRecord(data as RecordRow)
}

export async function applyDiscount(input: {
  bookingType: PaymentBookingType
  bookingReference: string
  discountType: 'none' | 'fixed' | 'percent'
  discountValue: number
}): Promise<PaymentRecord> {
  const { data, error } = await supabase.rpc('apply_discount', {
    p_booking_type: input.bookingType,
    p_reference: input.bookingReference,
    p_discount_type: input.discountType,
    p_discount_value: input.discountValue,
  })
  if (error) throw new Error(mapPostgrestError(error))
  return rowToRecord(data as RecordRow)
}

export async function completePayment(recordId: string): Promise<PaymentRecord> {
  const { data, error } = await supabase.rpc('complete_payment', {
    p_record_id: recordId,
  })
  if (error) throw new Error(mapPostgrestError(error))
  return rowToRecord(data as RecordRow)
}

export function calculateDownPayment(totalAmount: number): {
  downPayment: number
  remaining: number
} {
  const downPayment = Math.round(totalAmount * 0.5 * 100) / 100
  return { downPayment, remaining: Math.round((totalAmount - downPayment) * 100) / 100 }
}
