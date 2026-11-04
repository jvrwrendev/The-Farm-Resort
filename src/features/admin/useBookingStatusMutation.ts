import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { updateBookingStatus } from '@/services/admin.service'
import { queryKeys } from '@/lib/queryKeys'
import { formatStatus } from '@/lib/utils'
import type { AdminBooking, AdminBookingStatus } from '@/types'

export function useBookingStatusMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AdminBookingStatus }) =>
      updateBookingStatus(id, status),
    onSuccess: (booking) => {
      toast.success(`${booking.bookingReference} marked ${formatStatus(booking.status)}`)
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] })
      queryClient.invalidateQueries({ queryKey: ['admin-booking'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStats })
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Unable to update booking.')
    },
  })
}

export function nextStatuses(status: AdminBooking['status']): AdminBookingStatus[] {
  switch (status) {
    case 'pending':
      return ['confirmed', 'cancelled']
    case 'confirmed':
      return ['completed', 'cancelled']
    case 'completed':
      return []
    case 'cancelled':
      return []
    default:
      return []
  }
}
