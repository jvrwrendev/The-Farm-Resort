import { Link, useLocation } from 'react-router-dom'
import { Menu, X, LogIn, User } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { useAuth } from '@/features/auth/AuthProvider'
import { BRAND_NAME, BRAND_LOGO_URL, BRAND_LOGO_ALT } from '@/lib/brand'

const navLinks = [
  { href: '/#home', label: 'Home' },
  { href: '/#about', label: 'About' },
  { href: '/#rooms', label: 'Accommodation' },
  { href: '/#amenities', label: 'Amenities' },
  { href: '/#gallery', label: 'Gallery' },
  { href: '/#calendar', label: 'Availability' },
  { href: '/#policies', label: 'Policies' },
]

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, isAdmin } = useAuth()
  const location = useLocation()
  const isLanding = location.pathname === '/'

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-background/70 px-4 py-3 shadow-lg backdrop-blur-xl">
          <Link to="/" className="flex items-center gap-2">
            <img src={BRAND_LOGO_URL} alt={BRAND_LOGO_ALT} className="h-8 w-8 rounded-md object-cover" />
            <span className="font-display text-lg font-semibold tracking-tight">{BRAND_NAME}</span>
          </Link>

          {isLanding && (
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin/dashboard">
                  <User className="h-4 w-4" />
                  {isAdmin ? 'Admin' : 'Dashboard'}
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin/login">
                  <LogIn className="h-4 w-4" />
                  Admin Sign In
                </Link>
              </Button>
            )}
            <Button variant="luxury" size="sm" asChild>
              <Link to="/book">Book Now</Link>
            </Button>
            {isLanding && (
              <button
                className="md:hidden p-2"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && isLanding && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-2 rounded-2xl border bg-background/95 backdrop-blur-xl p-4 md:hidden"
            >
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="block py-2 text-sm font-medium"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  )
}

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
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
              <li><Link to="/book" className="hover:text-foreground transition-colors">Book Now</Link></li>
              <li><a href="/#rooms" className="hover:text-foreground transition-colors">Accommodation</a></li>
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
        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
        </div>
      </div>
    </footer>
  )
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
