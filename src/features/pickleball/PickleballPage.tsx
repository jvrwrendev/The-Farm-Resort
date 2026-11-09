import type { ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CalendarCheck2,
  Check,
  CircleDollarSign,
  Clock,
  MapPin,
  ShieldCheck,
  Sparkles,
  Sun,
  Trophy,
  Users,
  Car,
  Droplets,
  Lightbulb,
  Armchair,
  Target,
  Bath,
} from 'lucide-react'
import { PublicLayout } from '@/components/layout/Navbar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PickleballGallery } from './PickleballGallery'
import {
  PICKLEBALL_FACILITIES,
  PICKLEBALL_SETTINGS,
} from './mockData'
import { formatCurrency } from '@/lib/utils'
import picklebg from '@/assets/picklebg.jpeg'
import { listPickleballCourts } from '@/services/pickleballCourt.service'
import { useQuery } from '@tanstack/react-query'
import { formatTimeLabel } from './utils'

const FACILITY_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  court: CalendarCheck2,
  light: Lightbulb,
  seating: Armchair,
  paddle: Target,
  water: Droplets,
  parking: Car,
  restroom: Bath,
  'first-aid': ShieldCheck,
}

const PLAYING_NOTES = [
  'Each court is sized for doubles, with a maximum of four players per reservation.',
  'Bookings are made in one-hour slots, with a maximum of three hours per reservation.',
  'Arrive 10–15 minutes early so you can warm up and settle in before your slot.',
  'Wear non-marking court shoes. Paddles and balls can be rented at the court desk.',
  'Evening sessions are floodlit, so the last slot starts at 8:00 PM.',
]

export default function PickleballPage() {
  const { data: courts = [] } = useQuery({
    queryKey: ['pickleball-courts'],
    queryFn: listPickleballCourts,
  })
  const lowestRate = courts.length ? Math.min(...courts.map((court) => court.hourlyRate)) : 0

  return (
    <PublicLayout>
      <section
        className="relative isolate w-full overflow-hidden scroll-mt-24"
        style={{
          backgroundImage: `url(${picklebg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
        width: '100vw',        minHeight: '100vh',
        }}
        aria-label="Pickleball at The Farm"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/40 to-black/75" />
        <div className="relative mx-auto flex min-h-[620px] max-w-7xl flex-col justify-center px-4 pb-20 pt-36 sm:px-6 sm:pt-44 lg:min-h-[700px] lg:pb-28">
          <div className="max-w-3xl text-white">
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] backdrop-blur"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              New at The Farm
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="font-display mt-5 text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl"
            >
              Rally, relax, repeat.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mt-5 max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg"
            >
              Three pickleball courts, fresh farm air, and a schedule that fits your stay. Gather
              your group, pick a slot, and make the court yours for the hour.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-7 flex flex-wrap gap-2 text-xs font-medium text-white/90"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur">
                <Clock className="h-3.5 w-3.5" /> 7:00 AM – 9:00 PM
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur">
                <Trophy className="h-3.5 w-3.5" /> 3 courts
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur">
                <Users className="h-3.5 w-3.5" /> Up to 4 per court
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur">
                <CircleDollarSign className="h-3.5 w-3.5" /> From {formatCurrency(lowestRate)} / hour
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <Button size="lg" asChild className="rounded-full px-7">
                <Link to="/pickleball/book">
                  <CalendarCheck2 className="h-4 w-4" />
                  Book a Court
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                asChild
                className="rounded-full border-white/40 bg-white/10 px-7 text-white backdrop-blur hover:bg-white/20 hover:text-white"
              >
                <a href="#pickleball-gallery">
                  View the gallery
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="border-b bg-background px-4 py-10 sm:px-6">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { icon: Clock, label: 'Open daily', value: '7 AM – 9 PM' },
            { icon: Trophy, label: 'Playing courts', value: '3 courts' },
            { icon: Users, label: 'Court capacity', value: '4 players / court' },
            { icon: CircleDollarSign, label: 'Hourly rate', value: `From ${formatCurrency(lowestRate)}` },
          ].map((item, index) => {
            const Icon = item.icon
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05, duration: 0.4 }}
                className="flex items-center gap-3 rounded-2xl border bg-card p-4"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-foreground">{item.value}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </section>

      <PickleballGallery />

      <section id="courts" className="scroll-mt-24 bg-background px-4 py-20 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mx-auto mb-12 max-w-2xl text-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Choose Your Court
            </span>
            <h2 className="font-display mt-4 text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
              Three ways to play
            </h2>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              Pick the court that suits your group. Every court includes lighting, seating, and
              access to the resort’s facilities.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courts.map((court, index) => (
              <motion.div
                key={court.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.07, duration: 0.5 }}
              >
                <Card className="flex h-full flex-col overflow-hidden">
                  <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                    {court.imageUrl ? (
                      <img
                        src={court.imageUrl}
                        alt={`${court.name} at The Farm`}
                        className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                        <span className="text-sm">No image</span>
                      </div>
                    )}
                    <Badge className="absolute left-3 top-3" variant={court.isCovered ? 'success' : 'secondary'}>
                      {court.isCovered ? 'Covered' : 'Outdoor'}
                    </Badge>
                  </div>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="font-display text-xl">{court.name}</CardTitle>
                        <p className="mt-1 text-xs font-medium uppercase tracking-wider text-primary">
                          {court.tagline}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-xl font-bold text-foreground">
                          {formatCurrency(court.hourlyRate)}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">per hour</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col">
                    <p className="text-sm leading-relaxed text-muted-foreground">{court.description}</p>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                        <Users className="h-3 w-3" /> Up to {court.maxPlayers}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                        <Sun className="h-3 w-3" /> {court.surface}
                      </span>
                    </div>
                    <ul className="mt-5 space-y-2">
                      {court.amenities.map((amenity) => (
                        <li key={amenity} className="flex items-center gap-2 text-sm text-foreground">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Check className="h-3 w-3" />
                          </span>
                          {amenity}
                        </li>
                      ))}
                    </ul>
                    <Button asChild className="mt-6 w-full rounded-full">
                      <Link to={`/pickleball/book?court=${encodeURIComponent(court.id)}`}>
                        Book {court.name}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="facilities" className="scroll-mt-24 bg-muted/40 px-4 py-20 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mx-auto mb-12 max-w-2xl text-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Court Facilities
            </span>
            <h2 className="font-display mt-4 text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
              Everything for an easy game
            </h2>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              Come as you are. The essentials are already here, from paddles to parking.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PICKLEBALL_FACILITIES.map((facility, index) => {
              const Icon = FACILITY_ICONS[facility.icon] ?? Sparkles
              return (
                <motion.div
                  key={facility.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.04, duration: 0.4 }}
                  className="rounded-2xl border bg-card p-5"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-sm font-semibold text-foreground">{facility.name}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {facility.description}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      <section id="play-info" className="scroll-mt-24 bg-background px-4 py-20 sm:px-6 lg:py-24">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Playing Information
            </span>
            <h2 className="font-display mt-4 text-3xl font-bold text-foreground sm:text-4xl">
              Good to know before you play
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Our courts are designed for relaxed doubles games and friendly matches. Here is what
              to expect when you arrive.
            </p>
            <ul className="mt-7 space-y-4">
              {PLAYING_NOTES.map((note) => (
                <li key={note} className="flex items-start gap-3 text-sm text-foreground">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Check className="h-3 w-3" />
                  </span>
                  {note}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display text-xl">
                  <MapPin className="h-5 w-5 text-primary" />
                  Court rates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {courts.map((court) => (
                  <div
                    key={court.id}
                    className="flex items-center justify-between gap-4 rounded-xl border bg-muted/30 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">{court.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {court.isCovered ? 'Covered' : 'Outdoor'} · up to {court.maxPlayers} players
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-lg font-bold text-primary">
                        {formatCurrency(court.hourlyRate)}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">per hour</p>
                    </div>
                  </div>
                ))}
                <div className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
                  Court fees cover the playing surface, lighting, and access to seating. Paddles and
                  balls may be rented at the court desk.
                </div>
                <div className="flex flex-wrap items-center gap-3 border-t pt-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    {formatTimeLabel(PICKLEBALL_SETTINGS.openTime)} – {formatTimeLabel(PICKLEBALL_SETTINGS.closeTime)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarCheck2 className="h-3.5 w-3.5 text-primary" />
                    Up to {PICKLEBALL_SETTINGS.maxDurationHours} hours per booking
                  </span>
                </div>
                <Button asChild className="w-full rounded-full">
                  <Link to="/pickleball/book">Check availability</Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      <section className="bg-primary px-4 py-16 text-primary-foreground sm:px-6 lg:py-20">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/70">
              Ready when you are
            </p>
            <h2 className="font-display mt-3 text-3xl font-bold sm:text-4xl">
              Make your next rally a farm escape.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-primary-foreground/80 sm:text-base">
              Pick a court, choose your hour, and we’ll take care of the rest. No online payment is
              required to reserve.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              asChild
              className="rounded-full bg-primary-foreground px-6 text-primary hover:bg-primary-foreground/90"
            >
              <Link to="/pickleball/book">Book a Court</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="rounded-full border-primary-foreground/40 bg-transparent px-6 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Link to="/">Back to The Farm</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
