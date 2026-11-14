import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { MoreVertical, Search } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { PageHeading, StatusBadge } from '@/features/admin/components'
import AdminManualBookingDialog from '@/features/admin/AdminManualBookingDialog'
import { PaymentDetailsCard, PaymentStatusBadge } from '@/features/admin/PaymentDetailsCard'
import { getBookings, type BookingFilters } from '@/services/admin.service'
import { listPickleballBookings } from '@/services/pickleballBooking.service'
import { listActivityBookings, updateActivityBookingStatus } from '@/services/activity.service'
import { updatePickleballBookingStatus } from '@/services/pickleballBooking.service'
import { updateBookingStatus } from '@/services/admin.service'
import { queryKeys } from '@/lib/queryKeys'
import { formatCurrency } from '@/lib/utils'
import type { AdminBooking } from '@/types'
import type { PickleballBooking } from '@/features/pickleball/types'
import type { ActivityBooking } from '@/features/activities/types'
import type { PaymentBookingType } from '@/services/payment.service'
import { approveBooking, rejectBooking } from '@/services/payment.service'
import { sendBookingConfirmation } from '@/services/email.service'

type TabKey = 'resort' | 'pickleball' | 'atv' | 'billiards'

const TABS: { key: TabKey; label: string; paymentType: PaymentBookingType }[] = [
  { key: 'resort', label: 'Resort Booking', paymentType: 'accommodation' },
  { key: 'pickleball', label: 'Pickleball Booking', paymentType: 'pickleball' },
  { key: 'atv', label: 'ATV Booking', paymentType: 'atv' },
  { key: 'billiards', label: 'Billiards Booking', paymentType: 'billiards' },
]

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'checked_in', label: 'Checked in' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const PAYMENT_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All payments' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'pending_verification', label: 'Pending verification' },
  { value: 'partially_paid', label: 'Partially paid' },
  { value: 'paid', label: 'Paid' },
  { value: 'rejected', label: 'Rejected' },
]

interface RowData {
  id: string
  reference: string
  customerName: string
  date: string
  schedule: string
  total: number
  status: string
  paymentStatus: string
  bookingSource: 'online' | 'manual'
  raw: unknown
}

function paymentTypeFor(tab: TabKey): PaymentBookingType {
  return TABS.find((t) => t.key === tab)!.paymentType
}

export default function AdminBookingsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabKey>('resort')

  // Shared filters (per-tab state could be separate; keep simple with one set applied to active tab)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [paymentStatus, setPaymentStatus] = useState('all')
  const [source, setSource] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const [paymentTarget, setPaymentTarget] = useState<{ type: PaymentBookingType; reference: string; total: number; status: string } | null>(null)
  const [manualOpen, setManualOpen] = useState(false)

  // Resort (accommodation)
  const resortFilters: BookingFilters = { search, status: status as BookingFilters['status'], bookingType: 'all', from: from || undefined, to: to || undefined }
  const { data: resortBookings = [], isLoading: resortLoading } = useQuery({
    queryKey: queryKeys.adminBookings(resortFilters),
    queryFn: () => getBookings(resortFilters),
    enabled: activeTab === 'resort',
  })

  // Pickleball
  const { data: pickleballBookings = [], isLoading: pickleballLoading } = useQuery({
    queryKey: ['pickleball', 'bookings', 'admin', search, status],
    queryFn: () => listPickleballBookings(),
    enabled: activeTab === 'pickleball',
  })

  // Activities (both types) — filter by type in tab
  const { data: activityBookings = [], isLoading: activityLoading } = useQuery({
    queryKey: ['activity-bookings', 'admin', 'all'],
    queryFn: async () => {
      const [b, a] = await Promise.all([
        listActivityBookings('billiards'),
        listActivityBookings('atv'),
      ])
      return [...b, ...a]
    },
    enabled: activeTab === 'atv' || activeTab === 'billiards',
  })

  const handleStatusChange = async (tab: TabKey, idOrRef: string, newStatus: string) => {
    try {
      const pType = paymentTypeFor(tab)
      if (newStatus === 'confirmed') {
        await approveBooking(pType, idOrRef)
        // Send confirmation email (non-blocking: approval already succeeded).
        try {
          const res = await sendBookingConfirmation(pType, idOrRef)
          if (res?.status === 'failed') {
            toast.warning('Booking approved, but confirmation email failed to send.')
          }
        } catch {
          toast.warning('Booking approved, but confirmation email could not be sent.')
        }
      } else {
        if (tab === 'resort') {
          await updateBookingStatus(idOrRef, newStatus as AdminBooking['status'])
        } else if (tab === 'pickleball') {
          await updatePickleballBookingStatus(idOrRef, newStatus as PickleballBooking['status'])
        } else {
          await updateActivityBookingStatus(idOrRef, newStatus as ActivityBooking['status'])
        }
      }
      toast.success('Booking status updated.')
      queryClient.invalidateQueries({ queryKey: queryKeys.adminBookings() })
      queryClient.invalidateQueries({ queryKey: ['pickleball'] })
      queryClient.invalidateQueries({ queryKey: ['activity-bookings'] })
      queryClient.invalidateQueries({ queryKey: ['payment-records'] })
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      queryClient.invalidateQueries({ queryKey: ['availability'] })
      queryClient.invalidateQueries({ queryKey: ['pickleball', 'occupancy'] })
      queryClient.invalidateQueries({ queryKey: ['activity-day-bookings'] })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update status.')
    }
  }

  const filterRows = (rows: RowData[]) => {
    let out = rows
    if (search.trim()) {
      const q = search.toLowerCase()
      out = out.filter((r) => r.reference.toLowerCase().includes(q) || r.customerName.toLowerCase().includes(q))
    }
    if (status !== 'all') out = out.filter((r) => r.status === status)
    if (paymentStatus !== 'all') out = out.filter((r) => r.paymentStatus === paymentStatus)
    if (source !== 'all') out = out.filter((r) => r.bookingSource === source)
    if (from) out = out.filter((r) => r.date >= from)
    if (to) out = out.filter((r) => r.date <= to)
    return out
  }

  const resortRows: RowData[] = (resortBookings as AdminBooking[]).map((b) => ({
    id: b.id,
    reference: b.bookingReference,
    customerName: b.customerName,
    date: b.checkIn,
    schedule: `${format(parseISO(b.checkIn), 'MMM d')} → ${format(parseISO(b.checkOut), 'MMM d')}`,
    total: b.totalAmount,
    status: b.status,
    paymentStatus: b.paymentStatus,
    bookingSource: b.bookingSource,
    raw: b,
  }))

  const pickleballRows: RowData[] = (pickleballBookings as PickleballBooking[]).map((b) => ({
      id: b.reference,
      reference: b.reference,
      customerName: b.customerName,
      date: b.bookingDate,
      schedule: `${b.startTime} – ${b.endTime}`,
      total: b.totalAmount,
      status: b.status,
      paymentStatus: b.paymentStatus,
      bookingSource: b.bookingSource,
      raw: b,
    }))

  const atvRows: RowData[] = (activityBookings as ActivityBooking[])
    .filter((b) => b.activityType === 'atv')
    .map((b) => ({
      id: b.id,
      reference: b.reference,
      customerName: b.customerName,
      date: b.bookingDate,
      schedule: `${b.startTime} – ${b.endTime}`,
      total: b.totalAmount,
      status: b.status,
      paymentStatus: b.paymentStatus,
      bookingSource: b.bookingSource,
      raw: b,
    }))

  const billiardsRows: RowData[] = (activityBookings as ActivityBooking[])
    .filter((b) => b.activityType === 'billiards')
    .map((b) => ({
      id: b.id,
      reference: b.reference,
      customerName: b.customerName,
      date: b.bookingDate,
      schedule: `${b.startTime} – ${b.endTime}`,
      total: b.totalAmount,
      status: b.status,
      paymentStatus: b.paymentStatus,
      bookingSource: b.bookingSource,
      raw: b,
    }))

  const rowsByTab: Record<TabKey, RowData[]> = {
    resort: filterRows(resortRows),
    pickleball: filterRows(pickleballRows),
    atv: filterRows(atvRows),
    billiards: filterRows(billiardsRows),
  }

  const loadingByTab: Record<TabKey, boolean> = {
    resort: resortLoading,
    pickleball: pickleballLoading,
    atv: activityLoading,
    billiards: activityLoading,
  }

  const renderTable = (tab: TabKey) => {
    const rows = rowsByTab[tab]
    const loading = loadingByTab[tab]
    const pType = paymentTypeFor(tab)
    return (
      <Card>
        <CardContent className="px-0 py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="hidden sm:table-cell">Schedule</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="hidden md:table-cell">Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[1%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    Loading bookings…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    No bookings match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs font-medium">
                      <button
                        type="button"
                        className="text-primary hover:underline"
                        onClick={() => navigate(`/admin/bookings/detail/${activeTab}/${encodeURIComponent(row.reference)}`)}
                      >
                        {row.reference}
                      </button>
                    </TableCell>
                    <TableCell className="font-medium">
                      <button
                        type="button"
                        className="text-primary hover:underline"
                        onClick={() => navigate(`/admin/bookings/detail/${activeTab}/${encodeURIComponent(row.reference)}`)}
                      >
                        {row.customerName}
                      </button>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${row.bookingSource === 'manual' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-muted text-muted-foreground'}`}>
                        {row.bookingSource === 'manual' ? 'Manual' : 'Online'}
                      </span>
                    </TableCell>
                    <TableCell>{format(parseISO(row.date), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="hidden sm:table-cell">{row.schedule}</TableCell>
                    <TableCell>{formatCurrency(row.total)}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <PaymentStatusBadge status={row.paymentStatus as 'unpaid' | 'pending_verification' | 'partially_paid' | 'paid' | 'rejected'} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.status as AdminBooking['status']} />
                    </TableCell>
                    <TableCell className="w-[1%] text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/admin/bookings/detail/${activeTab}/${encodeURIComponent(row.reference)}`)}>
                            View details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setPaymentTarget({ type: pType, reference: row.reference, total: row.total, status: row.paymentStatus })}>
                            Payment / receipt
                          </DropdownMenuItem>
                          {row.status === 'pending' && (
                            <>
                              <DropdownMenuItem onClick={() => handleStatusChange(tab, row.id, 'confirmed')}>
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={async () => {
                                try {
                                  await rejectBooking(pType, row.reference)
                                  toast.success('Booking rejected.')
                                  queryClient.invalidateQueries({ queryKey: queryKeys.adminBookings() })
                                  queryClient.invalidateQueries({ queryKey: ['pickleball'] })
                                  queryClient.invalidateQueries({ queryKey: ['activity-bookings'] })
                                  queryClient.invalidateQueries({ queryKey: ['payment-records'] })
                                } catch (e) {
                                  toast.error(e instanceof Error ? e.message : 'Failed to reject.')
                                }
                              }} className="text-destructive focus:text-destructive">
                                Reject
                              </DropdownMenuItem>
                            </>
                          )}
                          {row.status === 'confirmed' && (
                            <>
                              <DropdownMenuItem onClick={() => handleStatusChange(tab, row.id, 'checked_in')}>
                                {tab === 'atv' || tab === 'billiards' ? 'Rent In' : 'Check-in'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(tab, row.id, 'cancelled')} className="text-destructive focus:text-destructive">
                                Cancel
                              </DropdownMenuItem>
                            </>
                          )}
                          {row.status === 'checked_in' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(tab, row.id, 'completed')}>
                              {tab === 'atv' || tab === 'billiards' ? 'Rent Out' : 'Check-out'}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeading
        title="Bookings"
        description="All resort, pickleball, ATV, and billiards reservations in one place."
        action={<Button onClick={() => setManualOpen(true)}>Create manual booking</Button>}
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)} className="space-y-4">
        <TabsList className="inline-flex h-auto w-auto gap-1 rounded-lg bg-muted/50 p-1">
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key} className="rounded-md px-3 py-1.5 text-sm">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Reference or customer name"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Payment</Label>
            <Select value={paymentStatus} onValueChange={setPaymentStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Source</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
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

      <TabsContent value={activeTab} className="mt-0">
        {renderTable(activeTab)}
      </TabsContent>
      </Tabs>

      <AdminManualBookingDialog open={manualOpen} onOpenChange={setManualOpen} />

      <Dialog open={!!paymentTarget} onOpenChange={(o) => !o && setPaymentTarget(null)}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment details</DialogTitle>
            <DialogDescription>
              {paymentTarget?.reference}
            </DialogDescription>
          </DialogHeader>
          {paymentTarget && (
            <PaymentDetailsCard
              bookingType={paymentTarget.type}
              reference={paymentTarget.reference}
              totalAmount={paymentTarget.total}
              fallbackStatus={paymentTarget.status as 'unpaid' | 'pending_verification' | 'partially_paid' | 'paid' | 'rejected'}
              className="border-0 shadow-none"
            />
          )}
        </DialogContent>
      </Dialog>


    </div>
  )
}