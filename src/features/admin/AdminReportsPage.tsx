import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import {
  BadgeCheck,
  CalendarCheck2,
  CircleDollarSign,
  Percent,
  XCircle,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeading, StatCard, StatusBadge } from '@/features/admin/components'
import { getRangePresets, getReportData } from '@/services/admin.service'
import { queryKeys } from '@/lib/queryKeys'
import { formatCurrency } from '@/lib/utils'
import type { ReportRange } from '@/types'

type PresetKey = 'today' | 'week' | 'month' | 'year' | 'custom'

export default function AdminReportsPage() {
  const presets = useMemo(() => getRangePresets(), [])
  const [preset, setPreset] = useState<PresetKey>('month')
  const [customFrom, setCustomFrom] = useState(presets.month.from)
  const [customTo, setCustomTo] = useState(presets.month.to)

  const range: ReportRange =
    preset === 'custom'
      ? { label: 'Custom', from: customFrom, to: customTo }
      : presets[preset]

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.reports(range.from, range.to),
    queryFn: () => getReportData(range),
    enabled: !!range.from && !!range.to,
  })

  const presetButtons: PresetKey[] = ['today', 'week', 'month', 'year', 'custom']

  return (
    <div className="space-y-6">
      <PageHeading
        title="Reports"
        description="Booking performance, revenue, and occupancy for the selected period."
      />

      <Card>
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {presetButtons.map((key) => (
              <Button
                key={key}
                size="sm"
                variant={preset === key ? 'default' : 'outline'}
                onClick={() => setPreset(key)}
              >
                {key === 'custom' ? 'Custom Range' : presets[key].label}
              </Button>
            ))}
          </div>
          {preset === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="report-from">From</Label>
                <Input id="report-from" type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="report-to">To</Label>
                <Input id="report-to" type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Bookings" value={data?.totalBookings ?? '—'} icon={CalendarCheck2} />
        <StatCard title="Confirmed" value={data?.confirmed ?? '—'} icon={BadgeCheck} />
        <StatCard title="Cancelled" value={data?.cancelled ?? '—'} icon={XCircle} />
        <StatCard title="Revenue" value={data ? formatCurrency(data.revenue) : '—'} icon={CircleDollarSign} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display text-lg">Booking trends</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {isLoading || !data ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Loading…
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.trend} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-card)',
                      color: 'var(--color-card-foreground)',
                    }}
                  />
                  <Bar dataKey="bookings" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Percent className="h-4 w-4 text-primary" /> Occupancy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-display text-4xl font-bold text-primary">{data?.occupancyRate ?? 0}%</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {data ? `${data.occupiedNights} of ${data.totalNights} nights booked` : ''}
              </p>
            </div>
            <Progress value={data?.occupancyRate ?? 0} />
            <div className="space-y-2 border-t pt-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Period</span>
                <span className="font-medium">
                  {range.from} → {range.to}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Revenue trend</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          {isLoading || !data ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trend} margin={{ top: 8, right: 8, bottom: 8, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" />
                <YAxis tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-card)',
                    color: 'var(--color-card-foreground)',
                  }}
                />
                <Line type="monotone" dataKey="revenue" stroke="var(--color-primary)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Upcoming reservations</CardTitle>
        </CardHeader>
        <CardContent className="px-0 py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Guests</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data || data.upcoming.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No upcoming reservations.
                  </TableCell>
                </TableRow>
              ) : (
                data.upcoming.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">{booking.bookingReference}</TableCell>
                    <TableCell>{booking.customerName}</TableCell>
                    <TableCell>{format(parseISO(booking.checkIn), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{booking.adults + booking.children}</TableCell>
                    <TableCell>{formatCurrency(booking.totalAmount)}</TableCell>
                    <TableCell>
                      <StatusBadge status={booking.status} />
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
