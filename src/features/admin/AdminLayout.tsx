import { useState, type ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  BedDouble,
  CalendarDays,
  CalendarRange,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users,
  X,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { useAuth } from '@/features/auth/AuthProvider'
import { BRAND_LOGO_ALT, BRAND_LOGO_URL, BRAND_NAME } from '@/lib/brand'
import { cn, getInitials } from '@/lib/utils'

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/admin/calendar', label: 'Calendar', icon: CalendarRange },
    ],
  },
  {
    label: 'Management',
    items: [
      { to: '/admin/bookings', label: 'Bookings', icon: CalendarDays },
      { to: '/admin/accommodation', label: 'Accommodation', icon: BedDouble },
      { to: '/admin/customers', label: 'Customers', icon: Users },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
      { to: '/admin/settings', label: 'Settings', icon: Settings },
    ],
  },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = () => {
    signOut()
    navigate('/admin/login', { replace: true })
  }

  const name = profile?.full_name ?? 'Resort Admin'
  const email = profile?.email ?? 'admin@thefarm.ph'

  return (
    <div className="flex h-full flex-col">
      <Link
        to="/"
        onClick={onNavigate}
        className="group flex items-center gap-3 rounded-xl px-1 py-1"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/15 transition-colors group-hover:ring-white/30">
          <img src={BRAND_LOGO_URL} alt={BRAND_LOGO_ALT} className="h-full w-full object-cover" />
        </span>
        <span className="leading-tight">
          <span className="block font-display text-base font-semibold tracking-tight text-white">
            {BRAND_NAME}
          </span>
          <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-white/45">
            Admin Console
          </span>
        </span>
      </Link>

      <div className="my-6 h-px bg-white/10" />

      <nav className="flex-1 space-y-6 overflow-y-auto pr-1">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="space-y-1">
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
              {section.label}
            </p>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-xl px-2 py-1.5 text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/10'
                      : 'text-white/65 hover:bg-white/5 hover:text-white',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                        isActive
                          ? 'bg-white/15 text-white'
                          : 'text-white/60 group-hover:bg-white/10 group-hover:text-white',
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 truncate">{item.label}</span>
                    <ChevronRight
                      className={cn(
                        'h-4 w-4 transition-all duration-150',
                        isActive
                          ? 'translate-x-0 text-white/70 opacity-100'
                          : '-translate-x-1 text-white/40 opacity-0 group-hover:translate-x-0 group-hover:opacity-100',
                      )}
                    />
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="mt-6 space-y-3">
        <div className="h-px bg-white/10" />
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-semibold text-white">
            {getInitials(name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{name}</p>
            <p className="truncate text-[11px] text-white/50">{email}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Sign out"
            title="Sign out"
            className="rounded-lg p-2 text-white/55 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function AdminLayout({ children, title }: { children: ReactNode; title?: string }) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="flex">
        <aside className="admin-sidebar hidden w-72 shrink-0 lg:block">
          <div className="sticky top-0 h-screen overflow-y-auto p-4">
            <SidebarContent />
          </div>
        </aside>

        <div className="flex-1">
          <header className="sticky top-0 z-40 border-b bg-background/80 px-4 py-4 backdrop-blur-xl lg:px-8">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden"
                  onClick={() => setDrawerOpen(true)}
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <h1 className="font-display text-xl font-semibold">{title ?? 'Dashboard'}</h1>
              </div>
              <ThemeToggle />
            </div>
          </header>

          <div className="p-4 lg:p-8">{children}</div>
        </div>
      </div>

      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 lg:hidden"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.22 }}
              className="admin-sidebar fixed inset-y-0 left-0 z-50 w-72 max-w-[82%] overflow-y-auto p-4 lg:hidden"
            >
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <SidebarContent onNavigate={() => setDrawerOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
