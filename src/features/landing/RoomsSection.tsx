import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { BedDouble, Check, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getAccommodation } from '@/services/accommodation.service'
import { queryKeys } from '@/lib/queryKeys'
import { formatCurrency } from '@/lib/utils'
import { DEFAULT_ACCOMMODATION_IMAGES } from '@/lib/images'
import { DEFAULT_MAX_GUESTS, DEFAULT_PRICE_PER_NIGHT } from '@/lib/constants'

export function RoomsSection() {
  const { data: accommodation } = useQuery({
    queryKey: queryKeys.accommodation,
    queryFn: getAccommodation,
  })

  const images =
    accommodation && accommodation.images.length > 0 ? accommodation.images : DEFAULT_ACCOMMODATION_IMAGES
  const [activeImage, setActiveImage] = useState(0)
  const price = accommodation?.pricePerNight ?? DEFAULT_PRICE_PER_NIGHT
  const maxGuests = accommodation?.maxGuests ?? DEFAULT_MAX_GUESTS
  const amenities = accommodation?.amenities ?? []

  return (
    <section id="rooms" className="bg-secondary/40 py-20 px-4 sm:px-6 lg:py-24">
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
            Accommodation
          </span>
          <h2 className="font-display mt-4 text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
            One exclusive accommodation
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            The whole resort is reserved for your group — no shared spaces, no other guests.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-muted shadow-sm">
              <img
                src={images[activeImage]}
                alt={accommodation?.name ?? 'Exclusive Resort Accommodation'}
                className="h-full w-full object-cover"
              />
              <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
                <BedDouble className="h-3.5 w-3.5" />
                Exclusive booking
              </div>
            </div>
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {images.slice(0, 4).map((image, index) => (
                  <button
                    key={image}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    className={`relative aspect-square overflow-hidden rounded-xl border-2 transition-colors ${
                      activeImage === index ? 'border-primary' : 'border-transparent opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
              {accommodation?.name ?? 'Exclusive Resort Accommodation'}
            </h3>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              {accommodation?.description ??
                'A private resort escape for your group, complete with comfortable rooms, open grounds, and full amenities.'}
            </p>

            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground">
              <Users className="h-4 w-4" />
              Up to {maxGuests} guests
            </div>

            {amenities.length > 0 && (
              <ul className="mt-6 grid grid-cols-2 gap-3">
                {amenities.map((amenity) => (
                  <li key={amenity} className="flex items-center gap-2 text-sm text-foreground">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Check className="h-3 w-3" />
                    </span>
                    {amenity}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-8 flex flex-wrap items-end justify-between gap-4 border-t pt-6">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Rate</p>
                <p className="font-display text-3xl font-bold text-foreground">
                  {formatCurrency(price)}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">/ night</span>
                </p>
              </div>
              <Button asChild size="lg" className="rounded-full px-6">
                <Link to="/book">Book Now</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
