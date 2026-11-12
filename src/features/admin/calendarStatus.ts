export const CALENDAR_STATUS_ORDER = ['pending', 'confirmed', 'checked_in', 'completed', 'cancelled'] as const

export type CalendarStatus = (typeof CALENDAR_STATUS_ORDER)[number]

export const CALENDAR_STATUS_PRIORITY: Record<CalendarStatus, number> = {
  confirmed: 0,
  checked_in: 0,
  pending: 1,
  completed: 2,
  cancelled: 3,
}

export const CALENDAR_STATUS_CHIP: Record<CalendarStatus, string> = {
  pending:
    'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800/50',
  confirmed: 'bg-primary/10 text-primary border-primary/20',
  checked_in: 'bg-primary/20 text-primary border-primary/30',
  completed: 'bg-muted text-muted-foreground border-border',
  cancelled:
    'bg-destructive/10 text-destructive border-destructive/20 line-through decoration-destructive/40',
}

export const CALENDAR_STATUS_DOT: Record<CalendarStatus, string> = {
  pending: 'bg-amber-500',
  confirmed: 'bg-primary',
  checked_in: 'bg-primary',
  completed: 'bg-muted-foreground/50',
  cancelled: 'bg-destructive',
}

export const CALENDAR_STATUS_LABELS: Record<CalendarStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  checked_in: 'Checked in',
  completed: 'Completed',
  cancelled: 'Cancelled',
}
