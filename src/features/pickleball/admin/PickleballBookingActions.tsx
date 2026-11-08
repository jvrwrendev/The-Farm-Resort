import type { ComponentType } from 'react'
import {
  BadgeCheck,
  CheckCircle2,
  Eye,
  Loader2,
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
import type { PickleballBooking, PickleballBookingStatus } from '../types'
import { usePickleballStatusMutation } from '../usePickleballStatusMutation'

const ICONS: Record<PickleballBookingStatus, ComponentType<{ className?: string }>> = {
  pending: BadgeCheck,
  confirmed: BadgeCheck,
  completed: CheckCircle2,
  cancelled: XCircle,
}

const VARIANTS: Record<PickleballBookingStatus, 'default' | 'outline' | 'destructive'> = {
  pending: 'outline',
  confirmed: 'default',
  completed: 'outline',
  cancelled: 'destructive',
}

function nextPickleballStatuses(
  status: PickleballBookingStatus,
): PickleballBookingStatus[] {
  switch (status) {
    case 'pending':
      return ['confirmed', 'cancelled']
    case 'confirmed':
      return ['completed', 'cancelled']
    default:
      return []
  }
}

function actionLabel(current: PickleballBookingStatus, target: PickleballBookingStatus): string {
  if (target === 'confirmed') return 'Approve reservation'
  if (target === 'completed') return 'Mark as completed'
  if (target === 'cancelled') {
    return current === 'pending' ? 'Reject reservation' : 'Cancel reservation'
  }
  return 'Mark as pending'
}

function shortLabel(current: PickleballBookingStatus, target: PickleballBookingStatus): string {
  if (target === 'confirmed') return 'Approve'
  if (target === 'completed') return 'Complete'
  if (target === 'cancelled') return current === 'pending' ? 'Reject' : 'Cancel'
  return 'Pending'
}

interface PickleballBookingActionsProps {
  booking: PickleballBooking
  onView?: (booking: PickleballBooking) => void
  onStatusChanged?: (booking: PickleballBooking) => void
  variant?: 'inline' | 'menu'
}

export function PickleballBookingActions({
  booking,
  onView,
  onStatusChanged,
  variant = 'inline',
}: PickleballBookingActionsProps) {
  const mutation = usePickleballStatusMutation(onStatusChanged)
  const statuses = nextPickleballStatuses(booking.status)

  if (variant === 'menu') {
    return (
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
              aria-label={`Actions for ${booking.reference}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate">{booking.reference}</DropdownMenuLabel>
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
                mutation.variables?.reference === booking.reference &&
                mutation.variables?.status === status

              return (
                <DropdownMenuItem
                  key={status}
                  variant={status === 'cancelled' ? 'destructive' : 'default'}
                  disabled={mutation.isPending}
                  onSelect={() =>
                    mutation.mutate({ reference: booking.reference, status })
                  }
                >
                  {isActive ? <Loader2 className="animate-spin" /> : <Icon />}
                  {actionLabel(booking.status, status)}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  if (statuses.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        This reservation has no further status changes.
      </p>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {statuses.map((status) => {
        const Icon = ICONS[status]
        return (
          <Button
            key={status}
            type="button"
            size="sm"
            variant={VARIANTS[status]}
            loading={
              mutation.isPending &&
              mutation.variables?.reference === booking.reference &&
              mutation.variables?.status === status
            }
            onClick={() => mutation.mutate({ reference: booking.reference, status })}
          >
            <Icon className="h-4 w-4" />
            {shortLabel(booking.status, status)}
          </Button>
        )
      })}
    </div>
  )
}
