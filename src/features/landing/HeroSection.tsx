import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Calendar, Bed, Tag, CalendarCheck2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HERO_BACKGROUND_URL, ABOUT_IMAGE_URL } from '@/features/landing/mockContent'
import { getAccommodation } from '@/services/accommodation.service'
import { queryKeys } from '@/lib/queryKeys'
import { formatCurrency } from '@/lib/utils'
import { DEFAULT_PRICE_PER_NIGHT } from '@/lib/constants'
import { BRAND_NAME } from '@/lib/brand'

export function HeroSection() {
  const { data: accommodation } = useQuery({
    queryKey: queryKeys.accommodation,
    queryFn: getAccommodation,
  })
  const price = accommodation?.pricePerNight ?? DEFAULT_PRICE_PER_NIGHT

  return (
    <section
      id="home"
      className="relative isolate w-full overflow-hidden scroll-mt-24"
      style={{
        backgroundImage: `url(${HERO_BACKGROUND_URL})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
      }}
      aria-label={`${BRAND_NAME} hero`}
    >
      {/* Subtle dark overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/70" />

      {/* Added mt-16 sm:mt-20 here to add top margin to the hero content */}
      <div className="relative mx-auto flex min-h-[640px] max-w-7xl flex-col justify-center px-4 pt-40 pb-20 mt-16 sm:mt-20 sm:px-6 lg:min-h-[720px] lg:pt-48 lg:pb-28">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-12">
          {/* Left column: copy + CTAs */}
          <div className="lg:col-span-7 text-white">
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] backdrop-blur"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              Welcome to {BRAND_NAME}
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="font-display mt-5 text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl"
            >
              The entire resort, exclusively yours
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mt-5 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg"
            >
              One exclusive accommodation, one group at a time. Check availability and reserve your
              private escape online.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-6 inline-flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 backdrop-blur"
            >
              <span className="text-sm font-medium text-white/85">
                Exclusive Resort Accommodation
              </span>
              <span className="font-display text-2xl font-bold text-white">{formatCurrency(price)}</span>
              <span className="text-sm text-white/75">/ night</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <Button size="lg" asChild className="rounded-full px-7">
                <Link to="/book">
                  <Calendar className="h-4 w-4" />
                  Book Your Stay
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                asChild
                className="rounded-full border-white/40 bg-white/10 px-7 text-white backdrop-blur hover:bg-white/20 hover:text-white"
              >
                <a href="#rooms">View Accommodation</a>
              </Button>
            </motion.div>
          </div>

          {/* Right column: floating info cards */}
          <div className="hidden lg:col-span-5 lg:flex lg:flex-col lg:items-end lg:gap-4">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="glass-dark rounded-2xl px-4 py-3 flex items-center gap-3"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-primary">
                <Bed className="h-4 w-4" />
              </span>
              <div className="text-white">
                <p className="text-sm font-semibold leading-tight">Exclusive Accommodation</p>
                <p className="text-xs text-white/75">The whole resort, one group</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="glass-dark rounded-2xl px-4 py-3 flex items-center gap-3"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-primary">
                <Tag className="h-4 w-4" />
              </span>
              <div className="text-white">
                <p className="text-sm font-semibold leading-tight">{formatCurrency(price)} / night</p>
                <p className="text-xs text-white/75">Transparent, flat rate</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="glass-dark rounded-2xl px-4 py-3 flex items-center gap-3"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-primary">
                <CalendarCheck2 className="h-4 w-4" />
              </span>
              <div className="text-white">
                <p className="text-sm font-semibold leading-tight">Easy Booking</p>
                <p className="text-xs text-white/75">Reserve online in minutes</p>
              </div>
            </motion.div>
          </div>

          {/* Mobile chips (horizontal) */}
          <div className="flex gap-3 overflow-x-auto pb-1 lg:hidden">
            <div className="glass-dark rounded-2xl px-4 py-3 flex items-center gap-3 shrink-0">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-primary">
                <Bed className="h-4 w-4" />
              </span>
              <p className="text-sm font-semibold text-white">Exclusive Accommodation</p>
            </div>
            <div className="glass-dark rounded-2xl px-4 py-3 flex items-center gap-3 shrink-0">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-primary">
                <Tag className="h-4 w-4" />
              </span>
              <p className="text-sm font-semibold text-white">Best Price</p>
            </div>
            <div className="glass-dark rounded-2xl px-4 py-3 flex items-center gap-3 shrink-0">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-primary">
                <CalendarCheck2 className="h-4 w-4" />
              </span>
              <p className="text-sm font-semibold text-white">Easy Booking</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export function AboutSection() {
  const highlights = [
    {
      title: 'A relaxing, premium atmosphere',
      body: 'Wide-open spaces, gentle breeze, and clean air — The Farm is built for slow mornings and easy evenings.',
    },
    {
      title: 'Surrounded by nature',
      body: 'Lush gardens, tropical greenery, and a quiet neighborhood that lets you fully disconnect from the city.',
    },
    {
      title: 'Made for memorable stays',
      body: 'Whether it is a family reunion, a team retreat, or a private celebration, our team helps make every moment effortless.',
    },
  ]

  return (
    <section id="about" className="bg-background py-20 px-4 sm:px-6 lg:py-24">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-muted sm:aspect-[5/4] lg:aspect-[4/5]"
        >
          <img
            src={ABOUT_IMAGE_URL}
            alt="The Farm resort exterior"
            className="h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-2xl" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            About The Farm
          </span>
          <h2 className="font-display mt-4 text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
            A private farm resort, made for gathering.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Tucked away in a quiet, scenic part of Antipolo, The Farm is a private
            resort where families, friends, and teams come together to slow down.
            Spacious villas, lush gardens, and warm hospitality — every stay is
            reserved for one group at a time, so the entire property is yours.
          </p>

          <ul className="mt-8 space-y-5">
            {highlights.map((item) => (
              <li key={item.title} className="flex items-start gap-4">
                <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground sm:text-base">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  )
}