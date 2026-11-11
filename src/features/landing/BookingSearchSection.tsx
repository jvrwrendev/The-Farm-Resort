import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { motion } from 'framer-motion'
import { Search, Loader2, CalendarDays, MapPin, Trophy, CircleDot, Gauge, Inbox } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { searchBookings, type BookingSearchResult } from '@/services/bookingSearch.service'
import { cn } from '@/lib/utils'

const TYPE_META: Record<
  BookingSearchResult['bookingType'],
  { label: string; icon: typeof MapPin; color: string }
> = {
  accommodation: { label: 'Accommodation', icon: MapPin, color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' },
  pickleball: { label: 'Pickleball', icon: Trophy, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
  billiards: { label: 'Billiards', icon: CircleDot, color: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300' },
  atv: { label: 'ATV Rental', icon: Gauge, color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  confirmed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  completed: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
}

function formatDate(date: string): string {
  if (!date) return '—'
  try {
    return format(parseISO(date), 'MMM d, yyyy')
  } catch {
    return date
  }
}

export function BookingSearchSection() {
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')

  const { data: results = [], isFetching, isError } = useQuery({
    queryKey: ['booking-search', query],
    queryFn: () => searchBookings(query),
    enabled: query.trim().length >= 2,
    staleTime: 30_000,
  })

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setQuery(input.trim())
  }

  const hasSearched = query.trim().length >= 2

  return (
    <section id="booking-search" className="scroll-mt-28 bg-secondary/40 px-4 py-20 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto mb-8 max-w-2xl text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <Search className="h-3.5 w-3.5" />
            Track Your Booking
          </span>
          <h2 className="font-display mt-4 text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
            Find Your Reservation
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Enter your booking reference number or full name to look up your resort, pickleball,
            billiards, or ATV reservation.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Card className="overflow-hidden border-border/70 shadow-sm">
            <CardContent className="p-5 sm:p-6">
              <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Booking reference or full name"
                    className="pl-9"
                    aria-label="Search bookings"
                  />
                </div>
                <Button type="submit" className="sm:w-32" disabled={isFetching}>
                  {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Search
                </Button>
              </form>

              <div className="mt-6">
                {!hasSearched ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
                    <Inbox className="h-8 w-8 opacity-40" />
                    <p>Enter at least 2 characters to search your reservations.</p>
                  </div>
                ) : isFetching ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Searching…
                  </div>
                ) : isError ? (
                  <div className="py-8 text-center text-sm text-destructive">
                    Something went wrong while searching. Please try again.
                  </div>
                ) : results.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <Inbox className="h-8 w-8 opacity-40" />
                    <p className="text-sm font-medium text-foreground">No matching booking found.</p>
                    <p className="text-xs text-muted-foreground">
                      Please check your reference number or name and try again.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {results.map((result) => {
                      const meta = TYPE_META[result.bookingType]
                      const Icon = meta.icon
                      return (
                        <Card key={`${result.bookingType}-${result.reference}`} className="border-border/70">
                          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-3">
                              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.color}`}>
                                <Icon className="h-5 w-5" />
                              </span>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-mono text-sm font-semibold text-foreground">
                                    {result.reference}
                                  </p>
                                  <Badge variant="secondary" className={meta.color}>
                                    {meta.label}
                                  </Badge>
                                </div>
                                <p className="mt-0.5 text-sm font-medium text-foreground">
                                  {result.customerName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {result.itemName}
                                  {result.bookingDate && (
                                    <>
                                      {' · '}
                                      <CalendarDays className="inline h-3 w-3" /> {formatDate(result.bookingDate)}
                                    </>
                                  )}
                                </p>
                              </div>
                            </div>
                            <Badge
                              className={cn(
                                'self-start sm:self-center',
                                STATUS_COLORS[result.status.toLowerCase()] ?? 'bg-muted text-muted-foreground',
                              )}
                            >
                              {result.status}
                            </Badge>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}
