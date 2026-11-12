import { useQuery } from '@tanstack/react-query'
import {
  CircleDollarSign,
  ExternalLink,
  Loader2,
  Maximize2,
  Receipt,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  getPaymentForBooking,
  type PaymentBookingType,
} from '@/services/payment.service'
import { cn, formatCurrency, formatStatus } from '@/lib/utils'

export type PaymentDisplayStatus =
  | 'unpaid'
  | 'pending_verification'
  | 'partially_paid'
  | 'paid'
  | 'rejected'

const PAYMENT_STATUS_VARIANTS: Record<
  PaymentDisplayStatus,
  'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'
> = {
  unpaid: 'warning',
  pending_verification: 'warning',
  partially_paid: 'success',
  paid: 'success',
  rejected: 'destructive',
}

const PAYMENT_STATUS_LABELS: Record<PaymentDisplayStatus, string> = {
  unpaid: 'Down payment required',
  pending_verification: 'Pending verification',
  partially_paid: 'Partially paid (50%)',
  paid: 'Paid',
  rejected: 'Rejected',
}

export function PaymentStatusBadge({
  status,
  className,
}: {
  status: PaymentDisplayStatus
  className?: string
}) {
  return (
    <Badge variant={PAYMENT_STATUS_VARIANTS[status]} className={className}>
      {PAYMENT_STATUS_LABELS[status] ?? formatStatus(status)}
    </Badge>
  )
}

function roundAmount(value: number): number {
  return Math.round(value * 100) / 100
}

function BreakdownTile({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string
  value: string
  hint?: string
  accent?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-xl border p-3',
        accent ? 'border-primary/30 bg-primary/5' : 'bg-muted/30',
      )}
    >
      <p
        className={cn(
          'text-[11px] font-medium uppercase tracking-wider',
          accent ? 'text-primary' : 'text-muted-foreground',
        )}
      >
        {label}
      </p>
      <p className={cn('mt-1 font-display text-lg font-bold', accent ? 'text-primary' : 'text-foreground')}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

export interface PaymentDetailsCardProps {
  bookingType: PaymentBookingType
  reference: string
  totalAmount: number
  /** Booking-level payment status, used when no payment record exists yet. */
  fallbackStatus?: PaymentDisplayStatus
  /** Optional price breakdown line, e.g. ₱2,500 × 3 nights. */
  lineItem?: { label: string; amount: number }
  className?: string
}

export function PaymentDetailsCard({
  bookingType,
  reference,
  totalAmount,
  fallbackStatus = 'unpaid',
  lineItem,
  className,
}: PaymentDetailsCardProps) {
  const { data: payment, isLoading } = useQuery({
    queryKey: ['payment', bookingType, reference],
    queryFn: () => getPaymentForBooking(bookingType, reference),
    enabled: Boolean(reference),
  })

  const displayStatus: PaymentDisplayStatus = payment
    ? payment.status === 'verified'
      ? 'partially_paid'
      : payment.status
    : fallbackStatus

  const downPayment = payment?.downPaymentAmount ?? roundAmount(totalAmount * 0.5)
  const remaining = payment?.remainingBalance ?? roundAmount(totalAmount - downPayment)
  const amountPaid = payment?.status === 'verified' ? payment.downPaymentAmount : 0

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 font-display text-lg">
          <span className="flex items-center gap-2">
            <CircleDollarSign className="h-4 w-4 text-primary" /> Payment details
          </span>
          <PaymentStatusBadge status={displayStatus} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading payment details…
          </div>
        ) : (
          <>
            {lineItem && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{lineItem.label}</span>
                <span className="font-medium">{formatCurrency(lineItem.amount)}</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <BreakdownTile label="Total amount" value={formatCurrency(totalAmount)} />
              <BreakdownTile
                label="50% down payment"
                value={formatCurrency(downPayment)}
                accent
              />
              <BreakdownTile label="Remaining 50%" value={formatCurrency(remaining)} />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="rounded-xl border bg-muted/30 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Actual amount paid
                </p>
                <p className="mt-1 font-display text-lg font-bold text-foreground">
                  {formatCurrency(amountPaid)}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {amountPaid > 0 ? 'Verified GCash down payment' : 'No verified payment yet'}
                </p>
              </div>
              <div className="rounded-xl border bg-muted/30 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Payment status
                </p>
                <div className="mt-1.5">
                  <PaymentStatusBadge status={displayStatus} />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {payment?.verifiedAt
                    ? `Verified ${new Date(payment.verifiedAt).toLocaleString()}`
                    : payment
                      ? 'Awaiting admin review'
                      : 'No receipt submitted'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>GCash receipt</Label>
              {payment?.receiptUrl ? (
                <Dialog>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="group relative block w-full overflow-hidden rounded-xl border bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Enlarge payment receipt"
                    >
                      <img
                        src={payment.receiptUrl}
                        alt={`GCash payment receipt for ${reference}`}
                        className="max-h-56 w-full object-contain"
                      />
                      <span className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 text-sm font-medium text-white opacity-0 transition group-hover:bg-black/50 group-hover:opacity-100">
                        <Maximize2 className="h-4 w-4" /> Click to enlarge
                      </span>
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
                    <DialogTitle className="pr-8 font-display text-lg">
                      Payment receipt · {reference}
                    </DialogTitle>
                    <DialogDescription>
                      Submitted {new Date(payment.createdAt).toLocaleString()} · Down payment{' '}
                      {formatCurrency(payment.downPaymentAmount)}
                    </DialogDescription>
                    <div className="flex items-center justify-center rounded-xl border bg-muted/20 p-2">
                      <img
                        src={payment.receiptUrl}
                        alt={`Full-size GCash payment receipt for ${reference}`}
                        className="max-h-[70vh] w-auto max-w-full object-contain"
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button size="sm" variant="outline" asChild>
                        <a href={payment.receiptUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4" /> Open original
                        </a>
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              ) : (
                <div className="flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  <Receipt className="mt-0.5 h-4 w-4 shrink-0" />
                  No GCash receipt has been uploaded for this booking yet.
                </div>
              )}
            </div>

            {payment?.status === 'rejected' && payment.rejectionReason && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                <span className="font-semibold">Rejection reason:</span> {payment.rejectionReason}
              </p>
            )}

            <div className="rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Payment approval is managed through the main Booking Actions (Approve / Reject). The receipt above is supporting evidence.
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
