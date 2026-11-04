import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BookingActions } from '@/features/admin/BookingActions'
import { PageHeading, StatusBadge } from '@/features/admin/components'
import { getBookings } from '@/services/admin.service'
import { queryKeys } from '@/lib/queryKeys'
import { BOOKING_TYPE_OPTIONS, BOOKING_TYPE_SHORT_LABELS } from '@/lib/constants'
import { cn, formatCurrency } from '@/lib/utils'
import type { AdminBookingStatus, BookingTypeDb } from '@/types'

const STATUS_OPTIONS: Array<{ value: AdminBookingStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function AdminBookingsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<AdminBookingStatus | 'all'>('all')
  const [bookingType, setBookingType] = useState<BookingTypeDb | 'all'>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const filters = {
    search,
    status,
    bookingType,
    from: from || undefined,
    to: to || undefined,
  }

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: queryKeys.adminBookings(filters),
    queryFn: () => getBookings(filters),
  })

  return (
    <div className="space-y-6">
      <PageHeading
        title="Bookings"
        description="Search, filter, and manage every reservation."
        action={
          <Button asChild>
            <Link to="/admin/bookings/new">
              <Plus className="h-4 w-4" />
              New booking
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-3">
          <span className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Source
          </span>
          {BOOKING_TYPE_OPTIONS.map((opt) => {
            const active = bookingType === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setBookingType(opt.value)}
                aria-pressed={active}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  active
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground',
                )}
              >
                {opt.label}
              </button>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Reference, name, email, or contact"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as AdminBookingStatus | 'all')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="from">From</Label>
              <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to">To</Label>
              <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="px-0 py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead className="hidden md:table-cell">Source</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead className="hidden sm:table-cell">Guests</TableHead>
                <TableHead className="hidden sm:table-cell">Nights</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[1%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                    Loading bookings…
                  </TableCell>
                </TableRow>
              ) : bookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                    No bookings match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">{booking.bookingReference}</TableCell>
                    <TableCell>
                      <p className="font-medium">{booking.customerName}</p>
                      <p className="text-xs text-muted-foreground">{booking.email}</p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs font-medium text-foreground">
                        {BOOKING_TYPE_SHORT_LABELS[booking.bookingType]}
                      </span>
                    </TableCell>
                    <TableCell>{format(parseISO(booking.checkIn), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{format(parseISO(booking.checkOut), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="hidden sm:table-cell">{booking.adults + booking.children}</TableCell>
                    <TableCell className="hidden sm:table-cell">{booking.numberOfNights}</TableCell>
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
    </div>
  )
}
