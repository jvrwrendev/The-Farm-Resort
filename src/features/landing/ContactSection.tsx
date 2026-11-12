import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { MapPin, Mail, Phone, Navigation } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getSettings } from '@/services/settings.service'
import { queryKeys } from '@/lib/queryKeys'
import { BRAND_NAME } from '@/lib/brand'

export function ContactSection() {
  const { data: settings } = useQuery({
    queryKey: queryKeys.resortSettings,
    queryFn: getSettings,
  })

  const resortName = settings?.resortName || BRAND_NAME
  const address = settings?.address || 'Brgy. San Isidro, Antipolo City'
  const phone = settings?.phone || '+63 912 345 6789'
  const email = settings?.email || 'stay@thefarm.ph'

  // Default to The Farm Resort's exact location when no coordinates are configured.
  const DEFAULT_LAT = 7.971968
  const DEFAULT_LNG = 125.184258
  const hasCoords = settings?.latitude != null && settings?.longitude != null
  const lat = hasCoords ? settings!.latitude! : DEFAULT_LAT
  const lng = hasCoords ? settings!.longitude! : DEFAULT_LNG
  const mapQuery = `${lat},${lng}`
  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`
  const directionsHref = 'https://www.google.com/maps/place/The+Farm+Resort/@7.9729862,125.1713928,2292m/data=!3m1!1e3!4m6!3m5!1s0x32ff1d005aecdfaf:0xa1e12af812782ddd!8m2!3d7.971968!4d125.184258!16s%2Fg%2F11wqz8kn6q!5m1!1e2?entry=ttu&g_ep=EgoyMDI2MTEwOS4wIKXMDSoASAFQAw%3D%3D'

  return (
    <section id="contact" className="scroll-mt-28 bg-muted/40 px-4 py-20 sm:px-6 lg:py-24">
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
            Contact & Location
          </span>
          <h2 className="font-display mt-4 text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
            Find us at {resortName}
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            We'd love to welcome you. Reach out or get directions below.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-stretch">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            <div className="flex items-start gap-3 rounded-2xl border bg-card p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <MapPin className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Address</p>
                <p className="mt-1 font-medium text-foreground">{address}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border bg-card p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Phone className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Phone</p>
                <a href={`tel:${phone.replace(/\s/g, '')}`} className="mt-1 block font-medium text-foreground hover:text-primary">
                  {phone}
                </a>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border bg-card p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Mail className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</p>
                <a href={`mailto:${email}`} className="mt-1 block font-medium text-foreground hover:text-primary">
                  {email}
                </a>
              </div>
            </div>
            <Button asChild className="rounded-full px-6">
              <a href={directionsHref} target="_blank" rel="noreferrer">
                <Navigation className="h-4 w-4" /> Get directions
              </a>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="overflow-hidden rounded-2xl border bg-card shadow-sm"
          >
            <iframe
              title={`Map of ${resortName}`}
              src={mapSrc}
              className="h-[360px] w-full border-0 lg:h-full lg:min-h-[420px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </motion.div>
        </div>
      </div>
    </section>
  )
}