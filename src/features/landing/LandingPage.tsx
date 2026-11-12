import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { PublicLayout } from '@/components/layout/Navbar'
import { HeroSection, AboutSection } from '@/features/landing/HeroSection'
import { RoomsSection } from '@/features/landing/RoomsSection'
import { GallerySection, AmenitiesSection, PoliciesSection } from '@/features/landing/GallerySection'
import { AvailabilitySection } from '@/features/landing/AvailabilitySection'
import { BookingSearchSection } from '@/features/landing/BookingSearchSection'
import { ContactSection } from '@/features/landing/ContactSection'
import { ChatbotWidget } from '@/features/landing/ChatbotWidget'
import { PickleballTeaserSection } from '@/features/pickleball/PickleballTeaserSection'
import { ActivityTeaserSections } from '@/features/activities/ActivityTeaserSections'
import { scrollToLandingSection } from '@/lib/scroll'

export default function LandingPage() {
  const location = useLocation()

  useEffect(() => {
    if (!location.hash) return

    const sectionId = location.hash.replace('#', '')
    const timer = window.setTimeout(() => {
      scrollToLandingSection(sectionId)
    }, 150)

    return () => window.clearTimeout(timer)
  }, [location.hash, location.key])

  return (
    <PublicLayout>
      <HeroSection />
      <AboutSection />
      <RoomsSection />
      <PickleballTeaserSection />
      <ActivityTeaserSections />
      <AmenitiesSection />
      <GallerySection />
      <AvailabilitySection />
      <BookingSearchSection />
      <PoliciesSection />
      <ContactSection />
      <ChatbotWidget />
    </PublicLayout>
  )
}
