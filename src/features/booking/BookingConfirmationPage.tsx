import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import {
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  Users,
} from 'lucide-react'
import { PublicLayout } from '@/components/layout/Navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { getBookingByReference } from '@/services/booking.service'
import { queryKeys } from '@/lib/queryKeys'
import { formatCurrency } from '@/lib/utils'

function DetailRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  )
}

export default function BookingConfirmationPage() {
  const { reference = '' } = useParams()

  const { data: booking, isLoading } = useQuery({
    queryKey: queryKeys.bookingByReference(reference),
    queryFn: () => getBookingByReference(reference),
    enabled: !!reference,
  })

  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-4 pt-28 pb-20 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !booking ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <CalendarCheck2 className="h-10 w-10 text-muted-foreground" />
              <div>
                <h1 className="font-display text-2xl font-bold">Booking not found</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  We couldn't find a reservation with reference <span className="font-medium">{reference}</span>.
                </p>
              </div>
              <Button asChild>
                <Link to="/book">Make a new booking</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CheckCircle2 className="h-7 w-7" />
              </span>
              <h1 className="font-display mt-4 text-3xl font-bold">Reservation received</h1>
              <p className="mt-3 text-muted-foreground">
                Thank you, {booking.customerName.split(' ')[0]}. Your request has been submitted and is
                awaiting confirmation from our team.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Reference</span>
                <span className="font-display text-lg font-bold text-primary">{booking.bookingReference}</span>
              </div>
            </div>

            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="font-display text-lg">Booking details</CardTitle>
                <Badge variant={booking.status === 'pending' ? 'warning' : 'success'}>
                  {booking.status.replace('_', ' ')}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <DetailRow icon={CalendarDays} label="Check-in" value={`${format(parseISO(booking.checkIn), 'EEEE, MMM d, yyyy')}${booking.checkInPeriod ? ` · ${booking.checkInPeriod}` : ''}`} />
                  <DetailRow icon={CalendarDays} label="Check-out" value={`${format(parseISO(booking.checkOut), 'EEEE, MMM d, yyyy')}${booking.checkOutPeriod ? ` · ${booking.checkOutPeriod}` : ''}`} />
                  <DetailRow icon={Clock} label="Nights" value={`${booking.numberOfNights} night(s)`} />
                  <DetailRow icon={Users} label="Guests" value={`${booking.adults} adults, ${booking.children} children`} />
                  <DetailRow icon={Mail} label="Email" value={booking.email} />
                  <DetailRow icon={Phone} label="Contact" value={booking.contactNumber} />
                </div>

                {booking.specialRequests && (
                  <div className="rounded-lg border bg-muted/40 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Special requests</p>
                    <p className="mt-1 text-sm text-foreground">{booking.specialRequests}</p>
                  </div>
                )}

                <div className="rounded-xl border bg-secondary/40 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {formatCurrency(booking.pricePerNight)} × {booking.numberOfNights} night(s)
                    </span>
                    <span className="font-medium">{formatCurrency(booking.totalAmount)}</span>
                  </div>
                  <div className="mt-3 flex items-end justify-between border-t pt-3">
                    <span className="font-medium">Total amount</span>
                    <span className="font-display text-2xl font-bold text-primary">
                      {formatCurrency(booking.totalAmount)}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Please keep your booking reference. Our team will contact you shortly to confirm your
                  reservation. No payment has been taken online.
                </p>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild>
                <Link to="/">Back to home</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/book">Book another stay</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  )
}
