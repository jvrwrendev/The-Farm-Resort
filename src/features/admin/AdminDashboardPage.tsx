import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import {
  BadgeCheck,
  BedDouble,
  CalendarCheck2,
  CalendarDays,
  CircleDollarSign,
  Clock,
  LogIn,
  Users,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { BookingActions } from '@/features/admin/BookingActions'
import { StatCard, StatusBadge } from '@/features/admin/components'
import { getAdminStats, getBookings } from '@/services/admin.service'
import { queryKeys } from '@/lib/queryKeys'
import { formatCurrency } from '@/lib/utils'

export default function AdminDashboardPage() {
  const navigate = useNavigate()

  const { data: stats } = useQuery({ queryKey: queryKeys.adminStats, queryFn: getAdminStats })
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: queryKeys.adminBookings(),
    queryFn: () => getBookings(),
  })

  const recent = bookings.slice(0, 6)

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Bookings" value={stats?.totalBookings ?? '—'} icon={CalendarCheck2} />
        <StatCard title="Pending" value={stats?.pending ?? '—'} icon={Clock} />
        <StatCard title="Confirmed" value={stats?.confirmed ?? '—'} icon={BadgeCheck} />
        <StatCard title="Cancelled" value={stats?.cancelled ?? '—'} icon={XCircle} />
        <StatCard title="Upcoming Reservations" value={stats?.upcomingReservations ?? '—'} icon={CalendarCheck2} />
        <StatCard title="Current Guests" value={stats?.currentGuests ?? '—'} icon={Users} />
        <StatCard title="Total Revenue" value={stats ? formatCurrency(stats.totalRevenue) : '—'} icon={CircleDollarSign} />
        <StatCard
          title="Accommodation"
          value={stats?.accommodationAvailable ? 'Available' : 'Occupied'}
          icon={BedDouble}
          hint="Exclusive Resort Accommodation"
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="font-display text-lg">Recent bookings</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/bookings">View all</Link>
          </Button>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead>Guests</TableHead>
                <TableHead>Nights</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[1%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                    Loading bookings…
                  </TableCell>
                </TableRow>
              ) : recent.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                    No bookings yet.
                  </TableCell>
                </TableRow>
              ) : (
                recent.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">{booking.bookingReference}</TableCell>
                    <TableCell>{booking.customerName}</TableCell>
                    <TableCell>{format(parseISO(booking.checkIn), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{format(parseISO(booking.checkOut), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{booking.adults + booking.children}</TableCell>
                    <TableCell>{booking.numberOfNights}</TableCell>
                    <TableCell>{formatCurrency(booking.totalAmount)}</TableCell>
                    <TableCell>
                      <StatusBadge status={booking.status} />
                    </TableCell>
                    <TableCell className="w-[1%] text-right">
                      <BookingActions
                        variant="menu"
                        booking={booking}
                        onView={(selected) => navigate(`/admin/bookings/${selected.id}`)}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">At a glance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Accommodation status</span>
              <Badge variant={stats?.accommodationAvailable ? 'success' : 'secondary'}>
                {stats?.accommodationAvailable ? 'Available' : 'Occupied'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Guests currently checked in</span>
              <span className="font-medium">{stats?.currentGuests ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Upcoming reservations</span>
              <span className="font-medium">{stats?.upcomingReservations ?? 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/admin/bookings">
                <CalendarCheck2 className="h-4 w-4" /> Manage bookings
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/admin/calendar">
                <CalendarDays className="h-4 w-4" /> Open calendar
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/admin/accommodation">
                <BedDouble className="h-4 w-4" /> Edit accommodation
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/admin/reports">
                <LogIn className="h-4 w-4" /> View reports
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
