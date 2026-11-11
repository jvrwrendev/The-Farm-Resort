import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { updatePickleballBookingStatus } from '@/services/pickleballBooking.service'
import type { PickleballBooking, PickleballBookingStatus } from './types'
import { formatStatus } from '@/lib/utils'

export function usePickleballStatusMutation(
  onSuccess?: (booking: PickleballBooking) => void,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      reference,
      status,
    }: {
      reference: string
      status: PickleballBookingStatus
    }) => updatePickleballBookingStatus(reference, status),
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: ['pickleball'] })
      toast.success(`${booking.reference} marked ${formatStatus(booking.status).toLowerCase()}.`)
      onSuccess?.(booking)
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Unable to update this reservation.')
    },
  })
}
