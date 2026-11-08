import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { addMonths, format, parseISO, subMonths } from 'date-fns'
import { BedDouble, ChevronLeft, ChevronRight, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeading } from '@/features/admin/components'
import { AccommodationCalendarPanel } from '@/features/admin/AccommodationCalendarPanel'
import {
  CALENDAR_STATUS_DOT,
  CALENDAR_STATUS_LABELS,
  CALENDAR_STATUS_ORDER,
  type CalendarStatus,
} from '@/features/admin/calendarStatus'
import { PickleballCalendarPanel } from '@/features/pickleball/admin/PickleballCalendarPanel'
import { getBookings } from '@/services/admin.service'
import { queryKeys } from '@/lib/queryKeys'
import { cn } from '@/lib/utils'

type CalendarTab = 'accommodation' | 'pickleball'

export default function AdminCalendarPage() {
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<CalendarTab>(() =>
    searchParams.get('tab') === 'pickleball' ? 'pickleball' : 'accommodation',
  )
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [visible, setVisible] = useState<Record<CalendarStatus, boolean>>({
    pending: true,
    confirmed: true,
    completed: true,
    cancelled: true,
  })

  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam === 'pickleball' || tabParam === 'accommodation') {
      setActiveTab(tabParam)
    }

    const dateParam = searchParams.get('date')
    if (!dateParam) return
    const parsed = parseISO(dateParam)
    if (Number.isNaN(parsed.getTime())) return
    setSelectedDate(parsed)
    setCurrentMonth(parsed)
  }, [searchParams])

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: queryKeys.adminBookings({ scope: 'calendar' }),
    queryFn: () => getBookings({}),
  })

  const toggleStatus = (status: CalendarStatus) =>
    setVisible((prev) => ({ ...prev, [status]: !prev[status] }))

  return (
    <div className="space-y-6">
      <PageHeading
        title="Calendar"
        description="Accommodation and pickleball reservations at a glance."
      />

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as CalendarTab)}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-2 sm:inline-flex sm:w-auto">
          <TabsTrigger value="accommodation" className="gap-2">
            <BedDouble className="h-4 w-4" />
            Accommodation
          </TabsTrigger>
          <TabsTrigger value="pickleball" className="gap-2">
            <Trophy className="h-4 w-4" />
            Pickleball
          </TabsTrigger>
        </TabsList>

        <Card>
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Previous month"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-[10rem] text-center">
                  <p className="font-display text-lg font-semibold">
                    {format(currentMonth, 'MMMM yyyy')}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Next month"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(new Date())}
                >
                  Today
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {CALENDAR_STATUS_ORDER.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => toggleStatus(status)}
                    aria-pressed={visible[status]}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                      visible[status]
                        ? 'border-border bg-card text-foreground'
                        : 'border-border/60 bg-muted/40 text-muted-foreground line-through',
                    )}
                  >
                    <span className={cn('h-2 w-2 rounded-full', CALENDAR_STATUS_DOT[status])} />
                    {CALENDAR_STATUS_LABELS[status]}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <TabsContent value="accommodation" className="mt-0">
          <AccommodationCalendarPanel
            bookings={bookings}
            isLoading={isLoading}
            currentMonth={currentMonth}
            selectedDate={selectedDate}
            visible={visible}
            onSelectDate={setSelectedDate}
          />
        </TabsContent>

        <TabsContent value="pickleball" className="mt-0">
          <PickleballCalendarPanel
            currentMonth={currentMonth}
            selectedDate={selectedDate}
            visible={visible}
            onSelectDate={setSelectedDate}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
