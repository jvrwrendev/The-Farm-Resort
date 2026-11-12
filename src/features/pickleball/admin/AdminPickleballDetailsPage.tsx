import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Tag,
  Trophy,
  User,
  Users,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/features/admin/components'
import { PaymentDetailsCard } from '@/features/admin/PaymentDetailsCard'
import { queryKeys } from '@/lib/queryKeys'
import { formatCurrency } from '@/lib/utils'
import { getPickleballBookingByReference } from '@/services/pickleballBooking.service'
import { usePickleballCourts } from '../usePickleballCourts'
import { formatBookingDate, formatTimeLabel } from '../utils'
import { PickleballBookingActions } from './PickleballBookingActions'

interface PickleballDetailsLocationState {
  from?: string
}

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

export default function AdminPickleballDetailsPage() {
  const { reference } = useParams<{ reference: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as PickleballDetailsLocationState | null
  const backTo =
    locationState?.from?.startsWith('/admin') ? locationState.from : '/admin/pickleball'
  const backLabel = backTo.startsWith('/admin/calendar')
    ? 'Back to calendar'
    : 'Back to pickleball bookings'

  const courts = usePickleballCourts(true)

  const { data: booking, isLoading } = useQuery({
    queryKey: queryKeys.pickleballBooking(reference ?? ''),
    queryFn: () => getPickleballBookingByReference(reference ?? ''),
    enabled: !!reference,
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-52" />
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
            <Trophy className="h-6 w-6" />
          </span>
          <div>
            <p className="font-display text-lg font-semibold">Pickleball booking not found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              This reservation may have been removed or the link is incorrect.
            </p>
          </div>
          <Button asChild>
            <Link to={backTo}>
              <ArrowLeft className="h-4 w-4" /> {backLabel}
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const court = courts.find((item) => item.id === booking.courtId)
  const courtName = court?.name ?? 'Pickleball court'
  const courtType = court?.isCovered ? 'Covered court' : 'Outdoor court'

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(backTo)} className="-ml-2">
        <ArrowLeft className="h-4 w-4" /> {backLabel}
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-2xl font-bold">{booking.reference}</h2>
            <StatusBadge status={booking.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Submitted {format(parseISO(booking.createdAt), 'MMM d, yyyy · h:mm a')}
          </p>
        </div>
        <PickleballBookingActions booking={booking} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Guest details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <InfoRow icon={User} label="Full name" value={booking.customerName} />
              <InfoRow
                icon={Users}
                label="Players"
                value={`${booking.players} player${booking.players === 1 ? '' : 's'}`}
              />
              <InfoRow icon={Mail} label="Email" value={booking.email} />
              <InfoRow icon={Phone} label="Contact number" value={booking.contactNumber} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Court and schedule</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <InfoRow icon={MapPin} label="Court" value={`${courtName} · ${courtType}`} />
              <InfoRow
                icon={CalendarDays}
                label="Booking date"
                value={formatBookingDate(booking.bookingDate, 'EEEE, MMM d, yyyy')}
              />
              <InfoRow
                icon={Clock}
                label="Time"
                value={`${formatTimeLabel(booking.startTime)} – ${formatTimeLabel(
                  booking.endTime,
                )}`}
              />
              <InfoRow
                icon={Clock}
                label="Duration"
                value={`${booking.durationHours} hour${booking.durationHours === 1 ? '' : 's'}`}
              />
              <InfoRow
                icon={Tag}
                label="Hourly rate"
                value={formatCurrency(booking.hourlyRate)}
              />
              <InfoRow
                icon={Trophy}
                label="Booking type"
                value="Pickleball court reservation"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {booking.notes ? (
                <div className="flex items-start gap-3 rounded-xl border bg-muted/40 px-4 py-3">
                  <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-sm">{booking.notes}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No notes were provided.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <PaymentDetailsCard
            bookingType="pickleball"
            reference={booking.reference}
            totalAmount={booking.totalAmount}
            fallbackStatus={booking.paymentStatus}
            lineItem={{
              label: `${formatCurrency(booking.hourlyRate)} × ${booking.durationHours} hour${
                booking.durationHours === 1 ? '' : 's'
              }`,
              amount: booking.totalAmount,
            }}
          />

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
