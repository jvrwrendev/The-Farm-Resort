import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  Users,
} from 'lucide-react'
import { PublicLayout } from '@/components/layout/Navbar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getActivityBookingByReference } from '@/services/activity.service'
import type { ActivityBookingStatus } from './types'
import { formatBookingDate, formatTimeLabel } from './utils'
import { queryKeys } from '@/lib/queryKeys'
import { formatCurrency } from '@/lib/utils'

const STATUS_VARIANTS: Record<
  ActivityBookingStatus,
  'warning' | 'success' | 'secondary' | 'destructive'
> = {
  pending: 'warning',
  confirmed: 'success',
  completed: 'secondary',
  cancelled: 'destructive',
}

const STATUS_LABELS: Record<ActivityBookingStatus, string> = {
  pending: 'Pending confirmation',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export default function ActivityConfirmationPage() {
  const { reference = '' } = useParams<{ reference: string }>()

  const { data: booking, isLoading } = useQuery({
    queryKey: queryKeys.activityBooking(reference),
    queryFn: () => getActivityBookingByReference(reference),
    enabled: Boolean(reference),
  })

  return (
    <PublicLayout>
      <div className="mx-auto max-w-4xl px-4 pb-20 pt-28 sm:px-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </Button>

        {isLoading ? (
          <div className="mt-10 space-y-4">
            <Skeleton className="mx-auto h-16 w-16 rounded-full" />
            <Skeleton className="mx-auto h-9 w-72" />
            <Skeleton className="mt-8 h-80 w-full rounded-2xl" />
          </div>
        ) : !booking ? (
          <Card className="mt-8 text-center">
            <CardContent className="py-14">
              <h1 className="font-display text-2xl font-bold">Booking not found</h1>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                We couldn’t find a booking with the reference “{reference}”.
              </p>
              <Button asChild className="mt-6">
                <Link to="/">Back to home</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mt-4 text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CheckCircle2 className="h-9 w-9" />
              </span>
              <h1 className="font-display mt-5 text-3xl font-bold sm:text-4xl">
                Your booking is in!
              </h1>
              <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
                We’ve received your {booking.activityName} request. Our team will confirm it shortly.
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

            <Card className="mt-8 overflow-hidden">
              <CardHeader className="border-b bg-muted/30">
                <CardTitle className="font-display text-xl">Booking summary</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {booking.activityName} · {formatBookingDate(booking.bookingDate)}
                </p>
              </CardHeader>
              <CardContent className="space-y-5 pt-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <CalendarDays className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Date</p>
                      <p className="text-sm font-medium">{formatBookingDate(booking.bookingDate)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Time</p>
                      <p className="text-sm font-medium">
                        {formatTimeLabel(booking.startTime)} – {formatTimeLabel(booking.endTime)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        {booking.activityType === 'atv' ? 'ATV' : 'Table'}
                      </p>
                      <p className="text-sm font-medium">
                        {booking.unitName && booking.unitName !== '—'
                          ? booking.unitName
                          : `${booking.quantity} ${booking.activityType === 'atv' ? 'ATV' : 'table'}${booking.quantity === 1 ? '' : 's'}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        Participants
                      </p>
                      <p className="text-sm font-medium">{booking.players}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        Duration
                      </p>
                      <p className="text-sm font-medium">
                        {booking.durationHours} hour{booking.durationHours === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Email</p>
                      <p className="text-sm font-medium">{booking.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        Contact
                      </p>
                      <p className="text-sm font-medium">{booking.contactNumber}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl bg-primary/5 px-4 py-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Estimated total</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatCurrency(booking.hourlyRate)} × {booking.durationHours} hour
                      {booking.durationHours === 1 ? '' : 's'}
                      {booking.unitId ? ` · ${booking.unitName}` : ` × ${booking.quantity}`}
                    </p>
                  </div>
                  <p className="font-display text-3xl font-bold text-primary">
                    {formatCurrency(booking.totalAmount)}
                  </p>
                </div>

                <p className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-4 text-sm text-muted-foreground">
                  Our team will contact you at {booking.contactNumber} or {booking.email} to confirm.
                  No payment has been taken online — please settle at the front desk.
                </p>
              </CardContent>
            </Card>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button asChild>
                <Link to={`/${booking.activityType}/book`}>Book another session</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/">Back to home</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </PublicLayout>
  )
}
