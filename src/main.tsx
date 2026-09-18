import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import { useEffect, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/store/ThemeProvider'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import LandingPage from '@/features/landing/LandingPage'
import BookingPage from '@/features/booking/BookingPage'
import BookingConfirmationPage from '@/features/booking/BookingConfirmationPage'
import AdminLoginPage from '@/features/admin/AdminLoginPage'
import AdminDashboardPage from '@/features/admin/AdminDashboardPage'
import AdminBookingsPage from '@/features/admin/AdminBookingsPage'
import AdminBookingDetailsPage from '@/features/admin/AdminBookingDetailsPage'
import AdminCalendarPage from '@/features/admin/AdminCalendarPage'
import AdminAccommodationPage from '@/features/admin/AdminAccommodationPage'
import AdminCustomersPage from '@/features/admin/AdminCustomersPage'
import AdminReportsPage from '@/features/admin/AdminReportsPage'
import AdminSettingsPage from '@/features/admin/AdminSettingsPage'
import AdminAccountPage from '@/features/admin/AdminAccountPage'
import { AdminLayout } from '@/features/admin/AdminLayout'
import { Button } from '@/components/ui/button'
import './styles/globals.css'

const queryClient = new QueryClient()

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])
  return null
}

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-display text-4xl font-bold">Page Not Found</h1>
      <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
      <Button asChild>
        <Link to="/">Back to Home</Link>
      </Button>
    </div>
  )
}

function AdminRoute({ title, children }: { title: string; children: ReactNode }) {
  return (
    <ProtectedRoute>
      <AdminLayout title={title}>{children}</AdminLayout>
    </ProtectedRoute>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/book" element={<BookingPage />} />
              <Route path="/book/confirmation/:reference" element={<BookingConfirmationPage />} />

              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
              <Route
                path="/admin/dashboard"
                element={
                  <AdminRoute title="Dashboard">
                    <AdminDashboardPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/bookings"
                element={
                  <AdminRoute title="Bookings">
                    <AdminBookingsPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/bookings/:id"
                element={
                  <AdminRoute title="Booking Details">
                    <AdminBookingDetailsPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/calendar"
                element={
                  <AdminRoute title="Calendar">
                    <AdminCalendarPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/accommodation"
                element={
                  <AdminRoute title="Accommodation">
                    <AdminAccommodationPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/customers"
                element={
                  <AdminRoute title="Customers">
                    <AdminCustomersPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/reports"
                element={
                  <AdminRoute title="Reports">
                    <AdminReportsPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <AdminRoute title="Settings">
                    <AdminSettingsPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/account"
                element={
                  <AdminRoute title="Account">
                    <AdminAccountPage />
                  </AdminRoute>
                }
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>
)
