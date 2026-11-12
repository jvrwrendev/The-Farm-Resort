import { Link, useLocation } from 'react-router-dom'
import { ChevronDown, CircleDot, Gauge, Menu, Trophy, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { useAuth } from '@/features/auth/AuthProvider'
import { BRAND_NAME, BRAND_LOGO_URL, BRAND_LOGO_ALT } from '@/lib/brand'
import { cn } from '@/lib/utils'

type NavItem =
  | { type: 'link'; href: string; label: string; sectionId: string }
  | { type: 'activities'; label: string }

const navItems: NavItem[] = [
  { type: 'link', href: '/#home', label: 'Home', sectionId: 'home' },
  { type: 'link', href: '/#about', label: 'About', sectionId: 'about' },
  { type: 'link', href: '/#rooms', label: 'Accommodation', sectionId: 'rooms' },
  { type: 'activities', label: 'Activities' },
  { type: 'link', href: '/#amenities', label: 'Amenities', sectionId: 'amenities' },
  { type: 'link', href: '/#gallery', label: 'Gallery', sectionId: 'gallery' },
  { type: 'link', href: '/#calendar', label: 'Availability', sectionId: 'calendar' },
  { type: 'link', href: '/#booking-search', label: 'Find Your Reservation', sectionId: 'booking-search' },
  { type: 'link', href: '/#policies', label: 'Policies', sectionId: 'policies' },
  { type: 'link', href: '/#contact', label: 'Contact', sectionId: 'contact' },
]

const activityLinks = [
  { route: '/pickleball', sectionId: 'pickleball', label: 'Pickleball', icon: Trophy },
  { route: '/billiards/book', sectionId: 'billiards', label: 'Billiards', icon: CircleDot },
  { route: '/atv/book', sectionId: 'atv', label: 'ATV Rental', icon: Gauge },
]

const observedSectionIds = [
  'home',
  'about',
  'rooms',
  'pickleball',
  'billiards',
  'atv',
  'amenities',
  'gallery',
  'calendar',
  'booking-search',
  'policies',
  'contact',
]

const activitySectionIds = new Set(['pickleball', 'billiards', 'atv'])

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileActivitiesOpen, setMobileActivitiesOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('home')
  const intersectionRatios = useRef(new Map<string, number>())
  const location = useLocation()
  const isLanding = location.pathname === '/'
  const isPickleballPage = location.pathname.startsWith('/pickleball')
  const isActivityPage =
    location.pathname.startsWith('/billiards') ||
    location.pathname.startsWith('/atv') ||
    location.pathname.startsWith('/activity')
  const showPublicNav = isLanding || isPickleballPage || isActivityPage

  const scrollToSection = useCallback(
    (sectionId: string) => {
      if (!isLanding) return
      const target = document.getElementById(sectionId)
      if (!target) return

      setActiveSection(sectionId)
      setMobileOpen(false)
      setMobileActivitiesOpen(false)

      const top = target.getBoundingClientRect().top + window.scrollY - 96
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
      window.history.replaceState(
        null,
        '',
        `${location.pathname}${location.search}#${sectionId}`,
      )
    },
    [isLanding, location.pathname, location.search],
  )

  useEffect(() => {
    if (!isLanding) return

    const elements = observedSectionIds
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => Boolean(element))

    intersectionRatios.current.clear()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          intersectionRatios.current.set(
            entry.target.id,
            entry.isIntersecting ? entry.intersectionRatio : 0,
          )
        }

        const visible = elements
          .map((element) => ({
            id: element.id,
            ratio: intersectionRatios.current.get(element.id) ?? 0,
            distance: Math.abs(element.getBoundingClientRect().top - 96),
          }))
          .filter((section) => section.ratio > 0)
          .sort((a, b) => b.ratio - a.ratio || a.distance - b.distance)

        if (visible[0]) setActiveSection(visible[0].id)
      },
      {
        rootMargin: '-88px 0px -45% 0px',
        threshold: [0, 0.1, 0.25, 0.5, 0.75],
      },
    )

    for (const element of elements) observer.observe(element)
    return () => observer.disconnect()
  }, [isLanding])

  const activitiesActive = isLanding && activitySectionIds.has(activeSection)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 print:hidden">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-background/70 px-4 py-3 shadow-lg backdrop-blur-xl">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <img src={BRAND_LOGO_URL} alt={BRAND_LOGO_ALT} className="h-8 w-8 shrink-0 rounded-md object-cover" />
            <span className="hidden font-display text-lg font-semibold tracking-tight sm:inline">
              {BRAND_NAME}
            </span>
          </Link>

          {showPublicNav && (
            <div className="hidden lg:flex items-center gap-1.5 xl:gap-6">
              {navItems.map((item) =>
                item.type === 'activities' ? (
                  <DropdownMenu key={item.label}>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          'group relative inline-flex items-center gap-1 whitespace-nowrap text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                          activitiesActive &&
                            'text-foreground after:absolute after:-bottom-2 after:left-0 after:h-0.5 after:w-full after:rounded-full after:bg-primary after:content-["_"]',
                        )}
                      >
                        {item.label}
                        <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="min-w-48">
                      {activityLinks.map((activity) => (
                        isLanding ? (
                          <DropdownMenuItem
                            key={activity.sectionId}
                            className={cn(
                              activeSection === activity.sectionId &&
                                'bg-accent text-accent-foreground',
                            )}
                            onSelect={() => scrollToSection(activity.sectionId)}
                          >
                            <activity.icon className="h-4 w-4 text-primary" />
                            {activity.label}
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem key={activity.sectionId} asChild>
                            <Link to={activity.route}>
                              <activity.icon className="h-4 w-4 text-primary" />
                              {activity.label}
                            </Link>
                          </DropdownMenuItem>
                        )
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <a
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'relative whitespace-nowrap text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                      isLanding &&
                        activeSection === item.sectionId &&
                        'text-foreground after:absolute after:-bottom-2 after:left-0 after:h-0.5 after:w-full after:rounded-full after:bg-primary after:content-["_"]',
                    )}
                    aria-current={
                      isLanding && activeSection === item.sectionId ? 'location' : undefined
                    }
                    onClick={(event) => {
                      if (!isLanding) return
                      event.preventDefault()
                      scrollToSection(item.sectionId)
                    }}
                  >
                    {item.label}
                  </a>
                ),
              )}
            </div>
          )}

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {showPublicNav && (
              <button
                className="lg:hidden p-2"
                  onClick={() => {
                    setMobileOpen(!mobileOpen)
                    if (mobileOpen) setMobileActivitiesOpen(false)
                  }}
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && showPublicNav && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-2 rounded-2xl border bg-background/95 backdrop-blur-xl p-4 lg:hidden"
            >
              {navItems.map((item) =>
                item.type === 'activities' ? (
                  <div key={item.label}>
                    <button
                      type="button"
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm font-medium transition-colors',
                        activitiesActive && 'bg-primary/10 text-primary',
                      )}
                      aria-expanded={mobileActivitiesOpen}
                      aria-controls="mobile-activities-menu"
                      onClick={() => setMobileActivitiesOpen((open) => !open)}
                    >
                      {item.label}
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          mobileActivitiesOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {mobileActivitiesOpen && (
                        <motion.div
                          id="mobile-activities-menu"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-l border-border pl-3"
                        >
                          {activityLinks.map((activity) => (
                            isLanding ? (
                              <button
                                key={activity.sectionId}
                                type="button"
                                className={cn(
                                  'flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm text-muted-foreground transition-colors hover:text-foreground',
                                  activeSection === activity.sectionId &&
                                    'bg-primary/10 text-primary',
                                )}
                                aria-current={
                                  activeSection === activity.sectionId ? 'location' : undefined
                                }
                                onClick={() => scrollToSection(activity.sectionId)}
                              >
                                <activity.icon className="h-4 w-4 text-primary" />
                                {activity.label}
                              </button>
                            ) : (
                              <Link
                                key={activity.sectionId}
                                to={activity.route}
                                className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                                onClick={() => {
                                  setMobileOpen(false)
                                  setMobileActivitiesOpen(false)
                                }}
                              >
                                <activity.icon className="h-4 w-4 text-primary" />
                                {activity.label}
                              </Link>
                            )
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <a
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'block rounded-lg px-2 py-2 text-sm font-medium transition-colors',
                      isLanding &&
                        activeSection === item.sectionId &&
                        'bg-primary/10 text-primary',
                    )}
                    aria-current={
                      isLanding && activeSection === item.sectionId ? 'location' : undefined
                    }
                    onClick={(event) => {
                      if (isLanding) {
                        event.preventDefault()
                        scrollToSection(item.sectionId)
                      } else {
                        setMobileOpen(false)
                      }
                    }}
                  >
                    {item.label}
                  </a>
                ),
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  )
}

export function Footer() {
  const { user, isAdmin } = useAuth()
  return (
    <footer id="contact" className="scroll-mt-28 border-t bg-muted/30 print:hidden">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <img src={BRAND_LOGO_URL} alt={BRAND_LOGO_ALT} className="h-6 w-6 rounded-md object-cover" />
              <span className="font-display font-semibold">{BRAND_NAME}</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Your private farm retreat awaits. Exclusive booking for unforgettable memories.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Quick Links</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="/#home" className="hover:text-foreground transition-colors">Home</a></li>
              <li><a href="/#rooms" className="hover:text-foreground transition-colors">Accommodation</a></li>
              <li><Link to="/pickleball" className="hover:text-foreground transition-colors">Pickleball</Link></li>
              <li><a href="/#gallery" className="hover:text-foreground transition-colors">Gallery</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Contact</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>+63 912 345 6789</li>
              <li>Brgy. San Isidro, Antipolo City</li>
            </ul>
          </div>
        </div>
        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t pt-8 text-sm text-muted-foreground sm:flex-row">
          <span>&copy; {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.</span>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              to={user ? '/admin/dashboard' : '/admin/login'}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {user ? (isAdmin ? 'Admin Dashboard' : 'Dashboard') : 'Admin Sign In'}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
