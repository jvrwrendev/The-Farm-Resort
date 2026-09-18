import type { ComponentType } from 'react'
import {
  BadgeCheck,
  Clock,
  Eye,
  Loader2,
  LogIn,
  LogOut,
  MoreHorizontal,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useBookingStatusMutation, nextStatuses } from '@/features/admin/useBookingStatusMutation'
import type { AdminBooking, AdminBookingStatus } from '@/types'

const LABELS: Record<AdminBookingStatus, string> = {
  pending: 'Mark as pending',
  confirmed: 'Confirm booking',
  checked_in: 'Check in',
  checked_out: 'Check out',
  cancelled: 'Cancel booking',
}

const SHORT_LABELS: Record<AdminBookingStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirm',
  checked_in: 'Check In',
  checked_out: 'Check Out',
  cancelled: 'Cancel',
}

const ICONS: Record<AdminBookingStatus, ComponentType<{ className?: string }>> = {
  pending: Clock,
  confirmed: BadgeCheck,
  checked_in: LogIn,
  checked_out: LogOut,
  cancelled: XCircle,
}

const VARIANTS: Record<AdminBookingStatus, 'default' | 'outline' | 'destructive'> = {
  pending: 'outline',
  confirmed: 'default',
  checked_in: 'default',
  checked_out: 'outline',
  cancelled: 'destructive',
}

interface BookingActionsProps {
  booking: AdminBooking
  onView?: (booking: AdminBooking) => void
  variant?: 'inline' | 'menu'
}

export function BookingActions({ booking, onView, variant = 'inline' }: BookingActionsProps) {
  const mutation = useBookingStatusMutation()
  const statuses = nextStatuses(booking.status)

  if (variant === 'menu') {
    return (
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
              aria-label={`Actions for ${booking.bookingReference}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate">{booking.bookingReference}</DropdownMenuLabel>
            {onView && (
              <DropdownMenuItem onSelect={() => onView(booking)}>
                <Eye />
                View details
              </DropdownMenuItem>
            )}
            {onView && statuses.length > 0 && <DropdownMenuSeparator />}
            {statuses.map((status) => {
              const Icon = ICONS[status]
              const isActive =
                mutation.isPending &&
                mutation.variables?.id === booking.id &&
                mutation.variables?.status === status

              return (
                <DropdownMenuItem
                  key={status}
                  variant={status === 'cancelled' ? 'destructive' : 'default'}
                  disabled={mutation.isPending}
                  onSelect={() => mutation.mutate({ id: booking.id, status })}
                >
                  {isActive ? <Loader2 className="animate-spin" /> : <Icon />}
                  {LABELS[status]}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {onView && (
        <Button variant="ghost" size="sm" onClick={() => onView(booking)}>
          <Eye className="h-4 w-4" />
          View
        </Button>
      )}
      {statuses.map((status) => {
        const Icon = ICONS[status]
        return (
          <Button
            key={status}
            size="sm"
            variant={VARIANTS[status]}
            loading={
              mutation.isPending &&
              mutation.variables?.id === booking.id &&
              mutation.variables?.status === status
            }
            onClick={() => mutation.mutate({ id: booking.id, status })}
          >
            <Icon className="h-4 w-4" />
            {SHORT_LABELS[status]}
          </Button>
        )
      })}
    </div>
  )
}
