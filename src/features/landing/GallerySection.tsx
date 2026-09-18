import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, ImageIcon, Waves, BedDouble, UtensilsCrossed, Wifi, Car, Trees } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getGallery } from '@/services/resort.service'
import { MOCK_GALLERY } from '@/features/landing/mockContent'
import type { GalleryItem } from '@/types'

type TileSize = 'cover' | 'tall' | 'wide' | 'square'

function tileSizeFor(i: number, total: number, isCover: boolean): TileSize {
  if (isCover) return 'cover'
  const remainder = total - 1
  if (remainder <= 0) return 'square'
  const r = i % remainder
  if (r === 0) return 'tall'
  if (r === 3) return 'wide'
  return 'square'
}

const TILE_CLASS: Record<TileSize, string> = {
  cover: 'col-span-2 row-span-2 aspect-square md:aspect-auto md:col-span-2 md:row-span-2',
  tall: 'col-span-1 row-span-2 aspect-[1/2] md:aspect-auto md:row-span-2',
  wide: 'col-span-2 row-span-1 aspect-[2/1] md:aspect-auto md:col-span-2 md:row-span-1',
  square: 'col-span-1 row-span-1 aspect-square',
}

export function GallerySection() {
  const { data: dbGallery } = useQuery({
    queryKey: ['gallery'],
    queryFn: getGallery,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  const gallery: GalleryItem[] = (dbGallery && dbGallery.length > 0 ? dbGallery : MOCK_GALLERY).slice().sort(
    (a, b) => a.sort_order - b.sort_order,
  )

  const [lightbox, setLightbox] = useState<number | null>(null)

  return (
    <section id="gallery" className="bg-muted/40 py-20 px-4 sm:px-6 lg:py-24">
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
            Gallery
          </span>
          <h2 className="font-display mt-4 text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
            A glimpse of your perfect getaway
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Browse moments captured around The Farm — rooms, gardens, gatherings, and golden sunsets.
          </p>
          {gallery.length > 0 && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <ImageIcon className="h-3.5 w-3.5" />
              Showing {gallery.length} photos
            </p>
          )}
        </motion.div>

        {gallery.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
            No photos yet. Add images to <code className="rounded bg-muted px-1.5 py-0.5 text-xs">src/assets/images/</code> to populate the gallery.
          </div>
        ) : (
          <div className="grid auto-rows-[180px] grid-cols-2 gap-3 md:grid-cols-3 md:auto-rows-[200px] lg:grid-cols-4 lg:auto-rows-[220px]">
            {gallery.map((item, i) => {
              const size = tileSizeFor(i, gallery.length, !!item.is_cover)
              return (
                <motion.button
                  key={item.id}
                  type="button"
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ delay: i * 0.04, duration: 0.4 }}
                  onClick={() => setLightbox(i)}
                  aria-label={`Open photo: ${item.alt_text || item.title}`}
                  className={`group relative overflow-hidden rounded-xl bg-muted ring-1 ring-black/5 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${TILE_CLASS[size]}`}
                >
                  <img
                    src={item.image_url}
                    alt={item.alt_text || item.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading={i < 2 ? 'eager' : 'lazy'}
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="absolute inset-x-0 bottom-0 translate-y-2 px-3 pb-3 text-left opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    <p className="text-xs font-semibold text-white drop-shadow-sm">
                      {item.title || item.alt_text || `Photo ${i + 1}`}
                    </p>
                    {item.alt_text && item.title && item.alt_text !== item.title && (
                      <p className="mt-0.5 text-[10px] text-white/85">{item.alt_text}</p>
                    )}
                  </div>
                  {item.is_cover && (
                    <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                      Featured
                    </span>
                  )}
                </motion.button>
              )
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {lightbox !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
            onClick={() => setLightbox(null)}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setLightbox(null)
              }}
              aria-label="Close"
              className="absolute top-4 right-4 text-white p-2 rounded-full hover:bg-white/10"
            >
              <X className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setLightbox((lightbox - 1 + gallery.length) % gallery.length)
              }}
              aria-label="Previous photo"
              className="absolute left-4 text-white p-2 rounded-full hover:bg-white/10"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
            <motion.img
              key={lightbox}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              src={gallery[lightbox]?.image_url}
              alt={gallery[lightbox]?.title}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setLightbox((lightbox + 1) % gallery.length)
              }}
              aria-label="Next photo"
              className="absolute right-4 text-white p-2 rounded-full hover:bg-white/10"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              {lightbox + 1} / {gallery.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

interface AmenityCard {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

const CURATED_AMENITIES: AmenityCard[] = [
  {
    id: 'pool',
    name: 'Swimming Pool',
    description: 'A refreshing private pool, perfect for sunny afternoons.',
    icon: Waves,
  },
  {
    id: 'rooms',
    name: 'Comfortable Rooms',
    description: 'Spacious rooms with fresh linens and cozy beds.',
    icon: BedDouble,
  },
  {
    id: 'restaurant',
    name: 'Restaurant',
    description: 'An open-air dining area for shared meals and celebrations.',
    icon: UtensilsCrossed,
  },
  {
    id: 'wifi',
    name: 'Wi-Fi',
    description: 'Stay connected with complimentary internet access.',
    icon: Wifi,
  },
  {
    id: 'parking',
    name: 'Parking',
    description: 'Secure on-site parking for up to six vehicles.',
    icon: Car,
  },
  {
    id: 'nature',
    name: 'Outdoor / Nature',
    description: 'Lush gardens, gazebos, and quiet corners to unwind.',
    icon: Trees,
  },
]

export function AmenitiesSection() {
  return (
    <section id="amenities" className="bg-background py-20 px-4 sm:px-6 lg:py-24">
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
            Amenities
          </span>
          <h2 className="font-display mt-4 text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
            Everything you need for a perfect stay
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Designed for comfort, relaxation, and effortless gatherings.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CURATED_AMENITIES.map((amenity, i) => {
            const Icon = amenity.icon
            return (
              <motion.div
                key={amenity.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.5 }}
                className="flex items-start gap-4 rounded-2xl border bg-card p-6"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="font-semibold text-base text-foreground">{amenity.name}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{amenity.description}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export function PoliciesSection() {
  const { data: policies = [] } = useQuery({
    queryKey: ['policies'],
    queryFn: () => import('@/services/resort.service').then((m) => m.getPolicies()),
  })

  return (
    <section id="policies" className="py-20 px-4 bg-muted/30">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Resort Policies</h2>
          <p className="mt-4 text-muted-foreground">Please review before booking</p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {policies.map((policy, i) => (
            <motion.div
              key={policy.id}
              initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="rounded-xl border bg-card p-5"
            >
              <h3 className="font-semibold">{policy.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{policy.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
