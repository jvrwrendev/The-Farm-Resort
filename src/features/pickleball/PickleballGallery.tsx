import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, ImageIcon, X } from 'lucide-react'
import { listActivePickleballImages } from '@/services/pickleballImage.service'
import type { PickleballImage } from '@/services/pickleballImage.service'
import { cn } from '@/lib/utils'

type TileSize = 'cover' | 'tall' | 'wide' | 'square'

const TILE_CLASS: Record<TileSize, string> = {
  cover: 'col-span-2 row-span-2 aspect-square md:aspect-auto md:col-span-2 md:row-span-2',
  tall: 'col-span-1 row-span-2 aspect-[1/2] md:aspect-auto md:row-span-2',
  wide: 'col-span-2 row-span-1 aspect-[2/1] md:aspect-auto md:col-span-2 md:row-span-1',
  square: 'col-span-1 row-span-1 aspect-square',
}

function tileSizeFor(index: number, total: number): TileSize {
  if (index === 0) return 'cover'
  const remainder = total - 1
  if (remainder <= 0) return 'square'
  const position = index % remainder
  if (position === 1) return 'tall'
  if (position === 3) return 'wide'
  return 'square'
}

export function PickleballGallery() {
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [images, setImages] = useState<PickleballImage[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    listActivePickleballImages()
      .then(setImages)
      .catch(() => setImages([]))
      .finally(() => setLoading(false))
  }, [])
  const gallery = images.map((img) => ({
    id: img.id,
    src: img.url,
    alt: img.description || img.name,
    title: img.name,
    category: 'Managed',
  }))

  useEffect(() => {
    if (lightbox === null) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightbox(null)
      if (event.key === 'ArrowLeft') {
        setLightbox((current) =>
          current === null ? null : (current - 1 + gallery.length) % gallery.length,
        )
      }
      if (event.key === 'ArrowRight') {
        setLightbox((current) => (current === null ? null : (current + 1) % gallery.length))
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [lightbox, gallery.length])

  return (
    <section id="pickleball-gallery" className="scroll-mt-24 bg-muted/40 px-4 py-20 sm:px-6 lg:py-24">
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
            Court Gallery
          </span>
          <h2 className="font-display mt-4 text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
            Step onto the court
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Explore the playing surfaces, the garden setting, and the little details that make a
            friendly rally feel like a proper occasion.
          </p>
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <ImageIcon className="h-3.5 w-3.5" />
            {gallery.length} photos · click any image to enlarge
          </p>
        </motion.div>

        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading gallery…</div>
        ) : gallery.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
            No pickleball images uploaded yet.
          </div>
        ) : (
        <div className="grid auto-rows-[180px] grid-cols-2 gap-3 md:auto-rows-[200px] md:grid-cols-3 lg:auto-rows-[220px] lg:grid-cols-4">
          {gallery.map((item, index) => (
            <motion.button
              key={item.id}
              type="button"
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ delay: index * 0.04, duration: 0.4 }}
              onClick={() => setLightbox(index)}
              aria-label={`Open photo: ${item.title}`}
              className={cn(
                'group relative overflow-hidden rounded-xl bg-muted text-left ring-1 ring-black/5 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                TILE_CLASS[tileSizeFor(index, gallery.length)],
              )}
            >
              <img
                src={item.src}
                alt={item.alt}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading={index < 2 ? 'eager' : 'lazy'}
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="absolute inset-x-0 bottom-0 translate-y-2 px-3 pb-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                <p className="text-xs font-semibold text-white drop-shadow-sm">{item.title}</p>
                <p className="mt-0.5 text-[10px] uppercase tracking-wider text-white/75">
                  {item.category}
                </p>
              </div>
              {index === 0 && (
                <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                  Featured
                </span>
              )}
            </motion.button>
          ))}
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Pickleball photo preview"
            onClick={() => setLightbox(null)}
          >
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                setLightbox(null)
              }}
              aria-label="Close photo preview"
              className="absolute right-4 top-4 rounded-full p-2 text-white transition-colors hover:bg-white/10"
            >
              <X className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                setLightbox((lightbox - 1 + gallery.length) % gallery.length)
              }}
              aria-label="Previous photo"
              className="absolute left-2 rounded-full p-2 text-white transition-colors hover:bg-white/10 sm:left-4"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
            <motion.figure
              key={lightbox}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="max-w-6xl"
              onClick={(event) => event.stopPropagation()}
            >
              <img
                src={gallery[lightbox].src}
                alt={gallery[lightbox].alt}
                className="max-h-[78vh] w-auto rounded-lg object-contain"
              />
              <figcaption className="mx-auto mt-3 max-w-2xl text-center text-white">
                <p className="text-sm font-semibold">{gallery[lightbox].title}</p>
                <p className="mt-0.5 text-xs text-white/65">{gallery[lightbox].category}</p>
              </figcaption>
            </motion.figure>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                setLightbox((lightbox + 1) % gallery.length)
              }}
              aria-label="Next photo"
              className="absolute right-2 rounded-full p-2 text-white transition-colors hover:bg-white/10 sm:right-4"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              {lightbox + 1} / {gallery.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
