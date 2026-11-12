import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowLeft,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Download,
  Images,
  Mail,
  MapPin,
  Phone,
  Printer,
  Users,
} from 'lucide-react'
import { PublicLayout } from '@/components/layout/Navbar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { downloadPickleballSummaryPdf } from './export'
import { getPickleballBookingByReference } from '@/services/pickleballBooking.service'
import { getPaymentForBooking } from '@/services/payment.service'
import { PaymentCheckout } from '@/features/payment/PaymentCheckout'
import type { PickleballBookingStatus } from './types'
import { usePickleballCourts } from './usePickleballCourts'
import { formatBookingDate, formatTimeLabel } from './utils'
import { queryKeys } from '@/lib/queryKeys'
import { formatCurrency } from '@/lib/utils'

const STATUS_VARIANTS: Record<
  PickleballBookingStatus,
  'warning' | 'success' | 'secondary' | 'destructive'
> = {
  pending: 'warning',
  confirmed: 'success',
  completed: 'secondary',
  cancelled: 'destructive',
}

const STATUS_LABELS: Record<PickleballBookingStatus, string> = {
  pending: 'Pending confirmation',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  )
}

export default function PickleballConfirmationPage() {
  const { reference = '' } = useParams<{ reference: string }>()
  const [downloading, setDownloading] = useState(false)
  const courts = usePickleballCourts()
  const queryClient = useQueryClient()

  const { data: booking, isLoading } = useQuery({
    queryKey: queryKeys.pickleballBooking(reference),
    queryFn: () => getPickleballBookingByReference(reference),
    enabled: Boolean(reference),
  })

  const { data: payment } = useQuery({
    queryKey: ['payment', 'pickleball', reference],
    queryFn: () => getPaymentForBooking('pickleball', reference),
    enabled: Boolean(reference),
  })

  const court = booking ? courts.find((item) => item.id === booking.courtId) : undefined

  const handleDownload = async () => {
    if (!booking || !court) return
    setDownloading(true)
    try {
      await downloadPickleballSummaryPdf(booking, court)
      toast.success('Reservation summary downloaded.')
    } catch {
      toast.error('Unable to download the summary. Please try printing instead.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <PublicLayout>
      <div className="mx-auto max-w-4xl px-4 pb-20 pt-28 sm:px-6 print:max-w-none print:px-0 print:pt-4 print:pb-0">
        <div className="print:hidden">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link to="/pickleball">
              <ArrowLeft className="h-4 w-4" />
              Back to pickleball
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="mt-8 space-y-4">
            <Skeleton className="mx-auto h-16 w-16 rounded-full" />
            <Skeleton className="mx-auto h-9 w-72" />
            <Skeleton className="mx-auto h-5 w-96 max-w-full" />
            <Skeleton className="mt-8 h-96 w-full rounded-2xl" />
          </div>
        ) : !booking ? (
          <Card className="mt-8 text-center">
            <CardContent className="py-14">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <CalendarDays className="h-7 w-7" />
              </span>
              <h1 className="font-display mt-5 text-2xl font-bold">Reservation not found</h1>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                We couldn’t find a pickleball reservation with the reference “{reference}”. It may
                have been removed from this browser’s saved reservations.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button asChild>
                  <Link to="/pickleball/book">Book a court</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/pickleball">Back to gallery</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mt-4 text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CheckCircle2 className="h-9 w-9" />
              </span>
              <h1 className="font-display mt-5 text-3xl font-bold sm:text-4xl">
                You’re on the court!
              </h1>
              <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
                Your pickleball reservation has been received. Our team will confirm it shortly.
                Keep this reference handy.
              </p>
              <div className="mt-5 inline-flex flex-wrap items-center justify-center gap-2 rounded-full border bg-muted/40 px-4 py-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Reference
                </span>
                <span className="font-mono text-sm font-bold tracking-wide text-foreground">
                  {booking.reference}
                </span>
                <Badge variant={STATUS_VARIANTS[booking.status]}>
                  {STATUS_LABELS[booking.status]}
                </Badge>
              </div>
            </div>

            <Card className="mt-8 overflow-hidden print:mt-6 print:border-0 print:shadow-none">
              <CardHeader className="border-b bg-muted/30 print:bg-transparent">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <CardTitle className="font-display text-xl">Reservation summary</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {court?.name ?? 'Pickleball court'} · {formatBookingDate(booking.bookingDate)}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANTS[booking.status]}>
                    {STATUS_LABELS[booking.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-7 pt-6">
                <section>
                  <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Court and schedule
                  </h2>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <DetailRow
                      icon={MapPin}
                      label="Court"
                      value={`${court?.name ?? 'Pickleball court'}${court?.isCovered ? ' (Covered)' : ''}`}
                    />
                    <DetailRow
                      icon={CalendarDays}
                      label="Date"
                      value={formatBookingDate(booking.bookingDate, 'EEEE, MMMM d, yyyy')}
                    />
                    <DetailRow
                      icon={Clock}
                      label="Time"
                      value={`${formatTimeLabel(booking.startTime)} – ${formatTimeLabel(booking.endTime)}`}
                    />
                    <DetailRow
                      icon={Users}
                      label="Players"
                      value={`${booking.players} player${booking.players === 1 ? '' : 's'}`}
                    />
                  </div>
                </section>

                <section className="border-t pt-6">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Contact details
                  </h2>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <DetailRow icon={Users} label="Guest name" value={booking.customerName} />
                    <DetailRow icon={Mail} label="Email" value={booking.email} />
                    <DetailRow icon={Phone} label="Contact number" value={booking.contactNumber} />
                    <DetailRow
                      icon={Clock}
                      label="Duration"
                      value={`${booking.durationHours} hour${booking.durationHours === 1 ? '' : 's'}`}
                    />
                  </div>
                </section>

                {booking.notes && (
                  <section className="border-t pt-6">
                    <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Additional notes
                    </h2>
                    <p className="mt-3 rounded-xl border bg-muted/30 px-4 py-3 text-sm text-foreground">
                      {booking.notes}
                    </p>
                  </section>
                )}

                <section className="border-t pt-6">
                  <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl bg-primary/5 px-4 py-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Estimated total</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatCurrency(booking.hourlyRate)} × {booking.durationHours} hour
                        {booking.durationHours === 1 ? '' : 's'}
                      </p>
                    </div>
                    <p className="font-display text-3xl font-bold text-primary">
                      {formatCurrency(booking.totalAmount)}
                    </p>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    A 50% GCash down payment is required to secure this reservation. Check your payment status below.
                  </p>
                </section>

                <section className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-4 text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground">What happens next?</p>
                  <p className="mt-1.5 leading-relaxed">
                    Our team will review this request and contact you at {booking.contactNumber} or{' '}
                    {booking.email}. Once confirmed, your slot is locked in. Please arrive 10–15
                    minutes before your start time.
                  </p>
                </section>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardContent className="space-y-4 pt-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">Payment</span>
                  <Badge
                    variant={
                      payment?.status === 'verified'
                        ? 'success'
                        : payment?.status === 'rejected'
                          ? 'destructive'
                          : 'warning'
                    }
                  >
                    {payment?.status === 'verified'
                      ? 'Partially paid (50% verified)'
                      : payment?.status === 'rejected'
                        ? 'Rejected — please resubmit'
                        : payment?.status === 'pending_verification'
                          ? 'Pending verification'
                          : 'Down payment required'}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="font-semibold">{formatCurrency(booking.totalAmount)}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">50% down payment</p>
                    <p className="font-semibold">{formatCurrency(booking.totalAmount * 0.5)}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Remaining balance</p>
                    <p className="font-semibold">{formatCurrency(booking.totalAmount * 0.5)}</p>
                  </div>
                </div>
                {payment?.status === 'verified' && (
                  <p className="text-sm text-muted-foreground">
                    Verified down payment: {formatCurrency(payment.downPaymentAmount)}. Remaining balance: {formatCurrency(payment.remainingBalance)}.
                  </p>
                )}
                {payment?.status === 'rejected' && payment.rejectionReason && (
                  <p className="text-sm text-destructive">Reason: {payment.rejectionReason}</p>
                )}
              </CardContent>
            </Card>

            {(!payment || payment.status !== 'verified') && (
              <div className="mt-6">
                <PaymentCheckout
                  bookingType="pickleball"
                  bookingReference={booking.reference}
                  totalAmount={booking.totalAmount}
                  onSubmitted={() => {
                    queryClient.invalidateQueries({ queryKey: ['payment', 'pickleball', reference] })
                    queryClient.invalidateQueries({ queryKey: queryKeys.pickleballBooking(reference) })
                  }}
                />
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 print:hidden">
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
                Print summary
              </Button>
              <Button variant="outline" onClick={handleDownload} loading={downloading}>
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
              <Button asChild>
                <Link to="/pickleball/book">
                  <CalendarPlus className="h-4 w-4" />
                  Book another court
                </Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/pickleball#pickleball-gallery">
                  <Images className="h-4 w-4" />
                  Back to gallery
                </Link>
              </Button>
            </div>

            <p className="mt-8 text-center text-xs text-muted-foreground print:mt-4">
              Need to change or cancel? Contact the resort and mention your reference{' '}
              <span className="font-mono font-semibold text-foreground">{booking.reference}</span>.
            </p>
          </>
        )}
      </div>
    </PublicLayout>
  )
}
