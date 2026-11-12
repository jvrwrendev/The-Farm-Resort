import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, CalendarDays, Clock, Mail, Phone, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/features/admin/components'
import { PaymentDetailsCard } from '@/features/admin/PaymentDetailsCard'
import { getBookingByReference } from '@/services/booking.service'
import { updateBookingStatus } from '@/services/admin.service'
import { getPickleballBookingByReference, updatePickleballBookingStatus } from '@/services/pickleballBooking.service'
import { getActivityBookingByReference, updateActivityBookingStatus } from '@/services/activity.service'
import { approveBooking, completePayment, getPaymentForBooking, rejectBooking } from '@/services/payment.service'
import { sendBookingConfirmation, getEmailLog } from '@/services/email.service'
import type { PaymentRecord } from '@/services/payment.service'
import { queryKeys } from '@/lib/queryKeys'
import { formatCurrency } from '@/lib/utils'
import type { AdminBooking } from '@/types'
import { useState } from 'react'

type DetailType = 'resort' | 'pickleball' | 'atv' | 'billiards'

export default function AdminBookingDetailPage() {
  const { type = 'resort', reference = '' } = useParams<{ type: string; reference: string }>()
  const detailType = (['resort', 'pickleball', 'atv', 'billiards'].includes(type) ? type : 'resort') as DetailType
  const decodedRef = decodeURIComponent(reference)

  const resortQuery = useQuery({
    queryKey: queryKeys.bookingByReference(decodedRef),
    queryFn: () => getBookingByReference(decodedRef),
    enabled: detailType === 'resort' && !!decodedRef,
  })
  const pickleballQuery = useQuery({
    queryKey: queryKeys.pickleballBooking(decodedRef),
    queryFn: () => getPickleballBookingByReference(decodedRef),
    enabled: detailType === 'pickleball' && !!decodedRef,
  })
  const activityQuery = useQuery({
    queryKey: queryKeys.activityBooking(decodedRef),
    queryFn: () => getActivityBookingByReference(decodedRef),
    enabled: (detailType === 'atv' || detailType === 'billiards') && !!decodedRef,
  })

  const paymentType: 'accommodation' | 'pickleball' | 'atv' | 'billiards' =
    detailType === 'resort' ? 'accommodation' : detailType === 'pickleball' ? 'pickleball' : detailType === 'atv' ? 'atv' : 'billiards'
  const paymentQuery = useQuery({
    queryKey: ['payment', paymentType, decodedRef],
    queryFn: () => getPaymentForBooking(paymentType, decodedRef),
    enabled: !!decodedRef,
  })

  const isLoading =
    (detailType === 'resort' && resortQuery.isLoading) ||
    (detailType === 'pickleball' && pickleballQuery.isLoading) ||
    ((detailType === 'atv' || detailType === 'billiards') && activityQuery.isLoading)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  // Resort
  if (detailType === 'resort') {
    const b = resortQuery.data
    if (!b) return <NotFound />
    return (
      <div className="space-y-6">
        <BackButton />
        <Header title={b.bookingReference} status={b.status} subtitle={`Submitted ${format(parseISO(b.createdAt), 'MMM d, yyyy · h:mm a')}`} source={b.bookingSource} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader><CardTitle className="font-display text-lg">Guest details</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InfoRow icon={Users} label="Full name" value={b.customerName} />
                <InfoRow icon={Mail} label="Email" value={b.email} />
                <InfoRow icon={Phone} label="Contact" value={b.contactNumber} />
                <InfoRow icon={Users} label="Party size" value={`${b.adults + b.children} (${b.adults} adults, ${b.children} children)`} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="font-display text-lg">Stay details</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InfoRow icon={CalendarDays} label="Check-in" value={`${format(parseISO(b.checkIn), 'MMM d, yyyy')}${b.checkInPeriod ? ` · ${b.checkInPeriod}` : ''}`} />
                <InfoRow icon={CalendarDays} label="Check-out" value={`${format(parseISO(b.checkOut), 'MMM d, yyyy')}${b.checkOutPeriod ? ` · ${b.checkOutPeriod}` : ''}`} />
                <InfoRow icon={Clock} label="Nights" value={`${b.numberOfNights} night(s)`} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="font-display text-lg">Check-in / Check-out timestamps</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InfoRow icon={Clock} label="Checked in at" value={b.checkInAt ? format(parseISO(b.checkInAt), 'MMMM d, yyyy h:mm a') : '—'} />
                <InfoRow icon={Clock} label="Checked out at" value={b.checkOutAt ? format(parseISO(b.checkOutAt), 'MMMM d, yyyy h:mm a') : '—'} />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <BookingStatusActions detailType="resort" reference={b.bookingReference} bookingId={b.id} status={b.status} onChanged={() => resortQuery.refetch()} />
            <PaymentDetailsCard
              bookingType="accommodation"
              reference={b.bookingReference}
              totalAmount={b.totalAmount}
              fallbackStatus={b.paymentStatus}
              lineItem={{ label: `${formatCurrency(b.pricePerNight)} × ${b.numberOfNights} night(s)`, amount: b.totalAmount }}
            />
            <CompletePaymentButton payment={paymentQuery.data ?? null} bookingStatus={b.status} onChanged={() => paymentQuery.refetch()} />
            <EmailConfirmationCard bookingType="accommodation" reference={b.bookingReference} />
          </div>
        </div>
      </div>
    )
  }

  // Pickleball
  if (detailType === 'pickleball') {
    const b = pickleballQuery.data
    if (!b) return <NotFound />
    return (
      <div className="space-y-6">
        <BackButton />
        <Header title={b.reference} status={b.status} subtitle={`Submitted ${format(parseISO(b.createdAt), 'MMM d, yyyy · h:mm a')}`} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader><CardTitle className="font-display text-lg">Guest details</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InfoRow icon={Users} label="Full name" value={b.customerName} />
                <InfoRow icon={Mail} label="Email" value={b.email} />
                <InfoRow icon={Phone} label="Contact" value={b.contactNumber} />
                <InfoRow icon={Users} label="Players" value={`${b.players}`} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="font-display text-lg">Court & schedule</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InfoRow icon={CalendarDays} label="Date" value={b.bookingDate} />
                <InfoRow icon={Clock} label="Time" value={`${b.startTime} – ${b.endTime}`} />
                <InfoRow icon={Clock} label="Duration" value={`${b.durationHours} hour(s)`} />
                <InfoRow icon={CalendarDays} label="Hourly rate" value={formatCurrency(b.hourlyRate)} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="font-display text-lg">Check-in / Check-out timestamps</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InfoRow icon={Clock} label="Checked in at" value={b.checkInAt ? format(parseISO(b.checkInAt), 'MMMM d, yyyy h:mm a') : '—'} />
                <InfoRow icon={Clock} label="Checked out at" value={b.checkOutAt ? format(parseISO(b.checkOutAt), 'MMMM d, yyyy h:mm a') : '—'} />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <BookingStatusActions detailType="pickleball" reference={b.reference} bookingId={b.id} status={b.status} onChanged={() => pickleballQuery.refetch()} />
            <PaymentDetailsCard
              bookingType="pickleball"
              reference={b.reference}
              totalAmount={b.totalAmount}
              fallbackStatus={b.paymentStatus}
              lineItem={{ label: `${formatCurrency(b.hourlyRate)} × ${b.durationHours} hour(s)`, amount: b.totalAmount }}
            />
            <CompletePaymentButton payment={paymentQuery.data ?? null} bookingStatus={b.status} onChanged={() => paymentQuery.refetch()} />
            <EmailConfirmationCard bookingType="pickleball" reference={b.reference} />
          </div>
        </div>
      </div>
    )
  }

  // ATV / Billiards
  const b = activityQuery.data
  if (!b) return <NotFound />
  return (
    <div className="space-y-6">
      <BackButton />
      <Header title={b.reference} status={b.status} subtitle={`Submitted ${format(parseISO(b.createdAt), 'MMM d, yyyy · h:mm a')}`} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle className="font-display text-lg">Guest details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoRow icon={Users} label="Full name" value={b.customerName} />
              <InfoRow icon={Mail} label="Email" value={b.email} />
              <InfoRow icon={Phone} label="Contact" value={b.contactNumber} />
              <InfoRow icon={Users} label="Players" value={`${b.players}`} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="font-display text-lg">Booking details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoRow icon={CalendarDays} label="Activity" value={b.activityName} />
              <InfoRow icon={CalendarDays} label="Unit" value={b.unitName} />
              <InfoRow icon={CalendarDays} label="Date" value={b.bookingDate} />
              <InfoRow icon={Clock} label="Time" value={`${b.startTime} – ${b.endTime}`} />
              <InfoRow icon={Clock} label="Duration" value={`${b.durationHours} hour(s)`} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="font-display text-lg">Check-in / Check-out timestamps</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoRow icon={Clock} label="Checked in at" value={b.checkInAt ? format(parseISO(b.checkInAt), 'MMMM d, yyyy h:mm a') : '—'} />
              <InfoRow icon={Clock} label="Checked out at" value={b.checkOutAt ? format(parseISO(b.checkOutAt), 'MMMM d, yyyy h:mm a') : '—'} />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <BookingStatusActions detailType={b.activityType === 'atv' ? 'atv' : 'billiards'} reference={b.reference} bookingId={b.id} status={b.status} onChanged={() => activityQuery.refetch()} />
          <PaymentDetailsCard
            bookingType={b.activityType}
            reference={b.reference}
            totalAmount={b.totalAmount}
            fallbackStatus={b.paymentStatus}
            lineItem={{ label: `${formatCurrency(b.hourlyRate)} × ${b.durationHours} hour(s)`, amount: b.totalAmount }}
          />
          <CompletePaymentButton payment={paymentQuery.data ?? null} bookingStatus={b.status} onChanged={() => paymentQuery.refetch()} />
          <EmailConfirmationCard bookingType={b.activityType} reference={b.reference} />
        </div>
      </div>
    </div>
  )
}

function EmailConfirmationCard({ bookingType, reference }: { bookingType: 'accommodation' | 'pickleball' | 'billiards' | 'atv'; reference: string }) {
  const queryClient = useQueryClient()
  const { data: log, isLoading } = useQuery({
    queryKey: ['email-log', bookingType, reference],
    queryFn: () => getEmailLog(bookingType, reference),
  })
  const [busy, setBusy] = useState(false)
  const resend = async () => {
    setBusy(true)
    try {
      const res = await sendBookingConfirmation(bookingType, reference)
      if (res?.status === 'sent') toast.success('Confirmation email sent.')
      else if (res?.status === 'already_sent') toast.info('Confirmation email already sent.')
      else toast.warning('Email could not be sent. Check logs.')
      queryClient.invalidateQueries({ queryKey: ['email-log', bookingType, reference] })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send email.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Card>
      <CardHeader><CardTitle className="font-display text-lg">Confirmation email</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : log ? (
          <>
            <InfoRow icon={Mail} label="Recipient" value={log.recipient} />
            <InfoRow icon={Clock} label="Status" value={log.status} />
            <InfoRow icon={Clock} label="Attempts" value={`${log.attempts}`} />
            {log.sentAt && <InfoRow icon={Clock} label="Sent at" value={format(parseISO(log.sentAt), 'MMMM d, yyyy h:mm a')} />}
            {log.lastError && <p className="text-xs text-destructive break-words">{log.lastError}</p>}
          </>
        ) : (
          <p className="text-muted-foreground">No confirmation email sent yet.</p>
        )}
        <Button type="button" size="sm" variant="outline" onClick={resend} disabled={busy || log?.status === 'sent'} loading={busy}>
          {log?.status === 'sent' ? 'Sent' : 'Send / retry'}
        </Button>
      </CardContent>
    </Card>
  )
}

function BackButton() {
  return (
    <Button variant="ghost" size="sm" asChild className="-ml-2">
      <Link to="/admin/bookings"><ArrowLeft className="h-4 w-4" /> Back to bookings</Link>
    </Button>
  )
}

function Header({ title, status, subtitle, source }: { title: string; status: string; subtitle: string; source?: 'online' | 'manual' }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-2xl font-bold">{title}</h2>
          <StatusBadge status={status as AdminBooking['status']} />
          {source && (
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${source === 'manual' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-muted text-muted-foreground'}`}>
              {source === 'manual' ? 'Manual' : 'Online'}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-0.5 break-words font-medium">{value}</p>
      </div>
    </div>
  )
}

function BookingStatusActions({
  detailType,
  reference,
  bookingId,
  status,
  onChanged,
}: {
  detailType: 'resort' | 'pickleball' | 'atv' | 'billiards'
  reference: string
  bookingId: string
  status: string
  onChanged: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const paymentType = detailType === 'resort' ? 'accommodation' : detailType

  const run = async (newStatus: string) => {
    setBusy(true)
    try {
      if (newStatus === 'confirmed' && status === 'pending') {
        await approveBooking(paymentType as 'accommodation' | 'pickleball' | 'atv' | 'billiards', reference)
        try {
          const res = await sendBookingConfirmation(paymentType as 'accommodation' | 'pickleball' | 'atv' | 'billiards', reference)
          if (res?.status === 'failed') toast.warning('Approved, but confirmation email failed to send.')
        } catch {
          toast.warning('Approved, but confirmation email could not be sent.')
        }
      } else if (newStatus === 'cancelled' && status === 'pending') {
        await rejectBooking(paymentType as 'accommodation' | 'pickleball' | 'atv' | 'billiards', reference, rejectReason)
        setRejectOpen(false)
        setRejectReason('')
      } else if (detailType === 'resort') {
        await updateBookingStatus(bookingId, newStatus as AdminBooking['status'])
      } else if (detailType === 'pickleball') {
        await updatePickleballBookingStatus(reference, newStatus as 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'rejected')
      } else {
        await updateActivityBookingStatus(bookingId, newStatus as 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'rejected')
      }
      toast.success('Booking status updated.')
      onChanged()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update status.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">Booking actions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {status === 'pending' && (
          <>
            <Button type="button" onClick={() => run('confirmed')} disabled={busy}>Approve</Button>
            <Button type="button" variant="outline" onClick={() => setRejectOpen(true)} disabled={busy}>Reject</Button>
          </>
        )}
        {status === 'confirmed' && (
          <>
            <Button type="button" onClick={() => run('checked_in')} disabled={busy}>
              {detailType === 'atv' || detailType === 'billiards' ? 'Rent In' : 'Check-in'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setRejectOpen(true)} disabled={busy}>Cancel</Button>
          </>
        )}
        {status === 'checked_in' && (
          <Button type="button" onClick={() => run('completed')} disabled={busy}>
            {detailType === 'atv' || detailType === 'billiards' ? 'Rent Out' : 'Check-out'}
          </Button>
        )}
        {(status === 'completed' || status === 'cancelled' || status === 'rejected') && (
          <p className="text-sm text-muted-foreground">No further status actions available.</p>
        )}

        {rejectOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-xl">
              <h3 className="font-display text-lg font-semibold">Reject booking</h3>
              <p className="mt-2 text-sm text-muted-foreground">Provide a reason (optional). The customer will be notified.</p>
              <div className="mt-3">
                <textarea
                  className="w-full rounded-md border bg-background p-2 text-sm"
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Reason for rejection…"
                />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setRejectOpen(false); setRejectReason('') }} disabled={busy}>Cancel</Button>
                <Button variant="destructive" onClick={() => run('cancelled')} disabled={busy}>Confirm reject</Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function NotFound() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="font-display text-lg font-semibold">Booking not found</p>
        <Button asChild><Link to="/admin/bookings"><ArrowLeft className="h-4 w-4" /> Back to bookings</Link></Button>
      </CardContent>
    </Card>
  )
}

function CompletePaymentButton({
  payment,
  bookingStatus,
  onChanged,
}: {
  payment: PaymentRecord | null
  bookingStatus: string
  onChanged?: () => void
}) {
  const [completing, setCompleting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const balance = payment?.remainingBalance ?? 0
  const canComplete = bookingStatus === 'completed' && balance > 0 && payment?.status !== 'paid' && !!payment

  const handleComplete = async () => {
    if (!payment) return
    setCompleting(true)
    try {
      await completePayment(payment.id)
      toast.success('Payment completed. Balance set to ₱0.00.')
      setConfirmOpen(false)
      onChanged?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to complete payment.')
    } finally {
      setCompleting(false)
    }
  }

  if (!canComplete) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">Payment completion</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Outstanding balance: <span className="font-semibold text-foreground">{formatCurrency(balance)}</span>. Complete payment to mark as paid.
        </p>
        <Button type="button" onClick={() => setConfirmOpen(true)}>
          Complete payment
        </Button>

        {confirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-xl">
              <h3 className="font-display text-lg font-semibold">Confirm payment completion</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                This will mark the remaining balance of {formatCurrency(balance)} as paid and set the booking to Paid. Continue?
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={completing}>
                  Cancel
                </Button>
                <Button onClick={handleComplete} loading={completing}>
                  Confirm
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}