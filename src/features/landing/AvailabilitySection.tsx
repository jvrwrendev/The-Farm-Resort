import { useState } from 'react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BookingCalendar, AvailabilityDetails } from '@/components/calendar/BookingCalendar'
import { Button } from '@/components/ui/button'
import { getCalendarEvents } from '@/services/resort.service'
import type { CalendarEvent } from '@/types'

export function AvailabilitySection() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | undefined>()

  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)), 'yyyy-MM-dd')

  const { data: events = [] } = useQuery({
    queryKey: ['calendar-events', monthStart, monthEnd],
    queryFn: () => getCalendarEvents(monthStart, monthEnd),
  })

  const handleDateSelect = (date: Date, event?: CalendarEvent) => {
    setSelectedDate(date)
    setSelectedEvent(event)
  }

  const isAvailable =
    !!selectedDate &&
    !selectedEvent &&
    selectedDate.getTime() >= new Date(new Date().toDateString()).getTime()

  return (
    <section id="calendar" className="bg-secondary/40 py-20 px-4 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto mb-12 max-w-2xl text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Availability
          </span>
          <h2 className="font-display mt-4 text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
            Availability Calendar
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Exclusive booking — one client per day. Pick an open date below to start your reservation.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <BookingCalendar
            events={events}
            onDateSelect={handleDateSelect}
            selectedDate={selectedDate}
            showGuestInfo={false}
          />

          <AvailabilityDetails
            selectedDate={selectedDate}
            selectedEvent={selectedEvent}
            onClear={() => {
              setSelectedDate(null)
              setSelectedEvent(undefined)
            }}
          />

          {isAvailable && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 flex justify-end"
            >
              <Button asChild className="rounded-full px-6">
                <Link to="/book">Book this date</Link>
              </Button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  )
}
