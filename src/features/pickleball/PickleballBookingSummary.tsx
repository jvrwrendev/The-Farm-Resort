import type { ReactNode } from 'react'
import { CalendarDays, Clock, MapPin, ShieldCheck, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PickleballCourt } from './types'
import { formatBookingDate, formatTimeRange, getPickleballRate } from './utils'
import { formatCurrency } from '@/lib/utils'

interface PickleballBookingSummaryProps {
  court?: PickleballCourt
  date?: string
  startTime?: string
  endTime?: string
  players?: number
  durationHours: number
  total: number
  action?: ReactNode
  compact?: boolean
}

export function PickleballBookingSummary({
  court,
  date,
  startTime,
  endTime,
  players,
  durationHours,
  total,
  action,
  compact = false,
}: PickleballBookingSummaryProps) {
  const rows = [
    {
      label: 'Court',
      value: court?.name ?? 'Select a court',
      icon: MapPin,
    },
    {
      label: 'Date',
      value: date ? formatBookingDate(date) : 'Select a date',
      icon: CalendarDays,
    },
    {
      label: 'Time',
      value: formatTimeRange(startTime, endTime),
      icon: Clock,
    },
    {
      label: 'Duration',
      value: durationHours > 0 ? `${durationHours} hour${durationHours === 1 ? '' : 's'}` : '—',
      icon: Clock,
    },
    {
      label: 'Players',
      value: players ? `${players} player${players === 1 ? '' : 's'}` : '—',
      icon: Users,
    },
  ]

  return (
    <Card className={compact ? 'border-0 shadow-none' : undefined}>
      <CardHeader className={compact ? 'px-0 pt-0' : undefined}>
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <CalendarDays className="h-5 w-5 text-primary" />
          Booking summary
        </CardTitle>
      </CardHeader>
      <CardContent className={compact ? 'space-y-4 px-0 pb-0' : 'space-y-4'}>
        <dl className="space-y-3">
          {rows.map((row) => {
            const Icon = row.icon
            return (
              <div key={row.label} className="flex items-start justify-between gap-4 text-sm">
                <dt className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" />
                  {row.label}
                </dt>
                <dd className="max-w-[62%] text-right font-medium text-foreground">{row.value}</dd>
              </div>
            )
          })}
        </dl>

        <div className="border-t pt-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Estimated total</p>
              {court && durationHours > 0 && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatCurrency(getPickleballRate(court, date))} × {durationHours} hour
                  {durationHours === 1 ? '' : 's'}
                </p>
              )}
            </div>
            <span className="font-display text-2xl font-bold text-primary">{formatCurrency(total)}</span>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          No payment is taken online. Your reservation is held as pending until our team confirms it.
        </div>

        {action}
      </CardContent>
    </Card>
  )
}
