import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowRight, CalendarCheck2, CircleDot, Clock, Gauge, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { listActivities } from '@/services/activity.service'
import type { Activity, ActivityType } from './types'
import { formatCurrency } from '@/lib/utils'
import { formatTimeLabel } from './utils'

function ActivityVisual({ activity, accent }: { activity?: Activity; accent: string }) {
  if (activity?.imageUrl) {
    return (
      <img
        src={activity.imageUrl}
        alt={activity.name}
        className="aspect-[4/3] w-full object-cover"
        loading="lazy"
      />
    )
  }
  return (
    <div
      className={`flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-br ${accent}`}
    >
      {activity?.type === 'atv' ? (
        <Gauge className="h-20 w-20 text-white/70" />
      ) : (
        <CircleDot className="h-20 w-20 text-white/70" />
      )}
    </div>
  )
}

function ActivitySection({
  type,
  eyebrow,
  title,
  fallbackTitle,
  fallbackDescription,
  reverse,
  accent,
}: {
  type: ActivityType
  eyebrow: string
  title: string
  fallbackTitle: string
  fallbackDescription: string
  reverse?: boolean
  accent: string
}) {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['activities', type],
    queryFn: () => listActivities(type),
  })

  const activity = activities[0]
  const name = activity?.name ?? fallbackTitle
  const description = activity?.description || fallbackDescription
  const rate = activity?.weekdayRate ?? activity?.hourlyRate ?? 0

  return (
    <section className="scroll-mt-24 px-4 py-20 sm:px-6 lg:py-24">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <motion.div
          initial={{ opacity: 0, x: reverse ? 20 : -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className={`relative overflow-hidden rounded-2xl ${reverse ? 'lg:order-2' : ''}`}
        >
          <ActivityVisual activity={activity} accent={accent} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 rounded-xl border border-white/20 bg-black/40 px-3 py-2 backdrop-blur">
            <p className="text-xs font-semibold text-white">
              {activity ? name : isLoading ? 'Loading…' : 'Available soon'}
            </p>
            <p className="mt-0.5 text-[11px] text-white/70">
              {activity
                ? `${formatTimeLabel(activity.openTime)} – ${formatTimeLabel(activity.closeTime)}`
                : 'Ask the front desk for schedules'}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: reverse ? -20 : 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className={reverse ? 'lg:order-1' : ''}
        >
          <Badge variant="secondary">{eyebrow}</Badge>
          <h2 className="font-display mt-4 text-3xl font-bold sm:text-4xl lg:text-5xl">{title}</h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {description}
          </p>

          <div className="mt-6 flex flex-wrap gap-2 text-xs font-medium">
            {activity && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5">
                <Users className="h-3.5 w-3.5 text-primary" /> Up to {activity.maxPlayers}
              </span>
            )}
            {activity && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" />
                {formatTimeLabel(activity.openTime)} – {formatTimeLabel(activity.closeTime)}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5">
              From {formatCurrency(rate)} / hour
            </span>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild className="rounded-full px-6">
              <Link to={`/activity/book/${type}`}>
                <CalendarCheck2 className="h-4 w-4" />
                Book {type === 'atv' ? 'an ATV' : 'a Table'}
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="rounded-full px-6">
              <Link to={`/activity/book/${type}`}>
                View availability
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          {!isLoading && !activity && (
            <p className="mt-4 text-xs text-muted-foreground">
              Online booking is not open yet. Please contact the front desk.
            </p>
          )}
        </motion.div>
      </div>
    </section>
  )
}

export function ActivityTeaserSections() {
  return (
    <>
      <ActivitySection
        type="billiards"
        eyebrow="Indoor leisure"
        title="Billiards at the clubhouse."
        fallbackTitle="Billiards Table"
        fallbackDescription="Rack up a friendly game in the clubhouse. Cues, balls, and a relaxed table are ready for guests of every skill level."
        accent="from-emerald-700 to-emerald-900"
      />
      <ActivitySection
        type="atv"
        eyebrow="Farm adventure"
        title="Take the trails by ATV."
        fallbackTitle="ATV Rental"
        fallbackDescription="Ride the farm trails with a guided ATV rental — a lively way to see the fields, gardens, and countryside around the resort."
        reverse
        accent="from-amber-700 to-orange-900"
      />
    </>
  )
}
