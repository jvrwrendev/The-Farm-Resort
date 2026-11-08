import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

/**
 * Keeps React Query data fresh when another tab changes the mock
 * pickleball bookings in localStorage.
 */
export function usePickleballStorageSync(): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: ['pickleball'] })
    }

    window.addEventListener('storage', refresh)
    window.addEventListener('pickleball:updated', refresh)

    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('pickleball:updated', refresh)
    }
  }, [queryClient])
}
