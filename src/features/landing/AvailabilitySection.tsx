import { useState } from 'react'
import { endOfDay, format, startOfMonth } from 'date-fns'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BedDouble, CalendarDays, Sparkles, Trophy } from 'lucide-react'
import { BookingCalendar, AvailabilityDetails } from '@/components/calendar/BookingCalendar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ActivityAvailabilityCalendar } from '@/features/activities/ActivityAvailabilityCalendar'
import { PickleballAvailabilityCalendar } from '@/features/pickleball/PickleballAvailabilityCalendar'
import { getCalendarEvents } from '@/services/resort.service'
import type { CalendarEvent } from '@/types'

export function AvailabilitySection() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | undefined>()

  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const monthEnd = format(endOfDay(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)), 'yyyy-MM-dd')

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
    <section id="calendar" className="scroll-mt-28 bg-secondary/40 px-4 py-20 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto mb-8 max-w-2xl text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Availability
          </span>
          <h2 className="font-display mt-4 text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
            Availability Calendar
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Check exclusive resort dates and activity schedules before you book.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Tabs defaultValue="exclusive" className="w-full">
            <TabsList className="mx-auto grid h-auto w-full max-w-xl grid-cols-3 p-1">
              <TabsTrigger
                value="exclusive"
                className="flex-col gap-1 whitespace-normal px-1 py-2 text-center text-[11px] leading-tight sm:flex-row sm:gap-2 sm:px-3 sm:text-sm"
              >
                <BedDouble className="h-4 w-4" />
                Exclusive Booking
              </TabsTrigger>
              <TabsTrigger
                value="other"
                className="flex-col gap-1 whitespace-normal px-1 py-2 text-center text-[11px] leading-tight sm:flex-row sm:gap-2 sm:px-3 sm:text-sm"
              >
                <Sparkles className="h-4 w-4" />
                Other Activities
              </TabsTrigger>
              <TabsTrigger
                value="pickleball"
                className="flex-col gap-1 whitespace-normal px-1 py-2 text-center text-[11px] leading-tight sm:flex-row sm:gap-2 sm:px-3 sm:text-sm"
              >
                <Trophy className="h-4 w-4" />
                Pickleball
              </TabsTrigger>
            </TabsList>

            <TabsContent value="exclusive" className="mt-6">
              <p className="mb-4 text-center text-sm text-muted-foreground">
                Exclusive booking — one client per day. Pick an open date below to start your
                reservation.
              </p>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="lg:sticky lg:top-24 lg:self-start">
                  <BookingCalendar
                    events={events}
                    onDateSelect={handleDateSelect}
                    selectedDate={selectedDate}
                    showGuestInfo={false}
                  />
                </div>
                <div className="lg:sticky lg:top-24 lg:self-start">
                  {selectedDate ? (
                    <AvailabilityDetails
                      selectedDate={selectedDate}
                      selectedEvent={selectedEvent}
                      onClear={() => {
                        setSelectedDate(null)
                        setSelectedEvent(undefined)
                      }}
                    />
                  ) : (
                    <div className="flex h-full min-h-[16rem] flex-col items-center justify-center gap-3 rounded-2xl border bg-card px-6 py-10 text-center">
                      <CalendarDays className="h-8 w-8 text-muted-foreground/60" />
                      <div>
                        <p className="font-medium text-foreground">No date selected</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Select a date on the calendar to view its booking details and availability.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

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
            </TabsContent>

            <TabsContent value="other" className="mt-6">
              <p className="mb-4 text-center text-sm text-muted-foreground">
                Pick a date to see hourly Billiards and ATV availability. Fully booked and reserved
                slots are highlighted.
              </p>
              <ActivityAvailabilityCalendar />
            </TabsContent>

            <TabsContent value="pickleball" className="mt-6">
              <p className="mb-4 text-center text-sm text-muted-foreground">
                Pick a date to see hourly pickleball court availability. Reserved slots are
                highlighted.
              </p>
              <PickleballAvailabilityCalendar />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </section>
  )
}
