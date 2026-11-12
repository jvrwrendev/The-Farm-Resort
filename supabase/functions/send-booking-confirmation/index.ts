// Supabase Edge Function: send-booking-confirmation
// Sends a branded confirmation email after admin approval.
// Nodemailer over SMTP (port 465 recommended; ports 25/587 are blocked by Supabase).

import { createClient } from 'npm:@supabase/supabase-js@^2.49.0'
import nodemailer from 'npm:nodemailer@^7.0.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SMTP_HOST = Deno.env.get('SMTP_HOST')!
const SMTP_PORT = Number(Deno.env.get('SMTP_PORT') ?? '465')
const SMTP_SECURE = (Deno.env.get('SMTP_SECURE') ?? 'true') === 'true'
const SMTP_USER = Deno.env.get('SMTP_USER')!
const SMTP_PASS = Deno.env.get('SMTP_PASS')!
const MAIL_FROM = Deno.env.get('MAIL_FROM') ?? 'The Farm Resort <no-reply@thefarmresort.com>'
const APP_URL = Deno.env.get('APP_URL') ?? ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const transport = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
})

type BookingType = 'accommodation' | 'pickleball' | 'billiards' | 'atv'

interface BookingData {
  reference: string
  customerName: string
  email: string
  itemName: string
  schedule: string
  guests: string
  total: number
  downPayment: number
  amountPaid: number
  remaining: number
  paymentStatus: string
  status: string
  instructions: string
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function formatMoney(n: number) {
  return `PHP ${Number(n ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatLongDate(s: string | null) {
  if (!s) return '—'
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

async function isAdmin(req: Request): Promise<boolean> {
  const auth = req.headers.get('Authorization')
  if (!auth) return false
  const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return false
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return data?.role === 'admin'
}

async function fetchBooking(type: BookingType, reference: string): Promise<BookingData | null> {
  const { data: settings } = await supabase.from('resort_settings').select('*').eq('id', 1).single()
  const contactEmail = settings?.email ?? ''
  const contactPhone = settings?.phone ?? ''
  const address = settings?.address ?? ''
  const checkInTime = settings?.check_in_time ?? ''
  const checkOutTime = settings?.check_out_time ?? ''
  const cancellation = settings?.cancellation_policy ?? ''
  const contactInfo = [contactEmail, contactPhone, address].filter(Boolean).join(' · ')

  // payment record
  const { data: pay } = await supabase
    .from('payment_records')
    .select('*')
    .eq('booking_type', type)
    .eq('booking_reference', reference)
    .maybeSingle()

  const total = Number(pay?.total_amount ?? 0)
  const downPayment = Number(pay?.down_payment_amount ?? 0)
  const amountPaid = Number(pay?.amount_paid ?? 0)
  const remaining = Number(pay?.remaining_balance ?? 0)
  const paymentStatus = pay?.status ?? 'pending_verification'

  if (type === 'accommodation') {
    const { data: b } = await supabase
      .from('bookings')
      .select('*, rooms(name)')
      .eq('booking_reference', reference)
      .single()
    if (!b) return null
    // prefer linked profile email when available
    let email = b.customer_email
    if (b.user_id) {
      const { data: prof } = await supabase.from('profiles').select('email').eq('id', b.user_id).single()
      if (prof?.email) email = prof.email
    }
    return {
      reference: b.booking_reference,
      customerName: b.customer_name,
      email,
      itemName: (b as { rooms?: { name?: string } }).rooms?.name ?? 'Accommodation',
      schedule: `${formatLongDate(b.check_in)} (${b.check_in_period}) → ${formatLongDate(b.check_out)} (${b.check_out_period})`,
      guests: `${b.adults} adult(s), ${b.children} child(ren) (${b.guests} total)`,
      total,
      downPayment,
      amountPaid,
      remaining,
      paymentStatus,
      status: b.status,
      instructions: `Check-in time: ${checkInTime}. Check-out time: ${checkOutTime}. Remaining balance of ${formatMoney(remaining)} is due on arrival. ${cancellation} Contact: ${contactInfo}`.trim(),
    }
  }

  if (type === 'pickleball') {
    const { data: b } = await supabase
      .from('pickleball_bookings')
      .select('*, pickleball_courts(name)')
      .eq('reference', reference)
      .single()
    if (!b) return null
    return {
      reference: b.reference,
      customerName: b.customer_name,
      email: b.email,
      itemName: (b as { pickleball_courts?: { name?: string } }).pickleball_courts?.name ?? 'Pickleball court',
      schedule: `${formatLongDate(b.booking_date)} · ${b.start_time} – ${b.end_time} (${b.duration_hours} hr)`,
      guests: `${b.players} player(s)`,
      total,
      downPayment,
      amountPaid,
      remaining,
      paymentStatus,
      status: b.status,
      instructions: `Please arrive 15 minutes before your slot. ${cancellation} Contact: ${contactInfo}`.trim(),
    }
  }

  // billiards / atv
  const { data: b } = await supabase
    .from('activity_bookings')
    .select('*, activities(name, type), activity_units(name)')
    .eq('reference', reference)
    .single()
  if (!b) return null
  const act = (b as { activities?: { name?: string; type?: string } }).activities
  if (!act || (type === 'billiards' && act.type !== 'billiards') || (type === 'atv' && act.type !== 'atv')) return null
  const unitName = (b as { activity_units?: { name?: string } }).activity_units?.name
  return {
    reference: b.reference,
    customerName: b.customer_name,
    email: b.email,
    itemName: `${act.name}${unitName ? ` — ${unitName}` : ''}`,
    schedule: `${formatLongDate(b.booking_date)} · ${b.start_time} – ${b.end_time} (${b.duration_hours} hr)`,
    guests: `${b.players} player(s)${b.quantity > 1 ? `, qty ${b.quantity}` : ''}`,
    total,
    downPayment,
    amountPaid,
    remaining,
    paymentStatus,
    status: b.status,
    instructions: `Please arrive 15 minutes before your slot. ${cancellation}`.trim(),
  }
}

function buildHtml(d: BookingData): string {
  const brand = '#1F4D3A'
  const cream = '#F5F1E8'
  const gold = '#C8A45C'
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Booking Confirmed</title>
<style>
@media only screen and (max-width:600px){.wrap{width:100%!important}.pad{padding:16px!important}}
body{margin:0;padding:0;background:${cream};font-family:Arial,Helvetica,sans-serif;color:#1a1a1a}
.container{width:100%;background:${cream};padding:24px 0}
.card{max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.08)}
.header{background:${brand};color:#fff;padding:24px;text-align:center}
.header h1{margin:0;font-size:22px;letter-spacing:.5px}
.sub{margin:6px 0 0;font-size:13px;opacity:.9}
.body{padding:24px}
.h2{font-size:16px;color:${brand};margin:16px 0 8px;font-weight:700}
.table{width:100%;border-collapse:collapse}
.table td{padding:8px 0;border-bottom:1px solid #eee;font-size:14px;vertical-align:top}
.label{color:#666;width:40%}
.value{font-weight:600;text-align:right}
.badge{display:inline-block;background:${gold};color:#fff;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700}
.totalrow td{border-bottom:none;font-size:15px}
.footer{background:${cream};padding:16px;text-align:center;font-size:12px;color:#555}
.btn{display:inline-block;background:${brand};color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:700;margin-top:12px}
</style></head>
<body><div class="container"><div class="card">
<div class="header"><h1>The Farm Resort</h1><p class="sub">Booking Confirmation</p></div>
<div class="body">
<p>Hi ${escapeHtml(d.customerName)},</p>
<p>Great news — your booking has been <span class="badge">Confirmed</span>. Here are your details:</p>
<table class="table">
<tr><td class="label">Booking reference</td><td class="value">${escapeHtml(d.reference)}</td></tr>
<tr><td class="label">Category / item</td><td class="value">${escapeHtml(d.itemName)}</td></tr>
<tr><td class="label">Schedule</td><td class="value">${escapeHtml(d.schedule)}</td></tr>
<tr><td class="label">Guests / participants</td><td class="value">${escapeHtml(d.guests)}</td></tr>
<tr><td class="label">Booking status</td><td class="value">${escapeHtml(d.status)}</td></tr>
<tr><td class="label">Payment status</td><td class="value">${escapeHtml(d.paymentStatus)}</td></tr>
</table>
<h2 class="h2">Payment summary</h2>
<table class="table">
<tr><td class="label">Total amount</td><td class="value">${formatMoney(d.total)}</td></tr>
<tr><td class="label">50% down payment</td><td class="value">${formatMoney(d.downPayment)}</td></tr>
<tr><td class="label">Amount paid</td><td class="value">${formatMoney(d.amountPaid)}</td></tr>
<tr class="totalrow"><td class="label"><strong>Remaining balance</strong></td><td class="value"><strong>${formatMoney(d.remaining)}</strong></td></tr>
</table>
<h2 class="h2">Instructions</h2>
<p style="font-size:14px;line-height:1.5">${escapeHtml(d.instructions)}</p>
<p style="font-size:14px;line-height:1.5">Present your booking reference at the front desk upon arrival. For questions, contact us.</p>
${APP_URL ? `<a class="btn" href="${APP_URL}">View booking</a>` : ''}
</div>
<div class="footer">
<p>${escapeHtml('The Farm Resort')} · ${escapeHtml(contactLine())}</p>
<p style="margin-top:8px">This is an automated message. Please do not reply to this email.</p>
</div>
</div></div></body></html>`
}

function escapeHtml(s: string) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function contactLine() {
  return 'Thank you for choosing us.'
}

function buildText(d: BookingData): string {
  return `The Farm Resort - Booking Confirmed

Hi ${d.customerName},

Your booking has been confirmed.

Booking reference: ${d.reference}
Category / item: ${d.itemName}
Schedule: ${d.schedule}
Guests / participants: ${d.guests}
Booking status: ${d.status}
Payment status: ${d.paymentStatus}

Payment summary
Total amount: ${formatMoney(d.total)}
50% down payment: ${formatMoney(d.downPayment)}
Amount paid: ${formatMoney(d.amountPaid)}
Remaining balance: ${formatMoney(d.remaining)}

Instructions: ${d.instructions}

Present your booking reference at the front desk upon arrival.
`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    if (!(await isAdmin(req))) return json({ error: 'NOT_AUTHORIZED' }, 401)

    const body = await req.json().catch(() => ({}))
    const type = body?.bookingType as BookingType
    const reference = String(body?.reference ?? '').trim()
    if (!type || !['accommodation', 'pickleball', 'billiards', 'atv'].includes(type) || !reference) {
      return json({ error: 'INVALID_INPUT' }, 400)
    }

    // Fetch booking first to resolve recipient + validate existence.
    const data = await fetchBooking(type, reference)
    if (!data || !data.email) return json({ error: 'BOOKING_NOT_FOUND' }, 404)

    // Atomic claim for idempotency.
    let logId: string | null = null
    let claimed = false
    const { data: inserted, error: insErr } = await supabase
      .from('booking_email_logs')
      .insert({ booking_type: type, booking_reference: reference, email_type: 'confirmation', recipient: data.email, status: 'sending', attempts: 1 })
      .select('id')
      .single()

    if (insErr) {
      // conflict -> check existing
      const { data: existing } = await supabase
        .from('booking_email_logs')
        .select('*')
        .eq('booking_type', type)
        .eq('booking_reference', reference)
        .eq('email_type', 'confirmation')
        .single()
      if (existing?.status === 'sent') {
        return json({ status: 'already_sent', messageId: existing.message_id, sentAt: existing.sent_at })
      }
      // allow retry if failed or stale sending (>2 min)
      const stale = existing?.status === 'sending' && new Date(existing.updated_at).getTime() < Date.now() - 2 * 60 * 1000
      if (existing && (existing.status === 'failed' || existing.status === 'pending' || stale)) {
        const { data: upd } = await supabase
          .from('booking_email_logs')
          .update({ status: 'sending', recipient: data.email, attempts: (existing.attempts ?? 0) + 1, last_error: null })
          .eq('id', existing.id)
          .select('id')
          .single()
        logId = upd?.id ?? existing.id
        claimed = true
      } else {
        return json({ status: 'in_progress' }, 409)
      }
    } else {
      logId = inserted.id
      claimed = true
    }

    if (!claimed || !logId) return json({ status: 'in_progress' }, 409)

    // Send
    try {
      const info = await new Promise<unknown>((resolve, reject) => {
        transport.sendMail(
          {
            from: MAIL_FROM,
            to: data.email,
            subject: `Booking Confirmed — ${data.reference} | The Farm Resort`,
            text: buildText(data),
            html: buildHtml(data),
          },
          (err: unknown, info: unknown) => (err ? reject(err) : resolve(info)),
        )
      })
      const infoObj = (info ?? {}) as { messageId?: string }
      await supabase
        .from('booking_email_logs')
        .update({ status: 'sent', message_id: infoObj.messageId ?? null, sent_at: new Date().toISOString(), last_error: null })
        .eq('id', logId)
      return json({ status: 'sent', messageId: info?.messageId ?? null })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await supabase
        .from('booking_email_logs')
        .update({ status: 'failed', last_error: msg })
        .eq('id', logId)
      // create admin notification
      await supabase.from('notifications').insert({
        title: 'Email delivery failed',
        message: `Confirmation email for ${reference} (${type}) failed: ${msg}`,
        type: 'error',
        booking_type: type,
        booking_reference: reference,
      })
      return json({ status: 'failed', error: msg }, 502)
    }
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})