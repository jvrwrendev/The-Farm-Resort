import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, CalendarCheck2, Clock, Trophy, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PICKLEBALL_SETTINGS } from './mockData'
import { usePickleballCourts } from './usePickleballCourts'
import { formatCurrency } from '@/lib/utils'
import { formatTimeLabel } from './utils'
import { scrollToLandingSection } from '@/lib/scroll'

export function PickleballTeaserSection() {
  const courts = usePickleballCourts()
  const lowestRate = courts.length
    ? Math.min(...courts.map((court) => court.weekdayRate || court.hourlyRate))
    : 0
  const courtCount = courts.length || 3
  const courtNames = courts.map((court) => court.name).join(', ')
  const teaserImage = courts.find((court) => court.imageUrl)?.imageUrl ?? ''

  return (
    <section id="pickleball" className="scroll-mt-28 bg-primary px-4 py-20 text-primary-foreground sm:px-6 lg:py-24">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <motion.button
          type="button"
          onClick={() => scrollToLandingSection('pickleball')}
          aria-label="Scroll to the Pickleball section"
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="group relative block w-full cursor-pointer overflow-hidden rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <img
            src={teaserImage}
            alt="Pickleball court at The Farm"
            className="aspect-[4/3] w-full object-cover"
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = 'none'
            }}
          />
          {!teaserImage && (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-primary/10" />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          <div className="pointer-events-none absolute bottom-4 left-4 rounded-xl border border-white/20 bg-black/40 px-3 py-2 backdrop-blur">
            <p className="text-xs font-semibold text-white">{courtCount} courts · Open daily</p>
            <p className="mt-0.5 text-[11px] text-white/70">
              {courtNames || 'Garden, Center, and Covered'}
            </p>
          </div>
        </motion.button>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Badge className="border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground">
            New at The Farm
          </Badge>
          <h2 className="font-display mt-4 text-3xl font-bold sm:text-4xl lg:text-5xl">
            Pickleball, right on the farm.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-primary-foreground/80 sm:text-lg">
            Stay for the quiet, play for the rally. Our three courts are ready for casual doubles,
            family matches, and friendly tournaments — just steps from the gardens.
          </p>

          <div className="mt-6 flex flex-wrap gap-2 text-xs font-medium">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1.5">
              <Trophy className="h-3.5 w-3.5" /> {courtCount} courts
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1.5">
              <Users className="h-3.5 w-3.5" /> Up to 4 per court
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1.5">
              <Clock className="h-3.5 w-3.5" />
              {formatTimeLabel(PICKLEBALL_SETTINGS.openTime)} – {formatTimeLabel(PICKLEBALL_SETTINGS.closeTime)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1.5">
              From {formatCurrency(lowestRate)} / hour
            </span>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              asChild
              className="rounded-full bg-primary-foreground px-6 text-primary hover:bg-primary-foreground/90"
            >
              <Link to="/pickleball">
                Explore the courts
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="rounded-full border-primary-foreground/40 bg-transparent px-6 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Link to="/pickleball/book">
                <CalendarCheck2 className="h-4 w-4" />
                Book a Court
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
