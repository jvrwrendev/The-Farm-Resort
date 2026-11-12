import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, CalendarDays, Clock, Mail, Phone, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/features/admin/components'
import { PaymentDetailsCard } from '@/features/admin/PaymentDetailsCard'
import { getBookingByReference } from '@/services/booking.service'
import { getPickleballBookingByReference } from '@/services/pickleballBooking.service'
import { getActivityBookingByReference } from '@/services/activity.service'
import { applyDiscount, completePayment, getPaymentForBooking } from '@/services/payment.service'
import type { PaymentRecord } from '@/services/payment.service'
import { queryKeys } from '@/lib/queryKeys'
import { formatCurrency } from '@/lib/utils'
import type { AdminBooking } from '@/types'
import { useState } from 'react'

type DetailType = 'resort' | 'pickleball' | 'atv' | 'billiards'

export default function AdminBookingDetailPage() {
  const { type = 'resort', reference = '' } = useParams<{ type: string; reference: string }>()
  const detailType = (['resort', 'pickleball', 'atv', 'billiards'].includes(type) ? type : 'resort') as DetailType
  const decodedRef = decodeURIComponent(reference)

  const resortQuery = useQuery({
    queryKey: queryKeys.bookingByReference(decodedRef),
    queryFn: () => getBookingByReference(decodedRef),
    enabled: detailType === 'resort' && !!decodedRef,
  })
  const pickleballQuery = useQuery({
    queryKey: queryKeys.pickleballBooking(decodedRef),
    queryFn: () => getPickleballBookingByReference(decodedRef),
    enabled: detailType === 'pickleball' && !!decodedRef,
  })
  const activityQuery = useQuery({
    queryKey: queryKeys.activityBooking(decodedRef),
    queryFn: () => getActivityBookingByReference(decodedRef),
    enabled: (detailType === 'atv' || detailType === 'billiards') && !!decodedRef,
  })

  const paymentType: 'accommodation' | 'pickleball' | 'atv' | 'billiards' =
    detailType === 'resort' ? 'accommodation' : detailType === 'pickleball' ? 'pickleball' : detailType === 'atv' ? 'atv' : 'billiards'
  const paymentQuery = useQuery({
    queryKey: ['payment', paymentType, decodedRef],
    queryFn: () => getPaymentForBooking(paymentType, decodedRef),
    enabled: !!decodedRef,
  })

  const isLoading =
    (detailType === 'resort' && resortQuery.isLoading) ||
    (detailType === 'pickleball' && pickleballQuery.isLoading) ||
    ((detailType === 'atv' || detailType === 'billiards') && activityQuery.isLoading)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  // Resort
  if (detailType === 'resort') {
    const b = resortQuery.data
    if (!b) return <NotFound />
    return (
      <div className="space-y-6">
        <BackButton />
        <Header title={b.bookingReference} status={b.status} subtitle={`Submitted ${format(parseISO(b.createdAt), 'MMM d, yyyy · h:mm a')}`} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader><CardTitle className="font-display text-lg">Guest details</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InfoRow icon={Users} label="Full name" value={b.customerName} />
                <InfoRow icon={Mail} label="Email" value={b.email} />
                <InfoRow icon={Phone} label="Contact" value={b.contactNumber} />
                <InfoRow icon={Users} label="Party size" value={`${b.adults + b.children} (${b.adults} adults, ${b.children} children)`} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="font-display text-lg">Stay details</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InfoRow icon={CalendarDays} label="Check-in" value={`${format(parseISO(b.checkIn), 'EEEE, MMM d, yyyy')}${b.checkInPeriod ? ` · ${b.checkInPeriod}` : ''}`} />
                <InfoRow icon={CalendarDays} label="Check-out" value={`${format(parseISO(b.checkOut), 'EEEE, MMM d, yyyy')}${b.checkOutPeriod ? ` · ${b.checkOutPeriod}` : ''}`} />
                <InfoRow icon={Clock} label="Nights" value={`${b.numberOfNights} night(s)`} />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <PaymentDetailsCard
              bookingType="accommodation"
              reference={b.bookingReference}
              totalAmount={b.totalAmount}
              fallbackStatus={b.paymentStatus}
              lineItem={{ label: `${formatCurrency(b.pricePerNight)} × ${b.numberOfNights} night(s)`, amount: b.totalAmount }}
            />
            <DiscountAndCompleteSection payment={paymentQuery.data ?? null} bookingStatus={b.status} reference={b.bookingReference} type="accommodation" total={b.totalAmount} onChanged={() => paymentQuery.refetch()} />
          </div>
        </div>
      </div>
    )
  }

  // Pickleball
  if (detailType === 'pickleball') {
    const b = pickleballQuery.data
    if (!b) return <NotFound />
    return (
      <div className="space-y-6">
        <BackButton />
        <Header title={b.reference} status={b.status} subtitle={`Submitted ${format(parseISO(b.createdAt), 'MMM d, yyyy · h:mm a')}`} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader><CardTitle className="font-display text-lg">Guest details</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InfoRow icon={Users} label="Full name" value={b.customerName} />
                <InfoRow icon={Mail} label="Email" value={b.email} />
                <InfoRow icon={Phone} label="Contact" value={b.contactNumber} />
                <InfoRow icon={Users} label="Players" value={`${b.players}`} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="font-display text-lg">Court & schedule</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InfoRow icon={CalendarDays} label="Date" value={b.bookingDate} />
                <InfoRow icon={Clock} label="Time" value={`${b.startTime} – ${b.endTime}`} />
                <InfoRow icon={Clock} label="Duration" value={`${b.durationHours} hour(s)`} />
                <InfoRow icon={CalendarDays} label="Hourly rate" value={formatCurrency(b.hourlyRate)} />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <PaymentDetailsCard
              bookingType="pickleball"
              reference={b.reference}
              totalAmount={b.totalAmount}
              fallbackStatus={b.paymentStatus}
              lineItem={{ label: `${formatCurrency(b.hourlyRate)} × ${b.durationHours} hour(s)`, amount: b.totalAmount }}
            />
            <DiscountAndCompleteSection payment={paymentQuery.data ?? null} bookingStatus={b.status} reference={b.reference} type="pickleball" total={b.totalAmount} onChanged={() => paymentQuery.refetch()} />
          </div>
        </div>
      </div>
    )
  }

  // ATV / Billiards
  const b = activityQuery.data
  if (!b) return <NotFound />
  return (
    <div className="space-y-6">
      <BackButton />
      <Header title={b.reference} status={b.status} subtitle={`Submitted ${format(parseISO(b.createdAt), 'MMM d, yyyy · h:mm a')}`} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle className="font-display text-lg">Guest details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoRow icon={Users} label="Full name" value={b.customerName} />
              <InfoRow icon={Mail} label="Email" value={b.email} />
              <InfoRow icon={Phone} label="Contact" value={b.contactNumber} />
              <InfoRow icon={Users} label="Players" value={`${b.players}`} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="font-display text-lg">Booking details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoRow icon={CalendarDays} label="Activity" value={b.activityName} />
              <InfoRow icon={CalendarDays} label="Unit" value={b.unitName} />
              <InfoRow icon={CalendarDays} label="Date" value={b.bookingDate} />
              <InfoRow icon={Clock} label="Time" value={`${b.startTime} – ${b.endTime}`} />
              <InfoRow icon={Clock} label="Duration" value={`${b.durationHours} hour(s)`} />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <PaymentDetailsCard
            bookingType={b.activityType}
            reference={b.reference}
            totalAmount={b.totalAmount}
            fallbackStatus={b.paymentStatus}
            lineItem={{ label: `${formatCurrency(b.hourlyRate)} × ${b.durationHours} hour(s)`, amount: b.totalAmount }}
          />
          <DiscountAndCompleteSection payment={paymentQuery.data ?? null} bookingStatus={b.status} reference={b.reference} type={b.activityType} total={b.totalAmount} onChanged={() => paymentQuery.refetch()} />
        </div>
      </div>
    </div>
  )
}

function BackButton() {
  return (
    <Button variant="ghost" size="sm" asChild className="-ml-2">
      <Link to="/admin/bookings"><ArrowLeft className="h-4 w-4" /> Back to bookings</Link>
    </Button>
  )
}

function Header({ title, status, subtitle }: { title: string; status: string; subtitle: string }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-2xl font-bold">{title}</h2>
          <StatusBadge status={status as AdminBooking['status']} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
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

function NotFound() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="font-display text-lg font-semibold">Booking not found</p>
        <Button asChild><Link to="/admin/bookings"><ArrowLeft className="h-4 w-4" /> Back to bookings</Link></Button>
      </CardContent>
    </Card>
  )
}

function DiscountAndCompleteSection({
  payment,
  bookingStatus,
  reference,
  type,
  total,
  onChanged,
}: {
  payment: PaymentRecord | null
  bookingStatus: string
  reference: string
  type: 'accommodation' | 'pickleball' | 'atv' | 'billiards'
  total: number
  onChanged: () => void
}) {
  const [discountType, setDiscountType] = useState<'none' | 'fixed' | 'percent'>(payment?.discountType ?? 'none')
  const [discountValue, setDiscountValue] = useState<string>(String(payment?.discountValue ?? 0))
  const [applying, setApplying] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const original = payment?.originalAmount ?? total
  const discount = payment?.discountType === 'fixed'
    ? Math.min(Number(payment.discountValue || 0), original)
    : payment?.discountType === 'percent'
      ? Math.round(original * (Number(payment.discountValue || 0) / 100) * 100) / 100
      : 0
  const finalTotal = payment?.totalAmount ?? total
  const balance = payment?.remainingBalance ?? finalTotal
  const canComplete = bookingStatus === 'completed' && balance > 0 && payment?.status !== 'paid'

  const handleApply = async () => {
    setApplying(true)
    try {
      await applyDiscount({
        bookingType: type,
        bookingReference: reference,
        discountType,
        discountValue: Number(discountValue || 0),
      })
      toast.success('Discount applied.')
      onChanged()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to apply discount.')
    } finally {
      setApplying(false)
    }
  }

  const handleComplete = async () => {
    if (!payment) return
    setCompleting(true)
    try {
      await completePayment(payment.id)
      toast.success('Payment completed. Balance set to ₱0.00.')
      setConfirmOpen(false)
      onChanged()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to complete payment.')
    } finally {
      setCompleting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">Discount & payment completion</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border bg-muted/30 p-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Original amount</p>
            <p className="mt-1 font-semibold">{formatCurrency(original)}</p>
          </div>
          <div className="rounded-xl border bg-muted/30 p-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Discount</p>
            <p className="mt-1 font-semibold">{formatCurrency(discount)}</p>
          </div>
          <div className="rounded-xl border bg-primary/5 p-3">
            <p className="text-xs font-medium uppercase tracking-wider text-primary">Final total</p>
            <p className="mt-1 font-display text-lg font-bold text-primary">{formatCurrency(finalTotal)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Discount type</Label>
            <Select value={discountType} onValueChange={(v) => setDiscountType(v as 'none' | 'fixed' | 'percent')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="fixed">Fixed (₱)</SelectItem>
                <SelectItem value="percent">Percentage (%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Discount value</Label>
            <Input
              type="number"
              min={0}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              disabled={discountType === 'none'}
            />
          </div>
          <div className="flex items-end">
            <Button type="button" onClick={handleApply} loading={applying} className="w-full">
              Apply discount
            </Button>
          </div>
        </div>

        {canComplete && (
          <div className="border-t pt-4">
            <p className="mb-2 text-sm text-muted-foreground">
              Outstanding balance: <span className="font-semibold text-foreground">{formatCurrency(balance)}</span>. Complete payment to mark as paid.
            </p>
            <Button type="button" onClick={() => setConfirmOpen(true)}>
              Complete payment
            </Button>
          </div>
        )}

        {confirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-xl">
              <h3 className="font-display text-lg font-semibold">Confirm payment completion</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                This will mark the remaining balance of {formatCurrency(balance)} as paid and set the booking to Paid. Continue?
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={completing}>
                  Cancel
                </Button>
                <Button onClick={handleComplete} loading={completing}>
                  Confirm
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}