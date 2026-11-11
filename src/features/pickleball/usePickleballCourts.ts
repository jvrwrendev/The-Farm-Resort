import { useQuery } from '@tanstack/react-query'
import {
  listAllPickleballCourts,
  listPickleballCourts,
} from '@/services/pickleballCourt.service'
import type { PickleballCourt } from './types'
import { queryKeys } from '@/lib/queryKeys'

/**
 * Courts as configured by the admin in Supabase. All booking, confirmation and
 * calendar screens resolve court details through this hook so ids stay in sync
 * with `pickleball_courts`.
 */
export function usePickleballCourts(includeInactive = false): PickleballCourt[] {
  const { data: courts = [] } = useQuery({
    queryKey: [...queryKeys.pickleballCourts, includeInactive] as const,
    queryFn: includeInactive ? listAllPickleballCourts : listPickleballCourts,
  })
  return courts
}
