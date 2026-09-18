import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import {
  ArrowLeft,
  CalendarDays,
  CircleDollarSign,
  Clock,
  Mail,
  MessageSquare,
  Phone,
  User,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { BookingActions } from '@/features/admin/BookingActions'
import { StatusBadge } from '@/features/admin/components'
import { getBookingById } from '@/services/admin.service'
import { queryKeys } from '@/lib/queryKeys'
import { formatCurrency } from '@/lib/utils'
import type { ComponentType } from 'react'

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
}) {
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

export default function AdminBookingDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: booking, isLoading } = useQuery({
    queryKey: queryKeys.adminBooking(id ?? ''),
    queryFn: () => getBookingById(id as string),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-16 w-full max-w-xl" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-72 lg:col-span-2" />
          <Skeleton className="h-72" />
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <User className="h-6 w-6" />
          </span>
          <div>
            <p className="font-display text-lg font-semibold">Booking not found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              This reservation may have been removed or the link is incorrect.
            </p>
          </div>
          <Button asChild>
            <Link to="/admin/bookings">
              <ArrowLeft className="h-4 w-4" /> Back to bookings
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const totalGuests = booking.adults + booking.children

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/admin/bookings')} className="-ml-2">
        <ArrowLeft className="h-4 w-4" /> Back to bookings
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-2xl font-bold">{booking.bookingReference}</h2>
            <StatusBadge status={booking.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Submitted {format(parseISO(booking.createdAt), 'MMM d, yyyy · h:mm a')}
          </p>
        </div>
        <BookingActions booking={booking} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Guest details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <InfoRow icon={User} label="Full name" value={booking.customerName} />
              <InfoRow icon={Users} label="Party size" value={`${totalGuests} (${booking.adults} adults, ${booking.children} children)`} />
              <InfoRow icon={Mail} label="Email" value={booking.email} />
              <InfoRow icon={Phone} label="Contact number" value={booking.contactNumber} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Stay details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <InfoRow icon={CalendarDays} label="Check-in" value={format(parseISO(booking.checkIn), 'EEEE, MMM d, yyyy')} />
              <InfoRow icon={CalendarDays} label="Check-out" value={format(parseISO(booking.checkOut), 'EEEE, MMM d, yyyy')} />
              <InfoRow icon={Clock} label="Number of nights" value={`${booking.numberOfNights} night(s)`} />
              <InfoRow icon={Users} label="Accommodation" value="Exclusive Resort Accommodation" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Special requests</CardTitle>
            </CardHeader>
            <CardContent>
              {booking.specialRequests ? (
                <div className="flex items-start gap-3 rounded-xl border bg-muted/40 px-4 py-3">
                  <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-sm">{booking.specialRequests}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No special requests were provided.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <CircleDollarSign className="h-4 w-4 text-primary" /> Payment summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {formatCurrency(booking.pricePerNight)} × {booking.numberOfNights} night(s)
                </span>
                <span className="font-medium">{formatCurrency(booking.totalAmount)}</span>
              </div>
              <div className="flex items-end justify-between border-t pt-4">
                <span className="font-medium">Total amount</span>
                <span className="font-display text-2xl font-bold text-primary">
                  {formatCurrency(booking.totalAmount)}
                </span>
              </div>
              <p className="rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                No payment is processed online. The full amount is settled on arrival.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">Submitted</span>
                <span className="text-right font-medium">
                  {format(parseISO(booking.createdAt), 'MMM d, yyyy · h:mm a')}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">Last updated</span>
                <span className="text-right font-medium">
                  {format(parseISO(booking.updatedAt), 'MMM d, yyyy · h:mm a')}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Current status</span>
                <StatusBadge status={booking.status} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
