import { Link, useLocation } from 'react-router-dom'
import { ChevronDown, Menu, X } from 'lucide-react'
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
import { useQuery } from '@tanstack/react-query'
import { getSettings } from '@/services/settings.service'
import { queryKeys } from '@/lib/queryKeys'

interface NavLink {
  label: string
  href: string
  sectionId: string
  route?: string
}

interface NavGroup {
  label: string
  items: NavLink[]
}

const activityLinks: NavLink[] = [
  { label: 'Pickleball', href: '/#pickleball', sectionId: 'pickleball', route: '/pickleball' },
  { label: 'Billiards', href: '/#billiards', sectionId: 'billiards', route: '/billiards/book' },
  { label: 'ATV Rental', href: '/#atv', sectionId: 'atv', route: '/atv/book' },
]

const navItems: Array<{ type: 'link'; item: NavLink } | { type: 'group'; group: NavGroup }> = [
  { type: 'link', item: { label: 'Home', href: '/#home', sectionId: 'home' } },
  {
    type: 'group',
    group: {
      label: 'Stay',
      items: [
        { label: 'About', href: '/#about', sectionId: 'about' },
        { label: 'Accommodation', href: '/#rooms', sectionId: 'rooms' },
      ],
    },
  },
  { type: 'group', group: { label: 'Activities', items: activityLinks } },
  {
    type: 'group',
    group: {
      label: 'Explore',
      items: [
        { label: 'Amenities', href: '/#amenities', sectionId: 'amenities' },
        { label: 'Gallery', href: '/#gallery', sectionId: 'gallery' },
        { label: 'Availability', href: '/#calendar', sectionId: 'calendar' },
      ],
    },
  },
  { type: 'link', item: { label: 'Reservations', href: '/#booking-search', sectionId: 'booking-search' } },
  { type: 'link', item: { label: 'Contact', href: '/#contact', sectionId: 'contact' } },
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

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState('home')
  const [scrolled, setScrolled] = useState(false)
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
      setOpenGroup(null)

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
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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

  const isGroupActive = (group: NavGroup) =>
    isLanding && group.items.some((item) => item.sectionId === activeSection)

  const handleItemClick = (event: React.MouseEvent, item: NavLink) => {
    if (isLanding && item.sectionId && document.getElementById(item.sectionId)) {
      event.preventDefault()
      scrollToSection(item.sectionId)
      return
    }
    if (!isLanding && item.route) {
      setMobileOpen(false)
      setOpenGroup(null)
    }
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 print:hidden">
      <nav
        className={cn(
          'mx-auto max-w-7xl px-4 transition-all duration-300 ease-out sm:px-6 lg:px-8',
          scrolled ? 'mt-0' : 'mt-4',
        )}
      >
        <div
          className={cn(
            'flex items-center justify-between px-4 transition-all duration-300 ease-out sm:px-5',
            scrolled
              ? 'h-16 rounded-2xl border border-border/70 bg-background/95 shadow-lg shadow-black/5 backdrop-blur-xl'
              : 'h-20 rounded-2xl border border-white/10 bg-background/70 shadow-lg backdrop-blur-xl',
          )}
        >
          <Link to="/" className="group flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10 transition-transform duration-300 group-hover:scale-105">
              <img src={BRAND_LOGO_URL} alt={BRAND_LOGO_ALT} className="h-9 w-9 object-cover" />
            </span>
            <span className="hidden font-display text-lg font-semibold tracking-tight sm:inline">
              {BRAND_NAME}
            </span>
          </Link>

          {showPublicNav && (
            <div className="hidden items-center gap-1 lg:flex">
              {navItems.map((entry) =>
                entry.type === 'link' ? (
                  <a
                    key={entry.item.href}
                    href={entry.item.href}
                    aria-current={
                      isLanding && activeSection === entry.item.sectionId ? 'location' : undefined
                    }
                    onClick={(event) => handleItemClick(event, entry.item)}
                    className={cn(
                      'rounded-full px-3.5 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                      isLanding && activeSection === entry.item.sectionId
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    {entry.item.label}
                  </a>
                ) : (
                  <DropdownMenu key={entry.group.label}>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          'group inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                          isGroupActive(entry.group)
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                      >
                        {entry.group.label}
                        <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      sideOffset={10}
                      className="min-w-56 rounded-xl border-border/60 p-1.5 shadow-lg"
                    >
                      {entry.group.items.map((item) =>
                        isLanding ? (
                          <DropdownMenuItem
                            key={item.sectionId}
                            onSelect={() => scrollToSection(item.sectionId)}
                            className={cn(
                              'flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm',
                              activeSection === item.sectionId && 'bg-primary/10 text-primary',
                            )}
                          >
                            {item.label}
                          </DropdownMenuItem>
                        ) : item.route ? (
                          <DropdownMenuItem key={item.sectionId} asChild>
                            <Link
                              to={item.route}
                              className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm"
                            >
                                {item.label}
                            </Link>
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem key={item.sectionId} asChild>
                            <a
                              href={item.href}
                              className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm"
                            >
                                {item.label}
                            </a>
                          </DropdownMenuItem>
                        ),
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ),
              )}
            </div>
          )}

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {showPublicNav && (
              <button
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
                onClick={() => {
                  setMobileOpen(!mobileOpen)
                  if (mobileOpen) setOpenGroup(null)
                }}
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && showPublicNav && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-border/60 bg-background/95 p-3 shadow-xl backdrop-blur-xl lg:hidden"
            >
              {navItems.map((entry) =>
                entry.type === 'link' ? (
                  <a
                    key={entry.item.href}
                    href={entry.item.href}
                    aria-current={
                      isLanding && activeSection === entry.item.sectionId ? 'location' : undefined
                    }
                    onClick={(event) => {
                      handleItemClick(event, entry.item)
                      if (!isLanding) setMobileOpen(false)
                    }}
                    className={cn(
                      'block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                      isLanding && activeSection === entry.item.sectionId
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    {entry.item.label}
                  </a>
                ) : (
                  <div key={entry.group.label} className="mb-1">
                    <button
                      type="button"
                      className={cn(
                        'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                        isGroupActive(entry.group)
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                      aria-expanded={openGroup === entry.group.label}
                      aria-controls={`mobile-group-${entry.group.label}`}
                      onClick={() =>
                        setOpenGroup((current) =>
                          current === entry.group.label ? null : entry.group.label,
                        )
                      }
                    >
                      {entry.group.label}
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 transition-transform duration-200',
                          openGroup === entry.group.label && 'rotate-180',
                        )}
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {openGroup === entry.group.label && (
                        <motion.div
                          id={`mobile-group-${entry.group.label}`}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                          className="overflow-hidden border-l border-border pl-2"
                        >
                          {entry.group.items.map((item) =>
                            isLanding ? (
                              <button
                                key={item.sectionId}
                                type="button"
                                className={cn(
                                  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                                  activeSection === item.sectionId && 'bg-primary/10 text-primary',
                                )}
                                aria-current={
                                  activeSection === item.sectionId ? 'location' : undefined
                                }
                                onClick={() => scrollToSection(item.sectionId)}
                              >
                                    {item.label}
                              </button>
                            ) : item.route ? (
                              <Link
                                key={item.sectionId}
                                to={item.route}
                                className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                onClick={() => {
                                  setMobileOpen(false)
                                  setOpenGroup(null)
                                }}
                              >
                                    {item.label}
                              </Link>
                            ) : (
                              <a
                                key={item.sectionId}
                                href={item.href}
                                className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                onClick={() => {
                                  setMobileOpen(false)
                                  setOpenGroup(null)
                                }}
                              >
                                    {item.label}
                              </a>
                            ),
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
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
  const { data: settings } = useQuery({
    queryKey: queryKeys.resortSettings,
    queryFn: getSettings,
  })
  const phone = settings?.phone || '+63 912 345 6789'
  const address = settings?.address || 'Brgy. San Isidro, Antipolo City'
  const email = settings?.email || 'stay@thefarm.ph'
  return (
    <footer id="contact" className="scroll-mt-28 border-t bg-muted/30 print:hidden">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <img src={BRAND_LOGO_URL} alt={BRAND_LOGO_ALT} className="h-6 w-6 rounded-md object-cover" />
              <span className="font-display font-semibold">{settings?.resortName || BRAND_NAME}</span>
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
              <li><a href="/#contact" className="hover:text-foreground transition-colors">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Contact</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>{phone}</li>
              <li>{address}</li>
              <li>{email}</li>
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
