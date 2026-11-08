import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import {
  BadgeCheck,
  CalendarCheck2,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  ExternalLink,
  Search,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeading, StatCard, StatusBadge } from '@/features/admin/components'
import { PICKLEBALL_COURTS } from '../mockData'
import { getPickleballBookings, getPickleballStats } from '../service'
import type { PickleballBookingStatus } from '../types'
import { usePickleballStorageSync } from '../usePickleballStorageSync'
import { formatBookingDate, formatTimeLabel, getCourt } from '../utils'
import { PickleballBookingActions } from './PickleballBookingActions'
import { queryKeys } from '@/lib/queryKeys'
import { cn, formatCurrency } from '@/lib/utils'

const STATUS_OPTIONS: Array<{ value: PickleballBookingStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function AdminPickleballPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<PickleballBookingStatus | 'all'>('all')
  const [courtId, setCourtId] = useState('all')
  const [date, setDate] = useState('')

  usePickleballStorageSync()

  const {
    data: bookings = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.pickleballBookings(),
    queryFn: () => getPickleballBookings(),
    staleTime: 0,
  })

  const stats = useMemo(() => getPickleballStats(bookings), [bookings])

  const filteredBookings = useMemo(() => {
    const term = search.trim().toLowerCase()

    return bookings.filter((booking) => {
      if (status !== 'all' && booking.status !== status) return false
      if (courtId !== 'all' && booking.courtId !== courtId) return false
      if (date && booking.bookingDate !== date) return false
      if (!term) return true

      return [booking.reference, booking.customerName, booking.email, booking.contactNumber]
        .join(' ')
        .toLowerCase()
        .includes(term)
    })
  }, [bookings, courtId, date, search, status])

  const hasFilters = Boolean(search || status !== 'all' || courtId !== 'all' || date)

  const clearFilters = () => {
    setSearch('')
    setStatus('all')
    setCourtId('all')
    setDate('')
  }

  return (
    <div className="space-y-6">
      <PageHeading
        title="Pickleball Bookings"
        description="Review, approve, and manage mock pickleball court reservations stored in this browser."
        action={
          <Button variant="outline" asChild>
            <Link to="/pickleball" target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
              Public page
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          title="Total"
          value={stats.total}
          icon={CalendarCheck2}
          hint={`${stats.today} today`}
        />
        <StatCard title="Pending" value={stats.pending} icon={Clock} hint="Awaiting review" />
        <StatCard title="Confirmed" value={stats.confirmed} icon={BadgeCheck} hint="Locked in" />
        <StatCard title="Completed" value={stats.completed} icon={CheckCircle2} hint="Played" />
        <StatCard title="Cancelled" value={stats.cancelled} icon={XCircle} hint="Released" />
        <StatCard
          title="Revenue"
          value={formatCurrency(stats.revenue)}
          icon={CircleDollarSign}
          hint="Confirmed + completed"
        />
      </div>

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="pickleball-search">Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="pickleball-search"
                placeholder="Reference, name, email, or contact"
                className="pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as PickleballBookingStatus | 'all')}
            >
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
          <div className="space-y-2">
            <Label>Court</Label>
            <Select value={courtId} onValueChange={setCourtId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All courts</SelectItem>
                {PICKLEBALL_COURTS.map((court) => (
                  <SelectItem key={court.id} value={court.id}>
                    {court.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pickleball-date">Date</Label>
            <Input
              id="pickleball-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          {hasFilters && (
            <div className="flex items-end sm:col-span-2 lg:col-span-5">
              <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="px-0 py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Court</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="hidden sm:table-cell">Time</TableHead>
                <TableHead className="hidden lg:table-cell">Players</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[1%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isError ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center">
                    <p className="text-sm text-muted-foreground">
                      We couldn’t load the pickleball reservations.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => refetch()}
                    >
                      Try again
                    </Button>
                  </TableCell>
                </TableRow>
              ) : isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    Loading reservations…
                  </TableCell>
                </TableRow>
              ) : filteredBookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    No pickleball reservations match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredBookings.map((booking) => {
                  const court = getCourt(booking.courtId)
                  return (
                    <TableRow key={booking.id}>
                      <TableCell className="font-mono text-xs font-medium">
                        {booking.reference}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{booking.customerName}</p>
                        <p className="text-xs text-muted-foreground">{booking.email}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'inline-block h-2 w-2 rounded-full',
                              court?.isCovered ? 'bg-emerald-500' : 'bg-primary/50',
                            )}
                          />
                          {court?.name ?? 'Pickleball court'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p>{format(parseISO(booking.bookingDate), 'MMM d, yyyy')}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatBookingDate(booking.bookingDate, 'EEE')}
                        </p>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <p>{formatTimeLabel(booking.startTime)}</p>
                        <p className="text-xs text-muted-foreground">
                          to {formatTimeLabel(booking.endTime)}
                        </p>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">{booking.players}</TableCell>
                      <TableCell>{formatCurrency(booking.totalAmount)}</TableCell>
                      <TableCell>
                        <StatusBadge status={booking.status} />
                      </TableCell>
                      <TableCell className="w-[1%] text-right">
                        <PickleballBookingActions
                          variant="menu"
                          booking={booking}
                          onView={(selectedBooking) =>
                            navigate(
                              `/admin/pickleball/${encodeURIComponent(selectedBooking.reference)}`,
                              { state: { from: '/admin/pickleball' } },
                            )
                          }
                        />
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
